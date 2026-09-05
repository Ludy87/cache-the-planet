# Integrationen

Native Caches von GitHub- oder Setup-Actions bleiben deaktiviert. Die
jeweilige Action wird normal eingerichtet, ihr Cache-Verzeichnis wird jedoch
über `cache-the-planet` gespeichert.

| Ökosystem | `cache-name` | Typischer Pfad |
|---|---|---|
| npm | `npm` | `.cache/npm` |
| uv | `uv` | `.cache/uv` |
| uv-managed Python | `uv-python-3-13` | `.cache/uv` |
| Maven | `maven-java17` | `.cache/m2` |
| Gradle | `gradle-java17` | `.cache/gradle` |
| Task | `task` | `.cache/task` |
| Docker/BuildKit | `docker` | `.cache/buildx` |

Deaktiviere bei Setup-Actions deren native Cache-Optionen, zum Beispiel
`package-manager-cache: false`, `enable-cache: false` oder
`cache-image: false`. Die genauen End-to-End-Beispiele liegen in
`.github/workflows/`.

Neue Cache-Namen können in `.cache-the-planet.json` unter
`security.allowed_cache_names` freigeschaltet werden. Fehlt die Liste oder ist
sie leer, sind alle gültig formatierten Cache-Namen erlaubt. Der PR-Publisher
liest diese Datei ausschließlich aus dem auf `main` ausgecheckten Arbeitsbaum.
