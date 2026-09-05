# Maintainer-Dokumentation

## Distribution

GitHub Actions führt die Bundles aus `dist/` aus. Änderungen werden daher in
`src/` vorgenommen und anschließend über den vertrauenswürdigen
`build-dist.yml`-Workflow gebündelt. `dist/` darf lokal nicht editiert oder
erzeugt werden.

Der Workflow kann bei einem vertrauenswürdigen Lauf einen generierten Commit
`chore: build action dist` auf `main` erstellen. PR-Code erhält dabei keine
Schreib-Secrets.

## Release-Versionierung

Release Please verwaltet `package.json`, `package-lock.json` und
`CHANGELOG.md`. `CHANGELOG.md` darf niemals manuell geändert werden. Nach einem
Release werden die beweglichen `vX`- und `vX.Y`-Tags aktualisiert.

Das technische Cache-Release `cache-v1` ist davon getrennt. Es enthält
immutable `tar.zst`-Assets und darf nicht durch normale Action-Releases ersetzt
oder gelöscht werden.

## Sicherheitsregeln

- Keine langlebigen Tokens, Private Keys oder Secrets in Code, Logs, Fixtures,
  Commit-Nachrichten oder Cache-Pfaden.
- `pull_request`-Jobs bleiben read-only.
- Schreibende PR-Artefaktverarbeitung läuft nur in einem erfolgreichen,
  korrelierten `workflow_run`-Job aus `main`.
- Alle Actions werden unveränderlich per Commit-SHA referenziert.
- `actions/checkout` verwendet `persist-credentials: false`.
- Native GitHub-Caches bleiben deaktiviert.
