# GitHub Actions Content Cache

![Cache the Planet – secure content-addressed GitHub Actions cache](docs/assets/cache-the-planet-banner.png)

Ein zentraler, content-addressed Cache für GitHub Actions. Dieses Repository `Ludy87/cache-the-planet` enthält sowohl die wiederverwendbare Action als auch den zentralen Cache-Speicher und kann von mehreren Anwendungs-Repositories verwendet werden.

Die eigentlichen Cache-Dateien werden nicht in Git-Commits gespeichert. Stattdessen liegen sie als immutable GitHub-Release-Assets vor. Eine kleine Manifest-Datei verwaltet die veränderlichen logischen Cache-Keys.

## Inhaltsverzeichnis

1. [Funktionsweise](#funktionsweise)
2. [Repository anlegen](#repository-anlegen)
3. [Action in ein Projekt einbauen](#action-in-ein-projekt-einbauen)
4. [Authentifizierung](#authentifizierung)
5. [GitHub-App einrichten](#github-app-einrichten)
6. [Cache-Keys entwerfen](#cache-keys-entwerfen)
7. [Inputs und Outputs](#inputs-und-outputs)
8. [Restore- und Save-Lifecycle](#restore--und-save-lifecycle)
9. [Sicherheit](#sicherheit)
10. [Garbage Collection](#garbage-collection)
11. [Installation und Versionierung](#installation-und-versionierung)
12. [Troubleshooting](#troubleshooting)
13. [Limitierungen](#limitierungen)

## Funktionsweise

Ein Cache besteht aus zwei getrennten Ebenen.

### Immutable Objects

Nach dem Packen wird das Archiv deterministisch mit `tar` erstellt und mit `zstd` komprimiert. Bei aktivierter Verschlüsselung wird es anschließend mit AES-256-GCM verschlüsselt. Der SHA-256-Hash wird über die tatsächlich gespeicherten Bytes berechnet.

```text
sha256:93ae271c...
```

Das Objekt wird als Release Asset mit folgendem Namen gespeichert:

```text
<cache-key-slug>--<content-sha256>.tar.zst
```

Ein bereits vorhandenes Objekt wird niemals überschrieben. Wenn zwei Workflows denselben Inhalt gleichzeitig speichern, erzeugen beide denselben Hash; nur einer muss das Asset erfolgreich hochladen.

### Mutable References

Ein logischer Key zeigt auf ein immutable Objekt:

```json
{
  "schema_version": 1,
  "references": {
    "example-org/example-app/linux/amd64/python/3.13/main/v1": {
      "object": "sha256:93ae271c...",
      "updated_at": "2026-08-27T12:00:00Z"
    }
  }
}
```

Die Datei liegt im Cache-Repository unter:

```text
manifests/references-v1.json
```

Sie wird beim ersten Save automatisch erstellt. Das Manifest enthält nur Metadaten und keine großen Cache-Dateien.

## Repository anlegen

### 1. Cache-Repository erstellen

Erstelle ein eigenes Repository, zum Beispiel:

```text
  Ludy87/cache-the-planet
```

Empfohlene Einstellungen:

- Für private Abhängigkeiten: Repository privat erstellen.
- Keine großen Binärdateien committen.
- Branch `main` anlegen.
- Branch Protection für `main` aktivieren.
- Actions im Repository aktivieren.
- Nur vertrauenswürdige Personen dürfen Workflows mit Schreibrechten ändern.

Das Repository mit dieser Action muss nicht in jedem Anwendungs-Repository ausgecheckt werden. GitHub lädt `action.yml` und `dist/` direkt aus dem Action-Repository.

### 2. Action-Repository veröffentlichen

Dieses Repository selbst sollte beispielsweise unter folgendem Namen veröffentlicht werden:

```text
Ludy87/cache-the-planet
```

Die Struktur muss erhalten bleiben:

```text
cache-the-planet/
├── action.yml              # Restore-Action
├── save/action.yml         # Save-Action
├── src/                    # Wartbarer Quellcode
├── dist/
│   ├── common.js
│   ├── restore.js
│   ├── save.js
│   ├── gc.js
│   └── pr-cleanup.js
├── scripts/
├── manifests/
├── docs/
└── .github/workflows/
```

GitHub Actions führt die Dateien aus `dist/` aus. Der wartbare Quellcode liegt in `src/`; Änderungen sollten dort vorgenommen werden. Mit `esbuild` wird `src/` automatisch gebündelt und für die Action minifiziert:

```bash
npm install
npm run build
```

Der Workflow `build-dist.yml` baut `dist/` bei Änderungen an `src/` automatisch und committed die generierten Dateien nach `main`. Der Testworkflow prüft zusätzlich, dass alle erwarteten Dist-Dateien vorhanden und syntaktisch gültig sind. Deshalb müssen Änderungen an der Action nicht mehr direkt in `dist/` gepflegt werden.

Der automatisch erzeugte Commit `chore: build action dist` wird mit `GITHUB_TOKEN` gepusht. GitHub startet für solche Pushes absichtlich keine weiteren `push`-Workflows. Der Testworkflow reagiert deshalb zusätzlich auf das erfolgreiche Ende von `Build action distribution` über `workflow_run`.

Die Action-Versionierung erfolgt separat über [Release Please](.github/workflows/release-please.yml). Commits nach Conventional Commits (`feat:`, `fix:`, `perf:` oder ein Breaking Change mit `!`) erzeugen eine Release-PR. Nach deren Merge veröffentlicht Release Please ein normales `vX.Y.Z`-GitHub-Release und aktualisiert `package.json`, `package-lock.json` und `CHANGELOG.md`. Der Release-Workflow aktualisiert anschließend die beweglichen Tags `vX.Y` und `vX`. Dependabot-Updates für GitHub Actions (`chore(deps):`) werden dabei bewusst nicht als Release-Kategorie verarbeitet und lösen allein keinen Release aus. Das Cache-Release `cache-v1` und seine Assets werden davon nicht verändert.

Dasselbe gilt für automatisch erzeugte Commits wie `cache: update ...`: Sie entstehen innerhalb des Docker-Cache-Workflows und starten wegen `GITHUB_TOKEN` keinen neuen `push`-Lauf. Der Testworkflow reagiert deshalb auch auf das erfolgreiche Ende von `Docker cache integration`. Soll ein direkter `push`-Workflow auf den Manifest-Commit ausgelöst werden, muss für den Schreibvorgang ein GitHub-App-Installation-Token oder Fine-grained PAT verwendet werden. Die Workflows dieses Repositorys aktivieren bewusst kein `cache: npm` und keine `actions/cache`; Cache-Daten werden ausschließlich über die eigenen Release-Assets gespeichert.

Für die erste Veröffentlichung kann ein konkreter Release-Tag wie `v1.0.0` erstellt werden:

```bash
git add .
git commit -m "Add content addressed cache action"
git push origin main
git tag -a v1.0.0 -m "Cache action v1.0.0"
git push origin v1.0.0
```

Produktions-Workflows können einen beweglichen Major-Tag wie `@v1` oder einen Minor-Tag wie `@v1.1` verwenden. Diese Tags werden nach jedem Release automatisch aktualisiert. Für maximale Reproduzierbarkeit kann stattdessen ein vollständiger Commit-SHA verwendet werden.

### 3. Cache-Release vorbereiten

Das Release `cache-v1` wird beim ersten Save automatisch über die GitHub API erstellt. Es ist ein Pre-Release und enthält ausschließlich Cache-Assets.

Alternativ kann es vorher manuell erstellt werden:

```text
Tag: cache-v1
Name: Cache objects (v1)
Pre-release: aktiviert
```

## Action in ein Projekt einbauen

### Minimaler Workflow

Im Anwendungs-Repository wird zuerst restored, anschließend gebaut und am Ende nur bei erfolgreichem Build gespeichert:

```yaml
name: Build

on:
  push:
  pull_request:

jobs:
  build:
    runs-on: ubuntu-latest

    steps:
      - name: Checkout
        uses: actions/checkout@3d3c42e5aac5ba805825da76410c181273ba90b1 # v7.0.1

      - name: Restore cache
        id: cache
        uses: Ludy87/cache-the-planet@v1
        with:
          repository: Ludy87/cache-the-planet
          cache-name: python
          key: ${{ hashFiles('uv.lock') }}
          restore-keys: |
            linux-x64/
          path: |
            .cache/pip
            .cache/uv
          token: ${{ secrets.CACHE_APP_TOKEN }}

      - name: Build
        run: ./build.sh

      - name: Save cache
        if: success() && github.event_name != 'pull_request'
        uses: Ludy87/cache-the-planet/save@v1
        with:
          repository: Ludy87/cache-the-planet
          cache-name: python
          key: ${{ hashFiles('uv.lock') }}
          path: |
            .cache/pip
            .cache/uv
          token: ${{ secrets.CACHE_APP_TOKEN }}
          exclude: |
            **/.env
            **/*.pem
            **/credentials*
```

Der Ausdruck `github.repository` enthält bereits Owner und Repository und verhindert Kollisionen zwischen Projekten. Für private Cache-Repositories sollte ein App-Token verwendet werden; die Einrichtung steht im Abschnitt [GitHub-App einrichten](#github-app-einrichten).

### Einmaliger Lifecycle statt zweier Schritte

Restore und Save sind absichtlich getrennte Actions. Dadurch kann der Save-Schritt mit `if: success()` gezielt erst nach einem erfolgreichen Build ausgeführt werden. Ein Cache wird nicht gespeichert, wenn der Build fehlgeschlagen ist.

Der Restore-Schritt verändert bei einem Miss den Build nicht, solange `strict: false` gesetzt ist oder der Default verwendet wird.

## Authentifizierung

Es gibt drei mögliche Token-Varianten:

| Token | Geeignet für | Empfehlung |
|---|---|---|
| `GITHUB_TOKEN` | Gleiches Repository oder passende Organisationsrichtlinien | Einfach, aber Cross-Repository oft eingeschränkt |
| Fine-grained PAT | Kleine persönliche oder prototypische Setups | Nur als Übergangslösung |
| GitHub App Installation Token | Zentrales Cache-Repository für mehrere Projekte | Empfohlen |

Das Token wird niemals in Cache-Dateien gespeichert. Es wird nur zur GitHub API und zur Release-Asset-API übertragen.

### Optionale Verschlüsselung

Release-Assets eines öffentlichen Cache-Repositories können heruntergeladen werden. Für zusätzlichen Schutz kann der Cache mit AES-256-GCM verschlüsselt werden:

```yaml
encryption-key: ${{ secrets.CACHE_ENCRYPTION_KEY }}
```

`CACHE_ENCRYPTION_KEY` muss bei Restore und Save identisch sein. Empfohlen wird ein zufälliger 64-stelliger Hex-Schlüssel (32 Bytes); eine Passphrase ist ebenfalls möglich. Der Schlüssel darf nur als Secret gespeichert und niemals an Fork-Pull-Requests weitergegeben werden. Ohne Schlüssel kann ein Asset gefunden und heruntergeladen, aber nicht restauriert werden. Die Verschlüsselung bleibt optional und erhält die Deduplizierung für identische Inhalte mit demselben Schlüssel.

### Benötigte Berechtigungen

Die GitHub App benötigt im Cache-Repository minimal:

```text
Contents: Read and write
Metadata: Read-only
```

Im Anwendungs-Repository braucht die Action selbst keine Schreibrechte. Der Workflow muss nur das Secret lesen dürfen.

## Fine-grained PAT einrichten

Für ein einfaches persönliches Setup kann ein Fine-grained Personal Access Token (PAT) verwendet werden. Der PAT wird im Benutzerkonto erstellt, erhält aber ausschließlich Zugriff auf das Cache-Repository.

### 1. PAT erstellen

Öffne:

```text
GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token
```

Empfohlene Einstellungen:

```text
Token name: cache-the-planet
Expiration: 90 Tage oder kürzer
Repository access: Only select repositories
Repository: Ludy87/cache-the-planet
Metadata: Read-only
Contents/Code: Read and write
```

Kein Ablaufdatum sollte nur in Ausnahmefällen verwendet werden. Nach der Erstellung kann der Token-Wert nur einmal kopiert werden. Bei Verlust muss ein neuer Token erstellt werden.

### 2. PAT als Secret speichern

Der PAT wird als Secret im Repository gespeichert, in dessen Workflow der Cache verwendet wird, zum Beispiel `spdf-cache`:

```text
spdf-cache → Settings → Secrets and variables → Actions → New repository secret
Name: CACHE_APP_TOKEN
Secret: <der kopierte PAT-Wert>
```

Der Secret-Name ist unabhängig vom Namen des PAT. Im Workflow wird er so verwendet:

```yaml
token: ${{ secrets.CACHE_APP_TOKEN }}
```

Der PAT selbst muss Zugriff auf `Ludy87/cache-the-planet` haben. Ein `github.token` aus `spdf-cache` reicht für ein separates Cache-Repository normalerweise nicht aus. Verwende in einem separaten Cache-Repository den PAT oder App-Token ausdrücklich als Secret.

Fork-Pull-Requests erhalten aus Sicherheitsgründen normalerweise keine Repository-Secrets. Dieses Repository lässt PR-Läufe deshalb nur Artifacts erzeugen; ein vertrauenswürdiger `workflow_run`-Publisher aus `main` schreibt sie anschließend als isolierte `untrusted/pr-*`-Assets. Ein PAT oder App-Token darf niemals in YAML-Dateien, Logs, Cache-Dateien oder den Quellcode geschrieben werden.

## GitHub-App einrichten

### 1. App erstellen

Öffne in der Organisation:

```text
Settings → Developer settings → GitHub Apps → New GitHub App
```

Setze:

- Einen eindeutigen Namen, zum Beispiel `central-actions-cache`.
- Keine Webhook-Berechtigung, sofern keine Webhooks benötigt werden.
- `Contents: Read and write`.
- `Metadata: Read-only`.
- Installation nur in der eigenen Organisation.

Installiere die App anschließend ausschließlich auf `Ludy87/cache-the-planet`.

### 2. Private Key und IDs hinterlegen

Lege die folgenden Werte als Organization- oder Repository-Secrets in den Anwendungs-Repositories an:

```text
CACHE_APP_ID             # App ID
CACHE_APP_PRIVATE_KEY    # Inhalt der erzeugten .pem-Datei
CACHE_APP_INSTALLATION_ID
```

Die Private Key-Datei darf niemals committed oder in Logs ausgegeben werden.

### 3. Installation Token im Workflow erzeugen

Verwende die offizielle Action zum Erzeugen eines kurzlebigen Installation Tokens:

```yaml
- name: Create cache installation token
  id: cache-token
  uses: actions/create-github-app-token@v2
  with:
    app-id: ${{ secrets.CACHE_APP_ID }}
    private-key: ${{ secrets.CACHE_APP_PRIVATE_KEY }}
    owner: Ludy87
    repositories: cache-the-planet

- name: Restore cache
  uses: Ludy87/cache-the-planet@v1
  with:
    repository: Ludy87/cache-the-planet
    cache-name: npm
    token: ${{ steps.cache-token.outputs.token }}
    key: ${{ hashFiles('package-lock.json') }}
    path: .cache/npm
```

Installation Tokens sind kurzlebig und sollten nicht als dauerhafte Secrets gespeichert werden. Die App selbst darf nur auf das Cache-Repository installiert sein.

## Cache-Keys entwerfen

Ein Key ist eine logische Adresse, nicht der Content-Hash. Der Workflow gibt
normalerweise nur den logischen Teil an; `cache-name` ist eine Pflichtangabe.
Die Action ergänzt Namespace, Repository und PR-/Default-Branch automatisch.
Mit `scope` kann der Namespace explizit gewählt werden: `auto` (Standard),
`shared`, `trusted` oder `untrusted`.

`cache-name` darf nur aus Buchstaben (`A-Z`, `a-z`), Zahlen, `-` und `_`
bestehen und maximal 32 Zeichen lang sein. Beispiele sind `npm`,
`gradle-java17` und `uv_python`.

Trusted-Format:

```text
trusted/<owner>/<repository>/<default-branch>/<cache-name>/<os>-<architecture>/<dependency-hash>/v1
```

Untrusted-Format für Pull Requests:

```text
untrusted/<owner>/<repository>/pr-123/<cache-name>/<os>-<architecture>/<dependency-hash>/v1
```

Geprüfte Basis-Caches können zusätzlich im Shared-Format veröffentlicht
werden:

```text
shared/<owner>/<repository>/<cache-name>/<os>-<architecture>/<dependency-hash>/v1
```

`shared` darf nur aus dem konfigurierten Default-Branch als Shared-Referenz
gespeichert werden. Wird `scope: shared` in einem Pull Request verwendet, wird
der Inhalt automatisch als isolierter `untrusted/pr-<number>/...`-Cache
gespeichert. So kann der PR testen, ohne einen gemeinsamen Cache zu verändern.
Nach dem Merge kann derselbe logische Key auf dem Default-Branch als Shared-
Referenz veröffentlicht werden. Der Restore-Schritt darf Shared-Caches in PRs
weiterhin nur mit `allow-shared-restore: true` verwenden.

Beispiel für den Workflow-Key:

```yaml
cache-name: npm
key: ${{ hashFiles('package-lock.json') }}
```

Ein geprüfter gemeinsamer Cache wird mit demselben kurzen Key gespeichert und
gelesen:

```yaml
cache-name: npm
scope: shared
key: ${{ hashFiles('package-lock.json') }}
```

Daraus erzeugt die Action automatisch:

```text
shared/<owner>/<repository>/npm/<os>-<architecture>/<dependency-hash>/v1
```

`shared` darf nur aus dem konfigurierten Default-Branch gespeichert werden.

Ein Pull Request kann einen isolierten PR-Cache lesen:

```yaml
restore-keys: |
  linux-x64/
```

Ein `shared`-Scope wird bei Pull Requests in den isolierten PR-Namespace
abgebildet. Ein Shared-Restore ist nur mit `allow-shared-restore: true` erlaubt.

Sinnvolle Bestandteile:

- `trusted` und `untrusted`: trennt vertrauenswürdige und PR-Caches.
- `owner/repository`: verhindert Cross-Project-Kollisionen.
- Default-Branch oder PR-Nummer: trennt stabile und untrusted Inhalte.
- `cache-name`: zum Beispiel `npm`, `uv`, `gradle` oder `docker`.
- `os` und `architecture`: verhindert inkompatible Artefakte.
- Lockfile-, Dockerfile- oder Compiler-Hash: invalidiert den Cache bei Toolchain-Änderungen.
- Cache-Version: manuelle globale Invalidierung, zum Beispiel `v2` statt `v1`.

### Restore-Key-Reihenfolge

Die Action sucht in dieser Reihenfolge:

1. Exakter Key.
2. Die angegebenen `restore-keys` von oben nach unten.
3. Innerhalb eines Prefixes den zuletzt aktualisierten Reference-Eintrag.
4. Kein Cache.

Branch- und Default-Branch-Fallback werden durch die Reihenfolge der Prefixe modelliert. Die Action gibt `matched-key` aus, damit der tatsächlich verwendete Cache sichtbar ist.

Bei `scope: auto` werden unpräfixierte `restore-keys` auf `main` und Tags
zuerst im `shared`-Namespace und danach im `trusted`-Namespace gesucht. In
Pull Requests wird zuerst `shared` gesucht, sofern
`allow-shared-restore: true` gesetzt ist, und danach der isolierte
`untrusted`-Namespace. Ohne diese Freigabe wird der Shared-Fallback im PR
übersprungen.

`restore-keys` enthalten normalerweise nur logische Prefixe und niemals
`trusted/` oder `untrusted/`. Ein `shared/<owner>/<repository>/`-Prefix oder
ein vollständiger `shared/...`-Prefix ist als expliziter, geprüfter Fallback
erlaubt. In Pull Requests muss dafür zusätzlich
`allow-shared-restore: true` gesetzt werden. Beispiel:

```yaml
cache-name: node
key: ${{ hashFiles('package-lock.json') }}
restore-keys: |
  linux-x64/
```

Die Action ergänzt Cache-Name, Betriebssystem, Architektur und Scope auch für
das Prefix automatisch. Ein Prefix mit abschließendem `/` bleibt ein Prefix
und wird nicht um `/v1` erweitert.

## Inputs und Outputs

### Restore-Inputs

| Input | Pflicht | Beschreibung |
|---|---:|---|
| `repository` | ja | Cache-Repository im Format `owner/name` |
| `cache-name` | ja | Cache-Kategorie, zum Beispiel `npm`, `uv` oder `gradle` |
| `scope` | nein | `auto`, `shared`, `trusted` oder `untrusted`; Standard: `auto` |
| `os` | nein | Betriebssystemteil; Standard: `RUNNER_OS`, leer ergibt `unknown` |
| `arch` | nein | Architekturteil; Standard: `RUNNER_ARCH`, leer ergibt `unknown` |
| `version` | nein | Numerische Cache-Version, zum Beispiel `1`; Standard: `1` |
| `key` | ja | Logischer Key ohne automatisch ergänzten Namespace |
| `restore-keys` | nein | Mehrere Prefixe, jeweils eine Zeile |
| `path` | ja | Eine oder mehrere Dateien/Verzeichnisse, jeweils eine Zeile |
| `encryption-key` | nein | Schlüssel oder Passphrase zum Entschlüsseln verschlüsselter Assets |
| `token` | nein | Token; alternativ `GITHUB_TOKEN` |
| `strict` | nein | `true` bricht bei Cache-Fehlern ab, Standard `false` |
| `config-file` | nein | Optionale JSON-Konfiguration; Umgebungsvariablen haben Vorrang |
| `allow-shared-restore` | nein | Erlaubt PRs ausdrücklich Shared-Restores; Standard `false` |

### Save-Inputs

| Input | Pflicht | Beschreibung |
|---|---:|---|
| `repository` | ja | Cache-Repository im Format `owner/name` |
| `cache-name` | ja | Cache-Kategorie, zum Beispiel `npm`, `uv` oder `gradle` |
| `scope` | nein | `auto`, `shared`, `trusted` oder `untrusted`; Standard: `auto` |
| `os` | nein | Betriebssystemteil; Standard: `RUNNER_OS`, leer ergibt `unknown` |
| `arch` | nein | Architekturteil; Standard: `RUNNER_ARCH`, leer ergibt `unknown` |
| `version` | nein | Numerische Cache-Version; Standard: `1` |
| `key` | ja | Logischer Key ohne automatisch ergänzten Namespace |
| `path` | ja | Eine oder mehrere Dateien/Verzeichnisse, jeweils eine Zeile |
| `compression-level` | nein | zstd-Kompressionsstufe; Standard: `3` |
| `token` | nein | Token; alternativ `GITHUB_TOKEN` |
| `encryption-key` | nein | Optionaler AES-256-Schlüssel oder eine Passphrase |
| `exclude` | nein | Ausschlussmuster, jeweils eine Zeile; zum Beispiel `**/.env` |
| `exclude-path` | nein | Workspace-relative Dateien mit Ausschlussmustern, jeweils eine Zeile |
| `strict` | nein | `true` bricht bei Cache-Fehlern ab, Standard `false` |
| `config-file` | nein | Optionale JSON-Konfiguration; Umgebungsvariablen haben Vorrang |
| `allow-pr-cache` | nein | Erlaubt das Speichern eines isolierten PR-Caches; Standard `true` |

`compression-level` wird ausschließlich von `save` verwendet. Beim Restore wird
das vorhandene Archiv automatisch mit seinem gespeicherten Kompressionsformat
dekomprimiert.

### Restore-Outputs

| Output | Beschreibung |
|---|---|
| `cache-hit` | `true`, wenn ein zulässiger Treffer für denselben logischen Cache restauriert wurde; ein Shared-Treffer zählt auch für Trusted-/Untrusted-Scopes |
| `matched-key` | Tatsächlich verwendeter Key |
| `content-hash` | SHA-256 der tatsächlich gespeicherten Objektdatei, einschließlich einer möglichen Verschlüsselung |
| `asset-name` | Lesbarer physischer Release-Asset-Name mit enthaltenem Content-Hash |
| `cache-size` | Größe des komprimierten Archivs in Bytes |

### Save-Outputs

| Output | Beschreibung |
|---|---|
| `content-hash` | SHA-256 des gespeicherten Objekts |
| `asset-name` | Name des Release-Assets |
| `cache-size` | Größe des komprimierten Archivs in Bytes |

Beispiel:

```yaml
- run: |
    echo "Exact hit: ${{ steps.cache.outputs.cache-hit }}"
    echo "Matched key: ${{ steps.cache.outputs.matched-key }}"
    echo "Object: ${{ steps.cache.outputs.content-hash }}"
    echo "Asset: ${{ steps.cache.outputs.asset-name }}"
```

## Deterministische Archive

Die Action verwendet stabile Tar-Einstellungen für:

- alphabetische Dateireihenfolge,
- feste Timestamps,
- UID/GID `0`,
- numerische Owner,
- relative Pfade,
- zstd-Kompression.

Temporäre Dateien sollten vor dem Save entfernt werden. Pfade mit Leerzeichen werden unterstützt, sofern sie jeweils als eigene Zeile im `path`-Input stehen.

## Sicherheit

Caches sind grundsätzlich nicht vertrauenswürdig. Niemals automatisch in den Cache aufnehmen:

```text
.env
SSH private keys
API keys
npm tokens
pip credentials
Docker config.json
GitHub tokens
credentials files
```

Nutze zum Ausschließen:

```yaml
exclude: |
  **/.env
  **/*.pem
  **/*secret*
  **/credentials*
  **/.docker/config.json

exclude-path: |
  .cache-excludes
  config/cache-excludes.txt
```

`exclude` und `exclude-path` können gemeinsam oder jeweils einzeln verwendet
werden. Jede Zeile einer `exclude-path`-Datei wird als `tar --exclude`-Muster
verwendet; leere Zeilen und Zeilen mit `#` am Anfang werden ignoriert. Die
Dateien müssen innerhalb des Workspace liegen. Die vollständige Git-ignore-
Semantik, insbesondere Negationsmuster mit `!`, wird nicht ausgewertet.

Beim Restore wird:

1. das Release-Asset heruntergeladen,
2. der SHA-256-Hash mit der Reference verglichen,
3. das Tar-Archiv auf absolute und `..`-Pfade geprüft,
4. erst danach extrahiert.

Fork-Pull-Requests speichern standardmäßig nichts, weil ihnen kein Schreib-Secret
übergeben werden darf. Für besonders sensible Projekte sollten zusätzlich
getrennte `trusted`- und `untrusted`-Namespaces eingesetzt werden. Vor dem
Packen verweigert die Action außerdem Symlinks, Pfade außerhalb des Workspace,
typische Credential-Dateinamen sowie erkannte Private-Key-/Token-Muster in
kleinen Textdateien. Diese Prüfung ist Defense-in-Depth und ersetzt keine engen
Cache-Pfade oder `exclude`-Regeln.

Für interne Pull Requests kann ein eigener, automatisch löschbarer PR-Cache aktiviert werden:

```yaml
- name: Save PR cache
  if: success() && github.event_name == 'pull_request' && github.event.pull_request.head.repo.full_name == github.repository
  uses: Ludy87/cache-the-planet/save@v1
  with:
    repository: Ludy87/cache-the-planet
    cache-name: build
    token: ${{ secrets.CACHE_APP_TOKEN }}
    allow-pr-cache: true
    key: ${{ hashFiles('package-lock.json') }}
    path: .cache/build
```

Der logische Nutzer-Key enthält keinen Namespace. Die Action ergänzt bei Pull Requests automatisch `untrusted/<repository>/pr-<number>/`. Beim Event `pull_request: closed` entfernt [pr-cache-cleanup.yml](.github/workflows/pr-cache-cleanup.yml) die PR-References und die dadurch nicht mehr referenzierten Release Assets. Für Fork-Pull-Requests bleibt das Speichern deaktiviert, weil dort keine Schreib-Secrets an untrusted Code gegeben werden sollten.

`key` darf nur den Abhängigkeits-Hash enthalten, zum Beispiel `${{ hashFiles('package-lock.json') }}`. Die Action ergänzt Cache-Name, Betriebssystem, Architektur und Version automatisch. Diese Werte können optional explizit angegeben werden:

```yaml
scope: auto
os: linux
arch: x64
version: 1
key: ${{ hashFiles('package-lock.json') }}
```

`version` darf ausschließlich aus Ziffern bestehen, zum Beispiel `1` oder
`2`. Die Action stellt automatisch ein `v` voran.

Wird `os` oder `arch` ausdrücklich leer angegeben, verwendet die Action
`unknown` statt des Runner-Standardwerts. Wird der Input nicht angegeben,
werden `RUNNER_OS` und `RUNNER_ARCH` verwendet.

Mit `scope: auto` ergänzt sie außerdem `untrusted/<repository>/pr-<number>/` bei Pull Requests bzw. `trusted/<repository>/<default-branch>/` bei Pushes und Tags. Mit `scope: shared`, `scope: trusted` oder `scope: untrusted` wird der gewünschte Namespace automatisch verwendet. Präfixe wie `trusted/` oder `untrusted/` sind in `key` und `restore-keys` nicht erlaubt; ein vollständiger `shared/...`-Prefix ist nur in `restore-keys` als geschützter Fallback zulässig. Fehlen `os`/`arch` und auch `RUNNER_OS`/`RUNNER_ARCH`, verwendet die Action `unknown`.

Der Cache-Typ kann auch separat mit `cache-name` angegeben werden. Dann enthält `key` nur noch Plattform, Hash und Version:

```yaml
cache-name: npm
key: ${{ hashFiles('package-lock.json') }}
```

## Garbage Collection

Ein Objekt darf entfernt werden, wenn:

- keine Reference mehr darauf zeigt,
- es älter als die Grace Period ist.

Der geplante Cleanup-Lauf löscht Untrusted-PR-Referenzen und die dadurch
verwaisten Assets nach 24 Stunden. Ein manueller Lauf mit `mode: expired`
löscht alle Untrusted-PR-Caches sofort. Shared-Referenzen werden dabei nur
gelöscht, wenn beim manuellen Lauf zusätzlich `delete_shared: true` gesetzt
wird. Trusted-Referenzen werden nie durch diesen Modus gelöscht.

Standardmäßig beträgt die Grace Period sieben Tage. Zuerst immer Dry-Run ausführen:

```bash
CACHE_REPOSITORY=Ludy87/cache-the-planet \
GITHUB_TOKEN="$TOKEN" \
GRACE_DAYS=7 \
node dist/gc.js --dry-run
```

Ein tatsächlicher Lauf:

```bash
CACHE_REPOSITORY=Ludy87/cache-the-planet \
GITHUB_TOKEN="$TOKEN" \
GRACE_DAYS=7 \
DRY_RUN=false \
node dist/gc.js
```

Der mitgelieferte Workflow `.github/workflows/cleanup.yml` läuft täglich um
03:00 UTC und löscht abgelaufene Untrusted-Caches automatisch. Manuell kann
zuerst ein Dry-Run ausgeführt werden; für die Löschung muss `dry_run: false`
gesetzt werden. Shared-Caches werden manuell mit `delete_shared: true` und
`mode: expired` einbezogen.

## Installation und Versionierung

Im Client-Repository genügt die Referenz auf den Release-Tag:

```yaml
uses: Ludy87/cache-the-planet@v1
```

Für die Save-Action:

```yaml
uses: Ludy87/cache-the-planet/save@v1
```

Bei inkompatiblen Protokolländerungen wird ein neuer Namespace wie `cache-v2` und eine neue Major-Version wie `@v2` verwendet. V1-Clients können alte V1-Objekte weiter lesen, solange das Manifest und das Release bestehen bleiben.

## Lokale Entwicklung und Tests

Für lokale Tests und den Build der Action:

```bash
npm install
npm test
bash tests/run.sh
```

## Unterstützte Actions und Cache-Einstellungen

Die folgenden Actions können zusammen mit `cache-the-planet` verwendet werden.
Native GitHub-Actions-Caches bleiben deaktiviert; der angegebene `cache-name`
gehört zum Asset-Key der Content-Addressed-Cache-Action.

| Action | `cache-name` | Einstellung der Action | Zu speichernder Pfad |
| --- | --- | --- | --- |
| `actions/setup-node` | `npm` | `package-manager-cache: false`, `cache` nicht setzen | `.cache/npm` |
| `astral-sh/setup-uv` | `uv` | `enable-cache: false`, `cache-local-path: .cache/uv` | `.cache/uv` |
| `astral-sh/setup-uv` mit uv-managed Python | `uv-python-3-13` | `enable-cache: false`, `UV_CACHE_DIR`, `UV_PYTHON_CACHE_DIR` und `UV_PYTHON_INSTALL_DIR` setzen; nur den Download-Cache `.cache/uv` archivieren; Python pro Job in einem sauberen Installationsverzeichnis installieren | `.cache/uv` |
| `go-task/setup-task` | `task` | keine Cache-Einstellung vorhanden | Taskfile-Build-Ausgabe, z. B. `.cache/task` |
| `actions/setup-java` | `maven-java17` / `gradle-java17` | `cache` nicht setzen; Java-Version im `cache-name` berücksichtigen | `.cache/m2` / `.cache/gradle` |
| `actions/setup-python` | `pip` | `cache` nicht setzen | z. B. `.cache/pip` |
| `docker/setup-qemu-action` | — | `cache-image: false` | — |
| `docker/setup-buildx-action` | `docker` | keine native Actions-Cache-Konfiguration | — |
| `docker/build-push-action` | `docker` | `cache-from`/`cache-to` auf lokalen Pfad oder separate BuildKit-Ausgabe setzen | `.cache/buildx` |
| `docker/login-action` | — | keine Cache-Einstellung vorhanden | — |
| `docker/metadata-action` | — | keine Cache-Einstellung vorhanden | — |
| `actions/github-script` | — | keine Cache-Einstellung vorhanden | — |
| `madrapps/jacoco-report` | — | keine Cache-Einstellung vorhanden | — |
| `crazy-max/ghaction-github-runtime` | — | keine Cache-Einstellung vorhanden | — |
| `dorny/paths-filter` | — | keine Cache-Einstellung vorhanden | — |
| `dtolnay/rust-toolchain` | — | keine Cache-Einstellung vorhanden | — |
| `digicert/ssm-code-signing` | — | keine Cache-Einstellung vorhanden | — |
| `tauri-apps/tauri-action` | — | keine native Cache-Einstellung; Build-Cache separat konfigurieren | — |
| `softprops/action-gh-release` | — | keine Cache-Einstellung vorhanden | — |
| `imjasonh/setup-crane` | — | keine Cache-Einstellung vorhanden | — |
| `ossf/scorecard-action` | — | keine Cache-Einstellung vorhanden | — |
| `peter-evans/create-pull-request` | — | keine Cache-Einstellung vorhanden | — |
| `KSXGitHub/github-actions-deploy-aur` | — | keine Cache-Einstellung vorhanden | — |
| `srvaroa/labeler` | — | keine Cache-Einstellung vorhanden | — |

Bei Actions mit `—` gibt es keinen eigenen Cache, der ausgelagert werden
kann. Für diese Actions ist keine künstliche Cache-Konfiguration nötig.

Ein Cache-Schritt sieht beispielsweise so aus:

```yaml
- uses: Ludy87/cache-the-planet@v1
  with:
    repository: Ludy87/cache-the-planet
    cache-name: npm
    key: ${{ hashFiles('package-lock.json') }}
    path: .cache/npm
```

Voraussetzungen auf dem Runner:

```text
Node.js 24
GNU tar
zstd
```

Tests unter Ubuntu:

```bash
bash tests/run.sh
```

Die Tests prüfen JavaScript-Syntax, deterministische Archive und stellen sicher, dass kein `actions/cache`, `cache: npm`, `setup-uv`-`enable-cache: true` oder `setup-qemu`-`cache-image: true` aktiviert ist. API-Tests sollten gegen ein eigenes Test-Cache-Repository mit einem kurzlebigen Token ausgeführt werden.

## Troubleshooting

### `404 Not Found` beim Release

Prüfe:

- `repository` ist wirklich `owner/name`.
- Das Token hat `Contents: read`.
- Das Repository ist für die App installiert.
- Das Release `cache-v1` darf erstellt werden, falls es noch nicht existiert.

### `403 Resource not accessible by integration`

Das Token hat keine Schreibrechte auf das Cache-Repository. Prüfe die Installation der GitHub App und `Contents: Read and write`.

### Cache bleibt immer ein Miss

Prüfe `matched-key`, `content-hash` und die Release-Assets. Häufige Ursachen sind:

- unterschiedlicher Lockfile-Hash,
- anderer Namespace,
- fehlender Slash am Ende eines Prefixes,
- unterschiedliche Runtime-Version,
- Reference zeigt auf ein gelöschtes Asset.

### `tar and zstd are required`

Die Action erwartet diese Programme auf dem Runner. Auf `ubuntu-latest` sind sie normalerweise verfügbar. Bei selbst gehosteten Runnern müssen sie installiert und im `PATH` verfügbar sein.

### Upload liefert HTTP 422

Wenn das Asset denselben Namen bereits besitzt, wird HTTP 422 als erfolgreicher Deduplication-Fall behandelt. Andere Upload-Fehler werden abhängig von `strict` als Miss behandelt oder lösen den Workflow-Fehler aus.

### Manifest-Konflikt

References werden mit der Contents-SHA gelesen und bei Konflikten bis zu fünfmal wiederholt. Häufige Konflikte sind bei parallelen Saves normal. Bei dauerhaftem Fehler sollten Token-Rechte, Branch Protection und die Default-Branch-Konfiguration geprüft werden.

## Limitierungen

- GitHub Release-Asset-Limits und API-Limits gelten.
- Ein einzelnes Manifest ist für tausende Keys geeignet; bei sehr vielen zehntausend Keys sollte es nach Namespace geshardet werden.
- Die Action implementiert keine globale Branch-Policy. Trust-Level müssen über Key-Namespaces und Workflow-Berechtigungen festgelegt werden.
- Cache-Fehler werden standardmäßig als Miss behandelt. Für reproduzierbare oder sicherheitskritische Builds `strict: true` verwenden.
- Bei `strict: false` ersetzt ein neuer untrusted-PR-Cache den bisherigen Cache derselben PR/Cache-Name/Plattform/Versions-Kombination; bei `strict: true` wird das Limit als Fehler gemeldet. Shared-Caches werden niemals automatisch ersetzt.
- Der Cache ersetzt keine Artefaktablage für signierte Releases oder vertrauenswürdige Binärdistributionen.

## Weitere Dokumentation

- Ein ausführbares Docker-Beispiel befindet sich unter [examples/docker-cache](examples/docker-cache).
- Der End-to-End-Testworkflow ist [.github/workflows/docker-cache-asset-integration.yml](.github/workflows/docker-cache-asset-integration.yml).
- Der npm-Asset-Test ist [.github/workflows/npm-cache-asset-integration.yml](.github/workflows/npm-cache-asset-integration.yml).
- Der uv-Asset-Test ist [.github/workflows/uv-cache-asset-integration.yml](.github/workflows/uv-cache-asset-integration.yml). Er verwendet `astral-sh/setup-uv` ausschließlich zur Installation und deaktiviert dessen nativen Cache.
- Der Task-Asset-Test ist [.github/workflows/task-cache-asset-integration.yml](.github/workflows/task-cache-asset-integration.yml). `go-task/setup-task` selbst besitzt keinen nativen Cache; getestet wird der von `task` erzeugte Build-Cache.
- Der Java/Maven-Asset-Test ist [.github/workflows/maven-cache-asset-integration.yml](.github/workflows/maven-cache-asset-integration.yml). `actions/setup-java` wird ohne `cache`-Input verwendet; das Maven-Repository wird nach `.cache/m2` umgeleitet und als Release Asset gespeichert.
- Der Gradle-Asset-Test ist [.github/workflows/gradle-cache-asset-integration.yml](.github/workflows/gradle-cache-asset-integration.yml). `GRADLE_USER_HOME` wird nach `.cache/gradle` umgeleitet; der Key basiert nur auf `build.gradle`, `settings.gradle` und den Java-Quellen; der Build wird in einem frischen Job mit `--offline` aus dem Release Asset wiederholt.
- [Architektur](docs/architecture.md)
- [Security](docs/security.md)
- [Protokoll v1](docs/protocol.md)
- [Third-Party Notices](THIRD-PARTY-NOTICES.md)
