# Referenz-Manifest

Unter `v1/` werden beim ersten Speichervorgang getrennte Manifestdateien
automatisch erstellt: `trusted.json`, `shared.json` sowie je eine Datei unter
`untrusted/pr-<number>.json`. Jede Datei enthält `schema_version: 1` sowie eine Zuordnung vollständiger Cache-Keys zu
`{object, updated_at}`:

```json
{
  "schema_version": 1,
  "references": {
    "trusted/<repository>/<branch>/<cache-name>/<key>/v1": {
      "object": "sha256:<64-stelliger-hex-hash>",
      "updated_at": "2026-08-28T12:00:00.000Z"
    }
  }
}
```

Vertrauenswürdige Referenzen verwenden den Namensraum `trusted/`. Referenzen
aus Pull Requests verwenden `untrusted/<repository>/pr-<number>/` und werden
beim Schließen des Pull Requests bereinigt.

Jede JSON-Manifestdatei ist die maßgebliche Zuordnung zwischen Cache-Key und
Objekt. Die unveränderlichen Cache-Objekte selbst liegen ausschließlich als
Assets im Pre-Release `cache-v1`. Das Manifest sollte nicht manuell bearbeitet
werden; die Action aktualisiert es über die GitHub Contents API mit
Nebenläufigkeitsprüfung.

Fehlt das referenzierte Asset, wird die Referenz als verwaist erkannt. Beim
nächsten Speichern wird das Objekt neu erstellt und die Referenz aktualisiert.
Unbekannte JSON-Felder müssen von Clients ignoriert werden, damit das Schema
später erweitert werden kann.

Untrusted-Referenzen werden im geplanten Cleanup nach 24 Stunden entfernt.
Ein manueller Cleanup mit `mode: expired` entfernt alle Untrusted-PR-
Referenzen. Shared-Referenzen werden nur mit `delete_shared: true` in einem
manuellen Lauf berücksichtigt.
