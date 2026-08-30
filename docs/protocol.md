# Protokoll v1

## Datenmodell

Ein Cache-Objekt wird als komprimiertes und optional verschlüsseltes
`tar.zst`-Archiv im Pre-Release `cache-v1` gespeichert. Der Objekt-Hash ist
der SHA-256-Hash der tatsächlich gespeicherten Bytes. Dadurch werden auch
verschlüsselte Objekte eindeutig identifiziert.

Der physische Asset-Name enthält zusätzlich den lesbaren Cache-Key:

```text
<cache-key>--<64-stelliger-sha256-hash>.tar.zst
```

Der Hash bleibt die maßgebliche Identität; der lesbare Teil dient nur der
Zuordnung und darf nicht als Vertrauensnachweis verwendet werden.

Das Manifest liegt im Cache-Repository unter
`manifests/references-v1.json`:

Im Repository dieses Projekts wird die Datei im Branch `cache-data` verwaltet;
andere Nutzer können den Manifest-Branch mit `CACHE_MANIFEST_BRANCH` oder dem
Input `manifest-branch` konfigurieren. Der Branch muss vor dem ersten Save
einmalig angelegt werden.

```json
{
    "schema_version":1,
    "references": {
        "key": {
            "object": "sha256:<64 hex>",
            "updated_at": "RFC3339",
            "source": "owner/repository",
            "created_by": "actor",
            "size": 123456
        }
    },
    "monitoring": {
        "window_started_at": "RFC3339", "writes": 1
    }
}
```

`key` wird intern als vollständiger, automatisch abgegrenzter Schlüssel
gespeichert. Nutzer dürfen in `key` nur den logischen Key angeben; der
 Namespace wird über `scope` bestimmt. In `restore-keys` darf zusätzlich ein
 `shared/<owner>/<repository>/`-Prefix oder ein vollständiger `shared/...`-
 Prefix als geprüfter Fallback angegeben werden.
`trusted/...` und `untrusted/...` sind dort weiterhin nicht erlaubt.
Bei `scope: auto` werden logische Restore-Prefixe zuerst als `shared` und
danach als `trusted` bzw. bei Pull Requests als `untrusted` ausgewertet.
Shared-Restore in Pull Requests erfordert weiterhin
`allow-shared-restore: true`.
Vertrauenswürdige Schlüssel verwenden das Schema
`trusted/<owner>/<repository>/<default-branch>/<cache-name>/<logical-key>/v1`.
Pull-Request-Schlüssel verwenden
`untrusted/<owner>/<repository>/pr-<number>/<cache-name>/<logical-key>/v1`.

Geprüfte Basis-Caches können unter
`shared/<owner>/<repository>/<cache-name>/<logical-key>/v1` veröffentlicht werden.
Sie dürfen nur aus dem konfigurierten Default-Branch geschrieben werden. Pull Requests
benötigen für deren Restore den expliziten Schalter
`allow-shared-restore: true`.

Clients können den vollständigen Namespace automatisch aus `scope` erzeugen.
Erlaubte Werte sind `auto`, `shared`, `trusted` und `untrusted`. Bei `auto`
wird für Pull Requests `untrusted` und für Pushes bzw. Tags `trusted` gewählt.
Der logische Key enthält dabei nur Cache-Name, Plattform, Hash und Version.
Wird die Plattform im logischen Key weggelassen, ergänzt die Action automatisch
`RUNNER_OS` und `RUNNER_ARCH`; fehlende Werte werden als `unknown` eingesetzt.
Die Komponenten können mit `os`, `arch` und `version` explizit überschrieben
werden. Der Nutzer-Key kann dadurch ausschließlich aus dem Abhängigkeits-Hash
bestehen.
`version` ist numerisch und wird als `v<version>` im vollständigen Key
gespeichert.
Wird `scope: shared` in einem Pull Request verwendet, wird der Save-Schritt mit
einem Hinweis in den isolierten `untrusted/pr-<number>/...`-Namespace abgebildet.
Der Shared-Key bleibt unverändert; auf `main` kann derselbe logische Key als
Shared-Key erzeugt werden.

Der geplante Cleanup-Lauf entfernt Untrusted-Referenzen nach 24 Stunden. Ein
manueller `expired`-Lauf kann alle Untrusted-Referenzen sofort entfernen.
Shared-Referenzen werden nur bei einem manuellen Lauf mit dem Schalter
`delete_shared` einbezogen.

Für untrusted-Pull-Request-Referenzen gilt pro PR, Cache-Name, Plattform und
Version ein Ein-Cache-Limit. Bei `strict: true` wird ein weiterer Inhalt
abgelehnt. Bei `strict: false` ersetzt die Action den bisherigen untrusted-
Verweis atomar und entfernt das alte Asset nur bei fehlenden weiteren
Referenzen. Shared-Referenzen werden nicht automatisch ersetzt.

Jede neue Referenz kann zusätzlich `source`, `created_by` und die komprimierte
Archivgröße `size` enthalten. Der optionale Block `monitoring` zählt
Manifest-Schreibvorgänge in einem einstündigen Fenster. Bei Überschreitung des
Limits setzt die Action `locked_until` und verweigert weitere Saves bis zum
Ablauf der Sperre. Die Limits können mit `CACHE_MAX_MANIFEST_REFERENCES` und
`CACHE_MAX_MANIFEST_WRITES_PER_HOUR` angepasst werden.

Clients müssen unbekannte Felder ignorieren und `schema_version` erhalten. Ein
fehlendes Objekt, ein ungültiger Hash, eine fehlende Referenz oder ein
beschädigtes Archiv gilt als Cache-Miss. Bei `strict: true` wird stattdessen
der Fehler an den Workflow weitergegeben.

Logische Keys werden vor der Namespace-Erzeugung auf Länge, Anzahl und sichere
Pfadkomponenten geprüft. Dadurch können Workflows nicht beliebig viele
syntaktisch unterschiedliche oder pfadähnliche Keys erzeugen.

Beim Restore wird zuerst der Hash des heruntergeladenen Assets geprüft. Danach
wird das Archiv bei Bedarf entschlüsselt, dekomprimiert, auf Pfadüberquerungen,
Links und spezielle Dateitypen geprüft und erst anschließend in den Workspace
entpackt.
