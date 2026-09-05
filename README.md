# GitHub Actions Content Cache

![Cache the Planet – secure content-addressed GitHub Actions cache](docs/assets/cache-the-planet-banner.png)

`cache-the-planet` ist ein content-addressed Cache für GitHub Actions. Große,
immutable Cache-Objekte werden als Assets des GitHub-Pre-Releases `cache-v1`
gespeichert. `manifests/references-v1.json` ordnet logische Keys den
SHA-256-Objekten zu.

## Funktionsweise

Restore und Save sind getrennte Actions. Restore prüft Hash, Archiv und Pfade
vor der Extraktion. Save erzeugt deterministische `tar.zst`-Archive, erkennt
potenzielle Credentials und lädt jedes Objekt nur einmal hoch.

Ein Cache-Key besteht aus einem logischen Key sowie automatisch ergänzten
Namespace-, Plattform- und Versionskomponenten. Die Scopes sind:

- `trusted`: Cache vom Default-Branch oder einem Tag;
- `untrusted`: isolierter Cache einer Pull Request;
- `shared`: gemeinsam nutzbarer Cache vom Default-Branch;
- `auto`: wählt den passenden Scope anhand des Events.

PR-Caches dürfen niemals als vertrauenswürdige Build-Eingabe behandelt werden.
Ein Shared-Restore in Pull Requests muss ausdrücklich mit
`allow-shared-restore: true` aktiviert werden.

## Nutzung

```yaml
- name: Restore cache
  uses: Ludy87/cache-the-planet@v1
  with:
    repository: Ludy87/cache-the-planet
    cache-name: npm
    key: ${{ hashFiles('package-lock.json') }}
    path: .cache/npm
    token: ${{ secrets.CACHE_APP_TOKEN }}

- name: Build
  run: npm ci --no-audit --no-fund

- name: Save cache
  if: ${{ success() }}
  uses: Ludy87/cache-the-planet/save@v1
  with:
    repository: Ludy87/cache-the-planet
    cache-name: npm
    key: ${{ hashFiles('package-lock.json') }}
    path: .cache/npm
    token: ${{ secrets.CACHE_APP_TOKEN }}
```

`path` muss beim Restore angegeben werden, weil es Bestandteil der
Action-Schnittstelle ist. Die aktuelle Restore-Action extrahiert das geprüfte
Archiv vollständig in `GITHUB_WORKSPACE`; `path` ist kein nachträglicher
Filter für einzelne Archivdateien.

## Authentifizierung

Für ein separates Cache-Repository benötigt das Token mindestens passende
`Contents`-Rechte auf diesem Repository. Kurzlebige GitHub-App-Tokens sind
langlebigen PATs vorzuziehen. Ein Token darf niemals in Dateien, Logs,
Commit-Nachrichten oder Cache-Inhalte gelangen.

Verschlüsselung ist optional:

```yaml
encryption-key: ${{ secrets.CACHE_ENCRYPTION_KEY }}
```

Der Schlüssel muss bei Restore und Save identisch sein und darf nicht an
Fork-Pull-Requests weitergegeben werden. Die ausführliche Einrichtung steht
in [docs/security.md](docs/security.md).

## Inputs und Outputs

Restore und Save benötigen `cache-name`, `key` und `path`. `repository` ist
optional; ohne Angabe werden zuerst `CACHE_REPOSITORY` und anschließend das
Repository des laufenden Workflows (`GITHUB_REPOSITORY`) verwendet.
Weitere gemeinsame Inputs sind `scope`, `os`, `arch`, `version`, `token`,
`encryption-key`, `strict`, `config-file` und `manifest-branch`.

Restore unterstützt zusätzlich `restore-keys` und
`allow-shared-restore`. Save unterstützt zusätzlich `compression-level`,
`exclude`, `exclude-path` und `allow-pr-cache`.

Restore-Outputs sind `cache-hit`, `matched-key`, `content-hash`, `asset-name`
und `cache-size`. Save liefert `is_fork`, `read_only`, `content-hash`,
`asset-name` und `cache-size`.

`cache-size` bezeichnet die Größe der tatsächlich gespeicherten Objektdatei.

## Sicherheitsregeln

Cache-Inhalte sind untrusted input. Keine Secrets, Private Keys, `.env`-,
`.npmrc`-, Credential- oder Produktionsdateien speichern. Enge `path`- und
`exclude`-Angaben verwenden.

Fork-Pull-Requests dürfen keine Schreib-Secrets erhalten. Für interne PRs
sollten Save-Artefakte über den erfolgreichen, korrelierten
`workflow_run`-Publisher aus `main` verarbeitet werden. PR-Code darf nicht mit
`contents: write` oder Repository-Secrets laufen.

Weitere Details stehen in [docs/security.md](docs/security.md),
[docs/architecture.md](docs/architecture.md) und
[docs/protocol.md](docs/protocol.md).

## Konfiguration

Optional kann eine JSON-Datei verwendet werden. Das Beispiel befindet sich in
[`.cache-the-planet.json.example`](.cache-the-planet.json.example):

```json
{
  "cache_repository": "owner/cache-repository",
  "manifest_branch": "cache-data",
  "security": {
    "max_compressed_bytes": 2147483648,
    "max_tar_bytes": 8589934592,
    "max_entries": 200000,
    "allowed_cache_names": ["npm", "uv", "docker"]
  }
}
```

`cache_repository` legt das Ziel-Repository fest. `manifest_branch` legt den
Branch für das Cache-Manifest fest. Ein gesetztes
`CACHE_MANIFEST_BRANCH` oder der Action-Input `manifest-branch` überschreibt
diesen Wert; ohne Konfiguration wird `cache-data` verwendet.

`allowed_cache_names` ist eine optionale Allowlist. Fehlt sie oder ist sie
leer, sind alle gültig formatierten Cache-Namen erlaubt. Der vertrauenswürdige
PR-Publisher liest `.cache-the-planet.json` ausschließlich aus dem auf
`main` ausgecheckten Arbeitsbaum.

## Administrative Actions

Für vertrauenswürdige Verwaltungsjobs stehen `gc` und `pr-cleanup` zur
Verfügung. Garbage Collection startet standardmäßig als Dry-Run:

```yaml
- uses: Ludy87/cache-the-planet/gc@v1
  with:
    repository: Ludy87/cache-the-planet
    mode: orphan
    dry-run: true
```

`pr-cleanup` entfernt ausschließlich den isolierten Namespace einer konkreten
geschlossenen Pull Request. Details und Sicherheitsgrenzen stehen in
[docs/operations.md](docs/operations.md).

## Fehlerbehebung

- Bei `404` das Repository, das Release `cache-v1` und die Token-Rechte prüfen.
- Bei `403` benötigt das Token `Contents: Read and write` im Cache-Repository.
- Bei einem Cache-Miss Lockfile-Hash, Scope, Plattform, Version und
  `matched-key` prüfen.
- Auf dem Runner müssen Node.js 22 oder höher, GNU `tar` und `zstd` vorhanden
  sein. CI verwendet Node.js 24.
- Bei einem Asset-Konflikt ist HTTP 422 bei identischem Asset-Namen ein normaler
  Deduplication-Fall.

## Weitere Dokumentation

- [Mitarbeit und lokale Entwicklung](CONTRIBUTING.md)
- [Maintainer-Dokumentation](docs/maintainers.md)
- [Betrieb und Aufräumen](docs/operations.md)
- [Integrationen](docs/integrations.md)
- [Architektur](docs/architecture.md)
- [Sicherheit](docs/security.md)
- [Protokoll v1](docs/protocol.md)
