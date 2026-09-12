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
| Rust/Cargo | `cargo` | `.cache/cargo` | `dtolnay/rust-toolchain`: keine native Cache-Option; `CARGO_HOME` setzen |

Die genauen End-to-End-Beispiele liegen in `.github/workflows/`.

## Mehrere Ökosystem-Caches

Für npm und Maven oder andere unabhängige Cache-Arten kann die Sub-Action
`multi-cache` mehrere Einträge in einem Schritt verwalten:

```yaml
- name: Restore and save dependency caches
  uses: Ludy87/cache-the-planet/multi-cache@v1
  with:
    key: |
      npm=${{ hashFiles('package-lock.json') }}
      maven-java17=${{ hashFiles('examples/java-cache/pom.xml') }}
    multi-cache: |
      npm:
        path: .cache/npm
      maven-java17:
        path: .cache/m2
    allow-shared-restore: true
    token: ${{ secrets.CACHE_APP_TOKEN }}
```

Die Tools müssen ihre Verzeichnisse vor der Nutzung auf diese Workspace-Pfade
zeigen. Für npm genügt beispielsweise:

```yaml
- name: Configure npm cache
  run: npm config set cache "$GITHUB_WORKSPACE/.cache/npm" --global
```

Für Maven wird das lokale Repository beim Build gesetzt:

```yaml
- name: Build with Maven cache
  run: mvn -B -Dmaven.repo.local="$GITHUB_WORKSPACE/.cache/m2" package
```

`actions/setup-java` kann zusätzlich Konfigurationsdateien wie `settings.xml`
und `toolchains.xml` ablegen. `settings-path` ist nicht das lokale Maven-
Repository; verwende dort eine GitHub-Expression wie
`${{ github.workspace }}/.cache/m2`, niemals eine nicht expandierte Shell-
Variable in einem `with:`-Block.

### Rust und Cargo

`dtolnay/rust-toolchain` installiert die Rust-Toolchain, verwaltet aber nicht
den Cargo-Cache. Setze `CARGO_HOME` auf ein Workspace-Verzeichnis und cache
dieses Verzeichnis mit einem Key aus `Cargo.lock`:

```yaml
- uses: dtolnay/rust-toolchain@stable

- name: Configure Cargo cache
  run: echo "CARGO_HOME=$GITHUB_WORKSPACE/.cache/cargo" >> "$GITHUB_ENV"

- uses: Ludy87/cache-the-planet@v1
  with:
    cache-name: cargo
    key: ${{ hashFiles('Cargo.lock') }}
    path: .cache/cargo
    token: ${{ secrets.CACHE_APP_TOKEN }}

- run: cargo fetch --locked
```

Der Cache enthält primär Cargo-Registry- und Git-Downloads. Das Rust-
`target`-Verzeichnis ist nicht automatisch enthalten, weil es stark von
Toolchain, Betriebssystem, Architektur und Compilerflags abhängt. Wenn es
bewusst gecached wird, muss es einen eigenen, vollständigen Key erhalten.

## Scope-Muster für Integrationen

Der Cache-Key, `cache-name` und `path` müssen beim Restore und Save zum selben
Cache gehören. Der Scope bestimmt, in welchem Namespace die Referenz gesucht
bzw. gespeichert wird. Für einen normalen Workflow ist `auto` die passende
Wahl:

```yaml
- name: Restore and save tool cache
  uses: Ludy87/cache-the-planet@v1
  with:
    cache-name: tools
    key: ${{ hashFiles('tools.lock') }}
    path: .cache/tools
    scope: auto
    token: ${{ secrets.CACHE_APP_TOKEN }}
```

Die Root-Action speichert nach einem erfolgreichen Job automatisch. Auf dem
Default-Branch und bei Tags wird `trusted` verwendet, in Pull Requests
`untrusted`.

Für einen Cache, der von mehreren Workflows gelesen werden soll, kann der
Restore explizit `shared` verwenden. Das Lesen aus einem Pull Request muss
zusätzlich erlaubt werden. Der Save sollte nur aus einem vertrauenswürdigen
Default-Branch-Job erfolgen:

