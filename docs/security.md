# Security

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

Wenn `token` nicht angegeben wird, verwendet die Action standardmäßig `GITHUB_TOKEN` beziehungsweise `ACTIONS_RUNTIME_TOKEN`. Ein explizit gesetzter `token` hat immer Vorrang.

Kein dauerhaft gültiges Token ohne Ablaufdatum und kein Fallback auf `github.token` verwenden. Fork-Pull-Requests dürfen keine Schreib-Secrets erhalten; der Save-Schritt bleibt für sie deaktiviert.

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
