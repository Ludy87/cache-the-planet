# Integrationen

Native Caches von GitHub- oder Setup-Actions bleiben deaktiviert. Die
jeweilige Action wird normal eingerichtet, ihr Cache-Verzeichnis wird jedoch
über `cache-the-planet` gespeichert.

| Ökosystem | `cache-name` | Typischer Pfad | Native Cache-Option deaktivieren |
|---|---|---|---|
| npm | `npm` | `.cache/npm` | `actions/setup-node`: `package-manager-cache: false` |
| uv | `uv` | `.cache/uv` | `astral-sh/setup-uv`: `enable-cache: false` |
| uv-managed Python | `uv-python-3-13` | `.cache/uv` | `astral-sh/setup-uv`: `enable-cache: false` |
| Maven | `maven-java17` | `.cache/m2` | `actions/setup-java`: `cache` nicht setzen |
| Gradle | `gradle-java17` | `.cache/gradle` | `actions/setup-java`: `cache` nicht setzen |
| Task | `task` | `.cache/task` | Keine native Cache-Option vorhanden |
| Docker/BuildKit | `docker` | `.cache/buildx` | `docker/setup-qemu-action`: `cache-image: false`; BuildKit-Cache separat konfigurieren |

Die genauen End-to-End-Beispiele liegen in `.github/workflows/`.

Neue Cache-Namen können in `.cache-the-planet.json` unter
`security.allowed_cache_names` freigeschaltet werden. Fehlt die Liste oder ist
sie leer, sind alle gültig formatierten Cache-Namen erlaubt. Der PR-Publisher
liest diese Datei ausschließlich aus dem auf `main` ausgecheckten Arbeitsbaum.
