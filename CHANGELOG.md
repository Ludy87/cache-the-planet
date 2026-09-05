# Changelog

## Unreleased

### Chore

* Paketmetadaten aktualisiert, Node.js 22 als Mindestversion festgelegt und
  npm-Abhängigkeiten für reproduzierbare Installationen exakt gepinnt.
* Nicht mehr benötigte `license-checker`-Abhängigkeit entfernt.

## [1.2.0](https://github.com/Ludy87/cache-the-planet/compare/v1.1.0...v1.2.0) (2026-09-05)


### Features

* **cache:** add shared scopes and cache lifecycle controls ([#17](https://github.com/Ludy87/cache-the-planet/issues/17)) ([514737f](https://github.com/Ludy87/cache-the-planet/commit/514737f040491bea3f1dd6131107404cfeb9750c))


### Bug Fixes

* prevent workflows from blocking each other ([#14](https://github.com/Ludy87/cache-the-planet/issues/14)) ([6092f02](https://github.com/Ludy87/cache-the-planet/commit/6092f02dc503827e22ace4d0c15da0e08e88cb8b))
* protect concurrent manifest updates ([#12](https://github.com/Ludy87/cache-the-planet/issues/12)) ([6811090](https://github.com/Ludy87/cache-the-planet/commit/6811090a6865f81dc2bc1a27dbab5192c521682e))
* stabilize cache writes and platform tests ([#13](https://github.com/Ludy87/cache-the-planet/issues/13)) ([8bf4ef0](https://github.com/Ludy87/cache-the-planet/commit/8bf4ef002925db8cae7404f63840617be770a14b))
* use valid action metadata YAML ([76121a2](https://github.com/Ludy87/cache-the-planet/commit/76121a28e240778e62f4406fa6f3f746117492af))
* validate reusable cache workflows and Dependabot config ([#47](https://github.com/Ludy87/cache-the-planet/issues/47)) ([eac2322](https://github.com/Ludy87/cache-the-planet/commit/eac2322db231af8534bffcc33d27563bf1e1e05b))


### Performance

* reduce npm CI network overhead ([#45](https://github.com/Ludy87/cache-the-planet/issues/45)) ([988b432](https://github.com/Ludy87/cache-the-planet/commit/988b432acd6ea5ce441fb3f64f45b978eca5f7f9))


### Documentation

* correct README cache and release guidance ([029da62](https://github.com/Ludy87/cache-the-planet/commit/029da6270985f8e3f9fcd6d77c42794f4ba3b879))
* document Node.js and dependency requirements ([140a693](https://github.com/Ludy87/cache-the-planet/commit/140a693d792f99d7060a5786a6b451f1f22a91d5))
* update German cache documentation ([#8](https://github.com/Ludy87/cache-the-planet/issues/8)) ([71fba8d](https://github.com/Ludy87/cache-the-planet/commit/71fba8df8f162ec5bdfcf75db00e5c06004158cb))


### Security

* harden PR cache workflows and artifact handling ([#44](https://github.com/Ludy87/cache-the-planet/issues/44)) ([79472fd](https://github.com/Ludy87/cache-the-planet/commit/79472fdca6c1246b0a9c2a215d914dd0decb24c2))
* **workflows:** default workflow contents permissions to read ([#4](https://github.com/Ludy87/cache-the-planet/issues/4)) ([72f220c](https://github.com/Ludy87/cache-the-planet/commit/72f220c69781be4c0e16e44da7701638f32ccd59))

## [1.1.0](https://github.com/Ludy87/cache-the-planet/compare/v1.0.0...v1.1.0) (2026-08-28)


### Features

* add asset-name output for cached objects in save and restore actions ([c58c949](https://github.com/Ludy87/cache-the-planet/commit/c58c94962466da626f26b11e3df20d65e565cf84))
* add cache size limits and validation checks for archives ([77f8e6b](https://github.com/Ludy87/cache-the-planet/commit/77f8e6bf2b4c7eaf1760583ab8b8509c4b9bfb56))
* add dependabot configuration for GitHub Actions and npm updates ([8072e0f](https://github.com/Ludy87/cache-the-planet/commit/8072e0fba1c37b1363b25ea203dfa62b2102c519))
* add Release Please workflow and configuration for automated releases ([a688e98](https://github.com/Ludy87/cache-the-planet/commit/a688e988da124098604998c282b03b965fb9c9ea))
* add uv Python cache asset integration and update workflows ([4db7a5b](https://github.com/Ludy87/cache-the-planet/commit/4db7a5bead6b9ae374ab4ea03462e5539254b8cb))
* aktualisiere Cache-Schlüssel für Docker-Cache-Integration zur Unterstützung von Repository-Variablen ([eb7419b](https://github.com/Ludy87/cache-the-planet/commit/eb7419b3256f440866b68b5ffb507ede064ccdb8))
* aktualisiere Java- und Gradle-Cache-Integration auf actions/setup-java@v6 und passe Cache-Namen an ([a4dea5a](https://github.com/Ludy87/cache-the-planet/commit/a4dea5a18006aa5ee5c4f0d6b570b4d9525cf64a))
* cache-name für verschiedene Workflows hinzufügen und Cache-Keys aktualisieren ([26be7fd](https://github.com/Ludy87/cache-the-planet/commit/26be7fd62ea5297154966e10e478dbc082abe126))
* enhance cache handling and validation in common functions ([65ab243](https://github.com/Ludy87/cache-the-planet/commit/65ab243da1212a446c203cbcd707d9aa5a90e8c9))
* enhance cache key handling and documentation for pull requests ([2d4d216](https://github.com/Ludy87/cache-the-planet/commit/2d4d216c1443bba5ffc883cc5b982c21b39d83e8))
* neue Vorlage für unterstützte Actions und Cache-Einstellungen hinzufügen ([976ac26](https://github.com/Ludy87/cache-the-planet/commit/976ac267c075ae04dadd066480a6511c397730fc))


### Bug Fixes

* aktualisiere Archivierungslogik zur Unterstützung von Hardlinks und verbessere Sicherheitsüberprüfungen ([4ed59fd](https://github.com/Ludy87/cache-the-planet/commit/4ed59fda20c196705a592d63c342df15326dd8aa))
* aktualisiere Cache-Integration für uv-managed Python und verbessere README-Dokumentation ([62ae6d1](https://github.com/Ludy87/cache-the-planet/commit/62ae6d193ceaa332720eef95c01a17a477e56860))
* aktualisiere Cache-Schlüssel für npm- und uv-Cache-Integration zur Verwendung von dynamischen Werten ([38f537c](https://github.com/Ludy87/cache-the-planet/commit/38f537cb748d04b3804d1158090be80240829028))
* aktualisiere Cache-Schlüssel für npm-Cache-Integration zur Verwendung von dynamischen Werten ([55edd77](https://github.com/Ludy87/cache-the-planet/commit/55edd77a162e06904bd9b9cca1fae7b5440d828e))
* aktualisiere Cache-Schlüssel für uv- und uv-python-Integration zur Verwendung von dynamischen Werten ([72a43bb](https://github.com/Ludy87/cache-the-planet/commit/72a43bb4778badc32a50163693136dda232708f5))
* aktualisiere Cache-Schlüssel und verbessere die Ausgabeformatierung in Taskfile ([c53c9ca](https://github.com/Ludy87/cache-the-planet/commit/c53c9ca3463b3da80e8a75677db7e4807b42097a))
* aktualisiere Cache-Schlüssel zur Verwendung von dynamischen Werten für verbesserte Cache-Integrität ([4f97ea3](https://github.com/Ludy87/cache-the-planet/commit/4f97ea3e28b6e4a2456e710ca4c763bd71587be1))
* build pr cleanup distribution ([#5](https://github.com/Ludy87/cache-the-planet/issues/5)) ([b6462e3](https://github.com/Ludy87/cache-the-planet/commit/b6462e3985ab1467141b62d04edbb6722495f737))
* cache uv managed Python installation ([#3](https://github.com/Ludy87/cache-the-planet/issues/3)) ([0c0036e](https://github.com/Ludy87/cache-the-planet/commit/0c0036e4145296c12a3cbccc569cd662d0fd8a26))
* configure release please package ([#4](https://github.com/Ludy87/cache-the-planet/issues/4)) ([e3a1dc7](https://github.com/Ludy87/cache-the-planet/commit/e3a1dc798b0f94a4716825c5cf5dc21ea68aae4f))
* enhance security scan to allow package metadata files and improve credential checks ([8cec59d](https://github.com/Ludy87/cache-the-planet/commit/8cec59d8281d3edee9a58a598944bfdd00628131))
* entferne veraltete Referenzen aus references-v1.json ([38fa14d](https://github.com/Ludy87/cache-the-planet/commit/38fa14d7e1760f7b435c15dae6af96236afe5d05))
* entferne veraltete uv-python-3-13 Referenz aus references-v1.json ([48bc853](https://github.com/Ludy87/cache-the-planet/commit/48bc853ad43496643ab7ffe951d030c78fcca815))
* force add dist and package-lock.json to ensure updates are committed ([bb833df](https://github.com/Ludy87/cache-the-planet/commit/bb833df16d9b4644d7e03a2e3ac6c592a922825b))
* improve pull request number retrieval logic in refName function ([cbc002f](https://github.com/Ludy87/cache-the-planet/commit/cbc002f663332eece69ecb03b1810ae28313e300))
* prepare first release ([424ab01](https://github.com/Ludy87/cache-the-planet/commit/424ab0127e1c1e844ca72ca7ce78895c8c525576))
* update allow-pr-cache description and default value for pull requests ([a3ce477](https://github.com/Ludy87/cache-the-planet/commit/a3ce4777fbab3d9f5706e8ae89c4c17e7d78c285))
* use current main for PR cache cleanup ([#6](https://github.com/Ludy87/cache-the-planet/issues/6)) ([6c82b58](https://github.com/Ludy87/cache-the-planet/commit/6c82b5883cdee88dc2afd42ccf9a761179ce75be))


### Documentation

* add banner image to README ([52a1b27](https://github.com/Ludy87/cache-the-planet/commit/52a1b27b02c13f75aa0570516eba5165f0181f3b))
* add Third-Party Notices section to README and create THIRD-PARTY-NOTICES.md ([9284539](https://github.com/Ludy87/cache-the-planet/commit/9284539b7ef86236c1b97669e0ce8a62de75537d))
* update README and test script to reflect removal of release asset name from references ([addb691](https://github.com/Ludy87/cache-the-planet/commit/addb691021b9d1c0045efe4d498d648440265144))


### Security

* enhance credential detection in cache paths and update tests ([09bc209](https://github.com/Ludy87/cache-the-planet/commit/09bc209f19a70e0626794d30967274d44d2a5ab4))
* enhance symlink handling in security scan and update tests ([eea9a43](https://github.com/Ludy87/cache-the-planet/commit/eea9a430812ff079051321acbc0d287f056d5662))
* refine sensitive directory checks and enhance archive exclusion rules ([2590f14](https://github.com/Ludy87/cache-the-planet/commit/2590f14dddaf47ceea6c044f045f5eb5fbfa8f45))
