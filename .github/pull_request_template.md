## Beschreibung

<!-- Was ändert dieser Pull Request und warum? Verweise auf ein Issue mit `Fixes #...`, falls vorhanden. -->

## Änderungstyp

- [ ] Fehlerbehebung
- [ ] Neue Funktion
- [ ] Sicherheitsverbesserung
- [ ] Dokumentation
- [ ] Wartung / CI
- [ ] Breaking Change

## Betroffene Bereiche

<!-- Zum Beispiel: `src/`, Action-Metadaten, Workflows, Tests, Dokumentation, Wiki. -->

## Sicherheits- und Kompatibilitätsprüfung

- [ ] Cache-Scopes, Key-Validierung und PR-Isolation bleiben erhalten.
- [ ] Keine Tokens, Secrets, privaten Schlüssel oder sensiblen Dateien werden geloggt oder gecacht.
- [ ] Archiv-, Pfadüberquerungs-, Symlink- und Größenprüfungen bleiben wirksam.
- [ ] Native GitHub-Caches wurden nicht aktiviert.
- [ ] Bestehende `v1`-Objekte und Manifest-Referenzen bleiben kompatibel oder die Änderung ist dokumentiert.

## Tests

- [ ] `npm test`
- [ ] `bash tests/run.sh`
- [ ] `git diff --check`
- [ ] Relevante zusätzliche Tests: <!-- Kommando oder kurze Beschreibung -->

<!-- Falls ein Test nicht ausgeführt werden konnte, hier den Grund nennen. -->

## Dokumentation und Distribution

- [ ] README, `docs/` oder Beispiele wurden bei Bedarf aktualisiert.
- [ ] Wiki-Seiten unter `wiki/de/` und `wiki/en/` wurden bei Bedarf synchronisiert.
- [ ] `dist/` wurde nicht manuell geändert; die Änderung ist für den Build-Workflow geeignet.
- [ ] Action-Inputs und -Outputs sind in `action.yml` und `save/action.yml` konsistent.

## Hinweise für das Review

<!-- Risiken, offene Fragen, bewusste Abweichungen oder nötige Folgearbeiten. -->

