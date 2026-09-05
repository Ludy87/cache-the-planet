# Architektur

## Überblick

Das System trennt unveränderliche Cache-Daten von den veränderlichen
Referenzen:

1. Das Pre-Release `cache-v1` speichert die großen, unveränderlichen
   `tar.zst`-Objekte als GitHub-Release-Assets.
2. `manifests/references-v1.json` enthält die kleine Zuordnung von Cache-Keys
   zu Objekt-Hashes.
3. Die GitHub Contents API liest und aktualisiert dieses Manifest.
4. Die Action prüft, lädt und entpackt Assets direkt, ohne das Repository zu
   klonen oder große Dateien in der Git-Historie abzulegen.

## Speichern

Beim Speichern werden die angegebenen Pfade geprüft und deterministisch mit
`tar` archiviert. Das Archiv wird mit `zstd` komprimiert und optional mit
AES-256-GCM verschlüsselt. Anschließend wird der SHA-256-Hash der gespeicherten
Bytes berechnet.

Existiert das Objekt bereits, wird es nicht erneut hochgeladen. Andernfalls
wird es einmalig als Release-Asset angelegt. Danach wird die Referenz im
Manifest aktualisiert. Asset-Uploads sind damit create-only; konkurrierende
Manifest-Änderungen werden per optimistischer Nebenläufigkeitskontrolle und
erneuten Versuchen behandelt.

## Wiederherstellen

Die Action sucht zuerst nach dem vollständigen Key und danach optional nach
den angegebenen `restore-keys`. Bei einem Treffer wird der referenzierte Hash
gegen das Release-Asset geprüft. Erst nach erfolgreicher Integritäts- und
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

Ein einzelnes Manifest ist für tausende Keys praktikabel. Sollte es später zu
groß werden, kann ein zukünftiges Protokoll die Referenzen auf mehrere Dateien
aufteilen, ohne die Objekt-Hashes oder die Asset-Struktur zu ändern.
