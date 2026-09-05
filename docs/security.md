# Sicherheit

## Token für das Cache-Repository

Bei einem separaten Cache-Repository benötigt der Workflow ein Token mit minimalen Schreibrechten auf dieses Repository. Ein Fine-grained PAT wird im Benutzerkonto erstellt, aber als Secret im Anwendungs-Repository gespeichert, zum Beispiel:

```text
Secret-Name: CACHE_APP_TOKEN
Repository: spdf-cache → Settings → Secrets and variables → Actions
PAT-Zugriff: Ludy87/cache-the-planet
PAT-Rechte: Contents/Code Read and write, Metadata Read-only
```

Im Workflow:

```yaml
token: ${{ secrets.CACHE_APP_TOKEN }}
```

Wenn `token` nicht angegeben wird, verwendet die Action standardmäßig `GITHUB_TOKEN`. Ein explizit gesetzter `token` hat immer Vorrang. `ACTIONS_RUNTIME_TOKEN` wird bewusst nicht verwendet, weil dieser interne Runtime-Token kein GitHub-REST-API-Token ist.

Kein dauerhaft gültiges Token ohne Ablaufdatum verwenden. Für ein separates
Cache-Repository reicht der `GITHUB_TOKEN` des aufrufenden Repositories meist
nicht aus; verwende dafür ein PAT oder ein kurzlebiges GitHub-App-Token.
Fork-Pull-Requests dürfen keine Schreib-Secrets erhalten. Für einen isolierten
Untrusted-PR-Cache erzeugt der PR-Lauf deshalb nur ein Artifact. Ein separater
`workflow_run`-Publisher aus `main` lädt dieses Artifact und schreibt es mit
einem kurzlebigen App-Token, ohne PR-Code mit diesem Token auszuführen.

Das Manifest protokolliert bei neuen Referenzen Quelle, Ersteller und
komprimierte Archivgröße. Zusätzlich begrenzt die Action standardmäßig das
Manifest auf 100.000 Referenzen und 1.000 Schreibvorgänge pro Stunde. Wird das
Schreiblimit überschritten, wird das Manifest für eine Stunde gesperrt.
Administratoren können die Grenzen mit `CACHE_MAX_MANIFEST_REFERENCES` und
`CACHE_MAX_MANIFEST_WRITES_PER_HOUR` anpassen.

Alternativ können diese Einstellungen in einer JSON-Datei im Workspace liegen.
Der Pfad wird mit `config-file` oder `CACHE_CONFIG_FILE` angegeben;
Umgebungsvariablen überschreiben Werte aus der Datei:

```yaml
with:
  config-file: .cache-the-planet.json
```

Ein Beispiel befindet sich in
`.cache-the-planet.json.example`. Die Konfigurationsdatei darf nicht außerhalb
des Workspace liegen.

Gegen Key-Flooding begrenzt die Action standardmäßig jeden logischen Key auf
512 Zeichen und 16 Pfadkomponenten. `cache-name` darf optional über
`security.allowed_cache_names` beziehungsweise `CACHE_ALLOWED_CACHE_NAMES`
auf bekannte Cache-Namen beschränkt werden. Die Environment-Variable verwendet
eine kommagetrennte Liste:

Ein `cache-name` ist 1 bis 32 Zeichen lang und darf ausschließlich Buchstaben,
Zahlen, `-` und `_` enthalten. Dadurch können keine zusätzlichen Pfadsegmente
oder Sonderzeichen in den automatisch erzeugten Manifest-Key gelangen.

```yaml
env:
  CACHE_MAX_LOGICAL_KEY_LENGTH: 512
  CACHE_MAX_LOGICAL_KEY_COMPONENTS: 16
  CACHE_ALLOWED_CACHE_NAMES: npm,uv,gradle-java17,docker
```

## Cache-Scope

### Administrative Actions

`gc` und `pr-cleanup` sind privilegierte Verwaltungs-Actions und dürfen nicht
mit nicht vertrauenswürdigem Pull-Request-Code ausgeführt werden. `gc` läuft
standardmäßig im Dry-Run und benötigt `dry-run: false` für Löschungen.
`pr-cleanup` validiert Repository und PR-Nummer und beschränkt jede Änderung
auf `untrusted/<repository>/pr-<number>/`. Für diese Jobs sind kurzlebige
GitHub-App-Tokens mit minimalen `Contents`-Rechten gegenüber langlebigen PATs
zu bevorzugen.

Der `scope`-Input steuert die automatische Namespace-Auswahl:

| Scope | Zweck | Speichern erlaubt aus |
|---|---|---|
| `auto` | `trusted` auf dem Standard-Branch, `untrusted` im Pull Request | abhängig vom Event |
| `trusted` | stabile, vertrauenswürdige Cache-Referenz | konfigurierter Default-Branch oder Release-Tag |
| `shared` | geprüfter Cache für mehrere Workflows/Projekte | konfigurierter Default-Branch |
| `untrusted` | isolierter Pull-Request-Cache | Pull Request |

Für einen Shared-Cache reicht:

```yaml
cache-name: npm
scope: shared
key: ${{ hashFiles('package-lock.json') }}
```

Wird `scope: shared` in einem Pull Request verwendet, wird der Inhalt mit einem
Hinweis als isolierter `untrusted/pr-<number>/...`-Cache gespeichert. Dadurch
verändert der Pull Request keinen Shared-Cache. Nach dem Merge auf `main` kann
derselbe logische Key als `shared` gespeichert werden.

