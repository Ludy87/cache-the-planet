# Architektur

## Überblick

Das System trennt unveränderliche Cache-Daten von den veränderlichen
Referenzen:

1. Je nach Storage liegen die großen, unveränderlichen `tar.zst`-Objekte als
   GitHub-Release-Assets (`github-release`), GitHub-Actions-Artefakte
   (`github-artifact`), Dateien im Manifest-Branch (`github-branch`) oder auf
   SFTP (`sftp`). Nur `github-release` verwendet das Pre-Release `cache-v1`.
2. Storage-getrennte Dateien unter `manifests/v1/<storage>/` enthalten die
   Zuordnung von Cache-Keys zu Objekt-Hashes. Es gibt je Storage
   `trusted.json`, `shared.json` und eine Datei unter
   `untrusted/pr-<number>.json` pro Pull Request.
3. Die GitHub Contents API liest und aktualisiert dieses Manifest.
4. Die Action prüft, lädt und entpackt Assets direkt, ohne das Repository zu
   klonen oder große Dateien in der Git-Historie abzulegen.

Für `github-artifact` verweist die Manifest-Referenz zusätzlich auf ein oder
mehrere GitHub-Actions-Artefakte und die ursprünglichen Workflow-Runs. Große
Archive werden in begrenzte Teile zerlegt. Die Nutzdaten liegen nicht im
Git-Tree; Restore validiert jeden Teil und anschließend die zusammengesetzten
Archivbytes weiterhin per SHA-256.

Bei Fork-Pull-Requests lädt der untrusted Lauf die Teile und eine separate
`metadata.json` als Runner-Artefakte hoch. Ein `workflow_run`-Publisher aus
`main` lädt und prüft diese Metadaten, validiert PR-Head, Artifact-IDs, Teil-
Hashes und den Gesamt-Hash und schreibt erst danach die untrusted-Referenz.

## Speichern

Die Root-Action führt das Speichern nach einem erfolgreichen Restore-Job im
Post-Schritt aus. Mit `restore-only: true` wird dieser Post-Save übersprungen.
Der Save-Scope kann über `save-scope` unabhängig vom Restore-Scope `scope`
gewählt werden; ohne Angabe übernimmt er `scope`.

Beim Speichern werden die angegebenen Pfade geprüft und deterministisch mit
`tar` archiviert. Das Archiv wird mit `zstd` komprimiert und optional mit
AES-256-GCM verschlüsselt. Anschließend wird der SHA-256-Hash der gespeicherten
Bytes berechnet.

Existiert das Objekt bereits, wird es nicht erneut hochgeladen. Andernfalls
wird es im gewählten Storage angelegt und danach im Manifest referenziert.
`github-release`-Uploads sind dabei create-only; konkurrierende
Manifest-Änderungen werden per optimistischer Nebenläufigkeitskontrolle und
erneuten Versuchen behandelt.

## Wiederherstellen

Die Action sucht zuerst nach dem vollständigen Key und danach optional nach
den angegebenen `restore-keys`. Bei einem Treffer wird der referenzierte Hash
gegen das Objekt im gewählten Storage geprüft. Erst nach erfolgreicher Integritäts- und
Archivprüfung wird der Inhalt in `GITHUB_WORKSPACE` extrahiert.

Pull Requests dürfen keine vertrauenswürdigen Referenzen wiederherstellen.
Ihre Cache-Referenzen liegen in einem getrennten `untrusted/.../pr-<number>`-
Namensraum und werden beim Schließen des Pull Requests bereinigt.

Der Namespace kann über den Input `scope` automatisch gewählt werden. Erlaubte
Werte sind `auto`, `shared`, `trusted` und `untrusted`. `auto` verwendet im
Pull Request `untrusted` und auf dem Standard-Branch beziehungsweise einem
Tag `trusted`. `shared` ist für geprüfte, von mehreren Workflows verwendete
Caches vorgesehen und darf nur aus dem konfigurierten Default-Branch gespeichert
werden.

## Aufräumen und Erweiterbarkeit

Administrative Aufräumarbeiten können über `gc/action.yml` und
`pr-cleanup/action.yml` wiederverwendet werden. Garbage Collection ist
standardmäßig ein Dry-Run. PR-Cleanup akzeptiert nur ein explizites
Repository/PR-Paar und löscht ausschließlich Referenzen unter
`untrusted/<repository>/pr-<number>/`. Beide Actions verwenden die durch CI
erzeugten Bundles aus `dist/`.

Die Garbage-Collection entfernt nicht mehr referenzierte oder ausreichend alte
Assets. Untrusted-PR-Referenzen laufen im geplanten Lauf nach 24 Stunden ab.
Ein manueller `expired`-Lauf kann alle Untrusted-Referenzen löschen; Shared-
Referenzen werden nur mit der ausdrücklichen manuellen Option `delete_shared`
einbezogen. Ein Objekt bleibt erhalten, solange noch eine Trusted- oder
Shared-Referenz darauf zeigt. Verwaiste Manifest-Referenzen werden beim
Speichern erkannt und neu aufgebaut.

PR-Manifeste sind voneinander unabhängig und reduzieren Konflikte bei
parallelen Saves. Garbage Collection muss deshalb alle Manifestdateien
auswerten, bevor ein Asset als verwaist gelöscht werden darf.