```yaml
- name: Restore shared tool cache
  uses: Ludy87/cache-the-planet/restore@v1
  with:
    cache-name: tools
    key: ${{ hashFiles('tools.lock') }}
    path: .cache/tools
    scope: shared
    allow-shared-restore: true
    token: ${{ secrets.CACHE_APP_TOKEN }}

- name: Build
  run: ./build.sh

- name: Save shared tool cache
  if: ${{ github.ref == format('refs/heads/{0}', github.event.repository.default_branch) && success() }}
  uses: Ludy87/cache-the-planet/save@v1
  with:
    cache-name: tools
    key: ${{ hashFiles('tools.lock') }}
    path: .cache/tools
    scope: shared
    token: ${{ secrets.CACHE_APP_TOKEN }}
```

Wenn Restore und Save absichtlich getrennt behandelt werden sollen, stehen
`restore/action.yml` und `save/action.yml` zur Verfügung. Bei der Root-Action
kann alternativ `save-scope` gesetzt werden; dieser Input ändert nur den
Post-Save-Scope und nicht den Restore-Scope:

```yaml
- name: Restore shared cache, save trusted result
  uses: Ludy87/cache-the-planet@v1
  with:
    cache-name: tools
    key: ${{ hashFiles('tools.lock') }}
    path: .cache/tools
    scope: shared
    allow-shared-restore: true
    save-scope: trusted
    token: ${{ secrets.CACHE_APP_TOKEN }}
```

`untrusted` ist für isolierte Pull-Request-Caches vorgesehen. Der Input
`allow-pr-cache: true` erlaubt dabei den Save nur in den dafür vorgesehenen PR-Kontexten; ein
Fork-Pull-Request darf weiterhin keine Schreib-Secrets erhalten. Für reine
Restore-Jobs verhindert `restore-only: true` an der Root-Action den
automatischen Post-Save.

### Docker/BuildKit vollständig einrichten

Der BuildKit-Cache wird als lokales Verzeichnis mit `cache-the-planet`
gespeichert. Deaktiviere den Image-Cache der QEMU-Action, stelle den
gespeicherten BuildKit-Cache vor dem Build wieder her und schreibe den neuen
Cache zunächst in ein temporäres Verzeichnis. Danach wird das temporäre
Verzeichnis anschließend als neuer Cache verwendet:

```yaml
- name: Restore BuildKit cache
  uses: Ludy87/cache-the-planet@v1
  with:
    repository: Ludy87/cache-the-planet
    cache-name: docker
    key: ${{ hashFiles('Dockerfile', 'docker/**', 'package-lock.json') }}
    path: .cache/buildx
    strict: false
    token: ${{ secrets.CACHE_APP_TOKEN }}

- name: Set up QEMU
  uses: docker/setup-qemu-action@v3
  with:
    cache-image: false

- name: Set up Docker Buildx
  uses: docker/setup-buildx-action@v3

- name: Build image with the restored cache
  uses: docker/build-push-action@v6
  with:
    context: .
    push: false
    tags: example:ci
    cache-from: type=local,src=.cache/buildx
    cache-to: type=local,dest=.cache/buildx-new,mode=max

- name: Replace local BuildKit cache
  shell: bash
  run: |
    rm -rf .cache/buildx
    mv .cache/buildx-new .cache/buildx

- name: Save BuildKit cache
  if: ${{ success() }}
  uses: Ludy87/cache-the-planet/save@v1
  with:
    repository: Ludy87/cache-the-planet
    cache-name: docker
    key: ${{ hashFiles('Dockerfile', 'docker/**', 'package-lock.json') }}
    path: .cache/buildx
    token: ${{ secrets.CACHE_APP_TOKEN }}
```

`cache-from` liest den restaurierten Cache, während `cache-to` den neuen
BuildKit-Stand schreibt. Das temporäre Ziel verhindert, dass ein laufender
Build den zuvor restaurierten Cache beschädigt. Bei einem Pull Request muss
der Save-Schritt in einem vertrauenswürdigen, korrelierten `workflow_run`-Job
mit dem passenden PR-Namespace laufen.

Neue Cache-Namen können in `.cache-the-planet.json` unter
`security.allowed_cache_names` freigeschaltet werden. Fehlt die Liste oder ist
sie leer, sind alle gültig formatierten Cache-Namen erlaubt. Der PR-Publisher
liest diese Datei ausschließlich aus dem auf `main` ausgecheckten Arbeitsbaum.