Für untrusted-Pull-Request-Caches ist pro PR, Cache-Name, Plattform und Version
maximal ein Cache erlaubt. Mit `strict: true` führt ein zweiter Inhalt zu einem
Fehler. Mit `strict: false` wird der alte untrusted-Verweis atomar durch den
neuen ersetzt; das alte Asset wird nur gelöscht, wenn es nicht mehr anderweitig
referenziert wird. Shared-Caches werden dabei niemals automatisch ersetzt.

## Optionale Cache-Verschlüsselung

Mit `encryption-key` werden komprimierte Archive vor dem Upload mit AES-256-GCM verschlüsselt. Restore und Save müssen denselben Schlüssel verwenden:

```yaml
encryption-key: ${{ secrets.CACHE_ENCRYPTION_KEY }}
```

Empfohlen wird ein zufälliger 64-stelliger Hex-Schlüssel. Eine Passphrase ist ebenfalls möglich. Ohne Schlüssel oder mit einem falschen Schlüssel schlägt Restore kontrolliert fehl. Der Schlüssel darf nicht an Fork-Pull-Requests weitergegeben werden.

Cache-Daten gelten als nicht vertrauenswürdige Eingaben. Bevor ein Archiv
erstellt wird, lehnt die Action Folgendes ab:

- externe symbolische Links; relative symbolische Links, deren Ziele innerhalb des Cache-Pfads liegen, sind erlaubt und werden beim Erstellen des Archivs aufgelöst;
- Hardlinks werden beim Erstellen des Archivs in separate reguläre Dateien umgewandelt; symbolische Links, Hardlinks und spezielle Dateien in einem Eingabearchiv werden bei der Validierung und beim Restore abgelehnt;
- Pfade außerhalb von `GITHUB_WORKSPACE`;
- verdächtig wirkende Datei- und Verzeichnisnamen wie `.env*` (normale Quelldateien wie `env.py` oder `tokens.py` sind davon nicht betroffen), `.npmrc`, `.netrc`, `.ssh`, `.aws`, `.docker`, `.kube`, `credentials*`, `*secret*`, `*token*`, `*password*`, SSH-Private-Keys sowie `*.key`/`*.p12`/`*.pfx`. VCS-Metadaten werden mit `--exclude-vcs` aus dem tar-Archiv ausgeschlossen. Öffentliche CA-Zertifikate wie `cacert.pem` sind erlaubt; PEM-Private-Keys werden anhand ihres Inhalts abgelehnt;
- Muster für Private-Keys in allen Textdateien bis 1 MiB; bekannte Token-Muster und allgemeine Zugangsdaten-Zuweisungen werden nur in Textdateien geprüft, die weder Quellcode noch Paketmetadaten sind. Token-Muster erfordern eine realistische Token-Länge, damit gewöhnlicher Pakettext nicht fälschlich erkannt wird. Vollständige Python-Paketmetadaten-Verzeichnisse wie `*.dist-info` und `*.egg-info` sind erlaubt, da Abhängigkeitsnamen, Hashes und Beschreibungen sicherheitsbezogene Begriffe enthalten können. Bekannte Binär- und Archivformate wie JAR, ZIP, WAR und AAR werden nicht als Text dekodiert. Dadurch werden Fehlalarme durch Binärdaten von Paketen vermieden. Normaler Quellcode wird nicht allein deshalb abgelehnt, weil er Variablen wie `password`, `secret` oder `api_key` enthält.

Diese Prüfung ist eine zusätzliche Schutzmaßnahme und kein vollständiger
Secret-Scanner. Halte Cache-Pfade möglichst eng, verwende `exclude` und lege
niemals einen Workspace mit Produktionszugangsdaten in einen Cache-Pfad.
Downloads werden per SHA-256 geprüft und Archive mit Pfadüberquerungen werden
abgelehnt.

Vertrauenswürdige Referenzen dürfen nur aus `main` oder einem Tag geschrieben
werden. Pull-Request-Referenzen müssen
`untrusted/<repository>/pr-<number>/...` verwenden und werden beim Schließen des
Pull Requests entfernt. Pull Requests aus Forks können nicht speichern, außer
der Workflow stellt ausdrücklich und sicher die erforderliche Berechtigung bzw.
das erforderliche Token bereit. Ein Cache-Treffer ist kein Herkunftsnachweis;
Builds dürfen keine beliebigen zwischengespeicherten Binärdateien ohne eigene
Vertrauensprüfung ausführen.

Der optionale Namespace `shared/` ist ausschließlich für geprüfte Inhalte aus
dem konfigurierten Default-Branch vorgesehen. Ein `shared/<owner>/<repository>/`-
Prefix oder ein vollständiger `shared/...`-Prefix darf in `restore-keys` als
Fallback verwendet werden. Bei Pull Requests wird ein Save mit
`scope: shared` in den isolierten Untrusted-PR-Namespace abgebildet. Ein
angeforderter Shared-Restore bleibt dagegen
durch `allow-shared-restore: true` ausdrücklich freischaltbar. Shared-Caches
müssen trotzdem frei von Geheimnissen bleiben, weil andere Workflows die
gelesenen Daten verarbeiten können.
