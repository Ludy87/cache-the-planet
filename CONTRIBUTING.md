# Mitarbeit und lokale Entwicklung

## Änderungen

Wartbarer Code liegt in `src/`; Action-Metadaten liegen in `action.yml` und
`save/action.yml`. `dist/` ist ein generiertes Bundle und darf lokal nicht
manuell geändert oder erzeugt werden. `CHANGELOG.md` wird ausschließlich von
Release Please gepflegt. `AGENTS.md` und `.codex/` sind lokale Agentenregeln
und dürfen nicht committed oder gepusht werden.

Vor einer Änderung:

```bash
git status --short
```

Bestehende lokale Änderungen müssen erhalten bleiben.

## Lokale Prüfungen

```bash
npm install
npm test
bash tests/run.sh
git diff --check
```

`tests/run.sh` benötigt eine Unix-Umgebung mit GNU `tar`, `zstd` und
`sha256sum`. Die Distribution wird im vorgesehenen CI-Workflow gebaut und
geprüft.

## Commits und Releases

Commits verwenden Conventional Commits, zum Beispiel `feat:`, `fix:`,
`perf:`, `docs:` oder `security:`. Release Please aktualisiert Version,
Lockfile und `CHANGELOG.md`. Cache-Assets im Release `cache-v1` gehören nicht
zum normalen Action-Release.

Ein Push erfolgt nicht automatisch durch lokale Agents. Generierte
Distributionen und Release-Tags werden ausschließlich über die dafür
vorgesehenen vertrauenswürdigen CI-Workflows aktualisiert.
