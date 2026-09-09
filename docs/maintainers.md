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

## Projektspezifische Schalter und interne Funktionen

Dieser Abschnitt beschreibt ausschließlich die interne Verdrahtung des
Projekts. Nutzer konfigurieren die Action über die Inputs in den jeweiligen
`action.yml`-Dateien; die folgenden Variablen werden primär von den
Projekt-Workflows und den administrativen Bundles verwendet.

### Garbage Collection

| Variable | Zweck | Quelle/Standard |
| --- | --- | --- |
| `GC_MODE` | Erzwingt den GC-Modus `orphan`, `expired`, `object` oder `all`. | Workflow beziehungsweise Action-Input; Standard `orphan` |
| `GC_OBJECT` | Ziel-Hash oder Asset-Dateiname für `object`. | Workflow beziehungsweise Action-Input |
| `DRY_RUN` | Steuert, ob GC nur simuliert. Nur der exakte Wert `false` erlaubt Löschungen. | Workflow beziehungsweise Action-Input; Standard aktiv |
| `GRACE_DAYS` | Mindestalter nicht referenzierter Orphan-Assets. | Workflow beziehungsweise Action-Input; Standard `7` |
| `UNTRUSTED_TTL_HOURS` | Ablaufzeit von Untrusted-PR-Referenzen. | Workflow beziehungsweise Action-Input; Standard `24` |
| `GC_EXPIRE_ALL_UNTRUSTED` | Lässt alle Untrusted-Referenzen unabhängig vom Alter ablaufen. | Nur bewusst im Verwaltungsworkflow setzen |
| `GC_DELETE_SHARED` | Erlaubt Shared-Bereinigung im manuellen `expired`-Lauf. | Nur manuell und explizit |

### PR-Artifact-Publisher

Der Workflow `publish-pr-cache-artifacts.yml` läuft ausschließlich nach einem
erfolgreichen, korrelierten `workflow_run` des Save-Workflows. Diese Variablen
sind interne Vertrauensgrenzen und dürfen nicht aus PR-Code übernommen werden:

| Variable | Zweck |
| --- | --- |
| `ARTIFACT_RUN_ID` | ID des Quell-Workflow-Runs, an den Artefakte gebunden werden. |
| `SOURCE_ARTIFACT_TOKEN` | Read-Token zur Prüfung der Artifact-Metadaten des Quell-Runs. |
| `EXPECTED_HEAD_SHA` | Erwarteter Commit des PR-Workflow-Runs. |
| `EXPECTED_WORKFLOW` | Erwarteter Workflowname. |
| `PR_NUMBER` | Korrelierte Pull-Request-Nummer. |
| `PR_CACHE_ARTIFACTS_DIR` | Temporäres Verzeichnis der heruntergeladenen PR-Artefakte. |
| `CACHE_CONFIG_FILE` | Muss beim Publisher auf `.cache-the-planet.json` aus `main` zeigen. |

Der Publisher validiert Repository, Workflow, Abschlussstatus, PR-Nummer,
Head-SHA, Artifact-Name, Run-Zuordnung, Ablaufstatus, Pfade und Dateitypen,
bevor `dist/save.js` im isolierten `untrusted`-Namespace ausgeführt wird.

### Interne Cache- und GitHub-Kontextwerte

`GITHUB_EVENT_PATH`, `GITHUB_EVENT_NAME`, `GITHUB_REF`,
`GITHUB_DEFAULT_BRANCH`, `GITHUB_REPOSITORY`, `GITHUB_ACTOR` und
`GITHUB_WORKSPACE` werden aus dem GitHub-Runner-Kontext gelesen. Sie dürfen
nicht durch frei zusammengesetzte Shell-Argumente ersetzt werden. `GITHUB_TOKEN`
ist der REST-API-Fallback; `ACTIONS_RUNTIME_TOKEN` ist absichtlich kein
Fallback.

Die Funktionen `scopedKey`, `scopedRestorePrefix`, `scopeCounterpartKey`,
`sharedEquivalentKey`, `validateManifest`, `inspectTar`, `downloadToFile` und
`assertSafeRestoreWorkspace` bilden sicherheitskritische Protokollgrenzen.
Änderungen an ihnen benötigen passende Positiv- und Negativtests sowie eine
Prüfung der Namespace-, Größen-, Integritäts- und Archivregeln.

### Build- und Release-Schalter

- `inputs.dry-run` in `build-dist.yml` verhindert bei Pull Requests den
  generierten Commit und den Push nach `main`.
- `CACHE_MAX_*`-Variablen und `CACHE_ALLOWED_CACHE_NAMES` konfigurieren
  Sicherheitslimits und Allowlists; sie gehören in vertrauenswürdige Jobs und
  nicht in untrusted PR-Umgebungen.
- `CACHE_MANIFEST_BRANCH` und `CACHE_COMPRESSION_LEVEL` überschreiben die
  entsprechenden JSON-Konfigurationswerte in internen Test- und Betriebsjobs.
- `dist/` wird ausschließlich durch den vertrauenswürdigen Build-Workflow
  erzeugt. `CHANGELOG.md` wird ausschließlich durch Release Please gepflegt.
