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

## Aufräumen und Erweiterbarkeit

Die Garbage-Collection entfernt nicht mehr referenzierte oder ausreichend alte
Assets. Verwaiste Manifest-Referenzen werden beim Speichern erkannt und neu
aufgebaut.

Ein einzelnes Manifest ist für tausende Keys praktikabel. Sollte es später zu
groß werden, kann ein zukünftiges Protokoll die Referenzen auf mehrere Dateien
aufteilen, ohne die Objekt-Hashes oder die Asset-Struktur zu ändern.
