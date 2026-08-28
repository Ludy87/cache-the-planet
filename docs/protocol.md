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

```json
{"schema_version":1,"references":{"key":{"object":"sha256:<64 hex>","updated_at":"RFC3339"}}}
```

`key` ist der vollständige, automatisch abgegrenzte Schlüssel.
Vertrauenswürdige Schlüssel verwenden das Schema
`trusted/<repository>/<default-branch>/<cache-name>/<logical-key>/v1`.
Pull-Request-Schlüssel verwenden
`untrusted/<repository>/pr-<number>/<cache-name>/<logical-key>/v1`.

Clients müssen unbekannte Felder ignorieren und `schema_version` erhalten. Ein
fehlendes Objekt, ein ungültiger Hash, eine fehlende Referenz oder ein
beschädigtes Archiv gilt als Cache-Miss. Bei `strict: true` wird stattdessen
der Fehler an den Workflow weitergegeben.

Beim Restore wird zuerst der Hash des heruntergeladenen Assets geprüft. Danach
wird das Archiv bei Bedarf entschlüsselt, dekomprimiert, auf Pfadüberquerungen,
Links und spezielle Dateitypen geprüft und erst anschließend in den Workspace
entpackt.
