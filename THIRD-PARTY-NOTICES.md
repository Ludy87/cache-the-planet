# Third-Party Notices

Dieses Dokument ergänzt die [`LICENSE`](LICENSE). Es führt die Drittanbieter-Software auf, die entweder in den von GitHub ausgeführten Bundles enthalten ist oder in den CI-Workflows verwendet wird.

## npm-Abhängigkeiten

Die folgenden Pakete und ihre transitiven Abhängigkeiten sind in `package-lock.json` festgeschrieben. Die Laufzeit-Abhängigkeiten werden beim Build in `dist/*.js` gebündelt; `esbuild` wird nur für den Build verwendet.

| Paket(e) | Version(en) im Lockfile | Lizenz | Quelle |
| --- | --- | --- | --- |
| `@actions/github` | 9.1.1 | MIT | [actions/toolkit](https://github.com/actions/toolkit/tree/main/packages/github) |
| `@actions/http-client` | 3.0.2 | MIT | [actions/toolkit](https://github.com/actions/toolkit/tree/main/packages/http-client) |
| `@octokit/*` | siehe Lockfile | MIT | [octokit.js](https://github.com/octokit) |
| `before-after-hook` | 4.0.0 | Apache-2.0 | [GitHub](https://github.com/gr2m/before-after-hook) |
| `content-type` | 3.0.0 | MIT | [npm](https://github.com/jshttp/content-type) |
| `json-with-bigint` | 3.5.12 | MIT | [GitHub](https://github.com/IvanMalopinsky/json-with-bigint) |
| `tunnel` | 0.0.6 | MIT | [npm](https://github.com/koichik/node-tunnel) |
| `undici` | 6.28.0 | MIT | [GitHub](https://github.com/nodejs/undici) |
| `universal-user-agent` | 7.0.3 | ISC | [GitHub](https://github.com/gr2m/universal-user-agent) |
| `esbuild` | 0.28.2 | MIT | [esbuild](https://github.com/evanw/esbuild) |
| `@esbuild/*` (optionale plattformspezifische Pakete) | 0.28.2 | MIT | [esbuild](https://github.com/evanw/esbuild) |

Die Tabelle fasst Pakete mit derselben Lizenz zusammen. Für die vollständige Liste, die exakten Auflösungen, Integritätswerte und verschachtelten Versionen ist [`package-lock.json`](package-lock.json) maßgeblich. Die Lizenztexte der Pakete sind in den jeweiligen npm-Paketen enthalten.

## GitHub Actions in den Workflows

Die Workflows verwenden neben den lokalen Actions `./` und `./save` die folgenden externen Actions. Sie bleiben eigenständige Drittanbieter-Software; ihre jeweiligen Lizenz- und Nutzungsbedingungen gelten unabhängig von der MIT-Lizenz dieses Repositorys.

| Action | Referenz im Repository | Quelle |
| --- | --- | --- |
| `actions/checkout` | Commit `3d3c42e5aac5ba805825da76410c181273ba90b1` (`v7.0.1`) | [GitHub](https://github.com/actions/checkout) |
| `actions/create-github-app-token` | Commit `bcd2ba49218906704ab6c1aa796996da409d3eb1` (`v3.2.0`) | [GitHub](https://github.com/actions/create-github-app-token) |
| `actions/setup-node` | Commit `820762786026740c76f36085b0efc47a31fe5020` (`v7.0.0`) | [GitHub](https://github.com/actions/setup-node) |
| `actions/setup-python` | Commit `5fda3b95a4ea91299a34e894583c3862153e4b97` (`v7.0.0`) | [GitHub](https://github.com/actions/setup-python) |
| `actions/setup-java` | Commit `dd06d9cba3e5552c54d9f8ea23572deb300f7c` (`v6.0.0`) | [GitHub](https://github.com/actions/setup-java) |
| `astral-sh/setup-uv` | Commit `20cfd1bf945f4377ade1205e4dbc17946fc9a30d` (`v10.0.1`) | [GitHub](https://github.com/astral-sh/setup-uv) |
| `dorny/paths-filter` | Commit `ceb8a2b8f2d89434be7ff52d3de7ec3738c5cc9d` (`v3.0.2`) | [GitHub](https://github.com/dorny/paths-filter) |
| `go-task/setup-task` | Commit `a00fbb05ce67b35648be3c78cbc9fd85354c757e` (`v2.2.0`) | [GitHub](https://github.com/go-task/setup-task) |
| `docker/setup-buildx-action` | Commit `37fe631027851001ddb9b187196cc803df7f5f0e` (`v4.3.0`) | [GitHub](https://github.com/docker/setup-buildx-action) |
| `docker/build-push-action` | Commit `53b7df96c91f9c12dcc8a07bcb9ccacbed38856a` (`v7.3.0`) | [GitHub](https://github.com/docker/build-push-action) |
| `github/codeql-action` | Commit `cdf488f595d80d6e07e03d4674febd5ab45fa938` (`v4.37.9`) | [GitHub](https://github.com/github/codeql-action) |
| `googleapis/release-please-action` | Commit `45996ed1f6d02564a971a2fa1b5860e934307cf7` (`v5.0.0`) | [GitHub](https://github.com/googleapis/release-please-action) |
| `actions/upload-artifact` | Commit `043fb46d1a93c77aae656e7c1c64a875d1fc6a0a` (`v7.0.1`) | [GitHub](https://github.com/actions/upload-artifact) |
| `actions/download-artifact` | Commit `3e5f45b2cfb9172054b4087a40e8e0b5a5461e7c` (`v8.0.1`) | [GitHub](https://github.com/actions/download-artifact) |
| `actions/dependency-review-action` | Commit `a1d282b36b6f3519aa1f3fc636f609c47dddb294` (`v5.0.0`) | [GitHub](https://github.com/actions/dependency-review-action) |
| `aquasecurity/trivy-action` | Commit `ed142fd0673e97e23eac54620cfb913e5ce36c25` (`v0.36.0`) | [GitHub](https://github.com/aquasecurity/trivy-action) |
| `astral-sh/setup-uv` | Commit `20cfd1bf945f4377ade1205e4dbc17946fc9a30d` (`v10.0.1`) | [GitHub](https://github.com/astral-sh/setup-uv) |
| `dtolnay/rust-toolchain` | Commit `6c977a6ca4077a0ceb28ffbe03f59d46e9ac8772` (`v1`) | [GitHub](https://github.com/dtolnay/rust-toolchain) |
| `gitleaks/gitleaks-action` | Commit `e0c47f4f8be36e29cdc102c57e68cb5cbf0e8d1e` (`v3.0.0`) | [GitHub](https://github.com/gitleaks/gitleaks-action) |
| `google/osv-scanner-action` | Commit `6e4298ebc4db23e847df9b2e2de2939d6f066c67` (`v2.5.1`) | [GitHub](https://github.com/google/osv-scanner-action) |
| `jimeh/update-tags-action` | Commit `98d6d448de7488acb52bd8db115673541d019521` (`v2`) | [GitHub](https://github.com/jimeh/update-tags-action) |
| `zizmorcore/zizmor-action` | Commit `70fb788f84895a7701f5643d103d587e460b5c99` (`v0.6.3`) | [GitHub](https://github.com/zizmorcore/zizmor-action) |

Für diese Actions werden keine Lizenztexte in diesem Repository dupliziert. Bei einer Weitergabe oder Änderung der Workflow-Referenzen sollten die Notices anhand der dann verwendeten Commits erneut geprüft werden.

## README-Banner

`docs/assets/cache-the-planet-banner.png` wurde als projektspezifische Grafik generiert und enthält keine übernommenen Logos, Marken oder externen Bildbestandteile. Für die Erstellung wurde ein generatives Bildwerkzeug verwendet. Die Nutzung des Bildes sollte bei einer Weiterverteilung zusätzlich anhand der zum Erstellungszeitpunkt geltenden Nutzungsbedingungen des verwendeten Dienstes geprüft werden.
