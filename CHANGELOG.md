# Changelog

## Unreleased

### Chore

* Paketmetadaten aktualisiert, Node.js 22 als Mindestversion festgelegt und
  npm-Abhängigkeiten für reproduzierbare Installationen exakt gepinnt.
* Nicht mehr benötigte `license-checker`-Abhängigkeit entfernt.
## [2.0.1](https://github.com/Ludy87/cache-the-planet/compare/v2.0.0...v2.0.1) (2026-10-04)


### 🐛 Bug Fixes

* **security:** ignore dependency token false positives ([#255](https://github.com/Ludy87/cache-the-planet/issues/255)) ([6ce02f1](https://github.com/Ludy87/cache-the-planet/commit/6ce02f1d958d0a3e31e2ab64346fb7bd823a0f65))

## [2.0.0](https://github.com/Ludy87/cache-the-planet/compare/v1.10.0...v2.0.0) (2026-10-03)


### ⚠ BREAKING CHANGES

* **sftp:** remove JSON credential fallbacks ([#207](https://github.com/Ludy87/cache-the-planet/issues/207))

### 🎉 Features

* **action:** add automatic post-save caching ([#88](https://github.com/Ludy87/cache-the-planet/issues/88)) ([9b56ea6](https://github.com/Ludy87/cache-the-planet/commit/9b56ea6e4d456d3ca11deb35a30ee49155701cca))
* **action:** add restore sub-action metadata ([#87](https://github.com/Ludy87/cache-the-planet/issues/87)) ([0bd1dc8](https://github.com/Ludy87/cache-the-planet/commit/0bd1dc8e7944163b44e1d42a26edcb24a188fd6e))
* **action:** expose cache errors as output ([#182](https://github.com/Ludy87/cache-the-planet/issues/182)) ([f20007a](https://github.com/Ludy87/cache-the-planet/commit/f20007a66511789ed7ffb21cce83b6fa8b20b439))
* add multi-cache action and integration workflow ([#128](https://github.com/Ludy87/cache-the-planet/issues/128)) ([68714f4](https://github.com/Ludy87/cache-the-planet/commit/68714f4e0209499e1774dad172bded23e64e0e4e))
* add multi-cache output lists ([#138](https://github.com/Ludy87/cache-the-planet/issues/138)) ([66f0a26](https://github.com/Ludy87/cache-the-planet/commit/66f0a26046f0d68ce20146f784fedc7e0d1a3bea))
* add Rust Cargo cache integration ([#104](https://github.com/Ludy87/cache-the-planet/issues/104)) ([9c91d85](https://github.com/Ludy87/cache-the-planet/commit/9c91d85564ad2accf1537a556717737b1547039e))
* **cache:** add download disable switch ([#208](https://github.com/Ludy87/cache-the-planet/issues/208)) ([1cb597b](https://github.com/Ludy87/cache-the-planet/commit/1cb597bcb95d7dfba06c28305d1d5de4463dfab3))
* **cache:** add shared scopes and cache lifecycle controls ([#17](https://github.com/Ludy87/cache-the-planet/issues/17)) ([3c92aff](https://github.com/Ludy87/cache-the-planet/commit/3c92aff1a6a823cf9f74fcfc2b79ff4f7723665f))
* **ci:** restore node modules in npm cache integration ([#241](https://github.com/Ludy87/cache-the-planet/issues/241)) ([79e4dbd](https://github.com/Ludy87/cache-the-planet/commit/79e4dbdcf308c259ec78197fb00cb7d221334341))
* **ci:** unify cache post-save and workflow safeguards ([#90](https://github.com/Ludy87/cache-the-planet/issues/90)) ([57ce4b5](https://github.com/Ludy87/cache-the-planet/commit/57ce4b5defad8c3c5dfd4f63999c209b5adb7b0f))
* **config:** allow compression level in config ([#89](https://github.com/Ludy87/cache-the-planet/issues/89)) ([9e074e5](https://github.com/Ludy87/cache-the-planet/commit/9e074e5d9ca39653c7427c935196a9b6324df1a8))
* configure cache repository and manifest branch ([#68](https://github.com/Ludy87/cache-the-planet/issues/68)) ([d3bfe94](https://github.com/Ludy87/cache-the-planet/commit/d3bfe9406f878bf7ae8e03d7f0656191b7b2b846))
* derive cache identity from archive inputs ([#143](https://github.com/Ludy87/cache-the-planet/issues/143)) ([940a866](https://github.com/Ludy87/cache-the-planet/commit/940a8660a9a643432347cde301726c32934cf955))
* expose named multi-cache results ([#139](https://github.com/Ludy87/cache-the-planet/issues/139)) ([9ae38d8](https://github.com/Ludy87/cache-the-planet/commit/9ae38d85515de5648ebbe3305241af88fef87652))
* **manifests:** split cache references by scope and pull request ([#166](https://github.com/Ludy87/cache-the-planet/issues/166)) ([06f6385](https://github.com/Ludy87/cache-the-planet/commit/06f63855cde3fe0cbeb7a13d080212c0ea586ee6))
* **manifest:** support configurable manifest paths ([#179](https://github.com/Ludy87/cache-the-planet/issues/179)) ([e3b3bab](https://github.com/Ludy87/cache-the-planet/commit/e3b3bab5c88b86e503d3283ff7710108512f6067))
* separate restore and save strictness ([#146](https://github.com/Ludy87/cache-the-planet/issues/146)) ([461ec54](https://github.com/Ludy87/cache-the-planet/commit/461ec54828e1479514e059800be14cdeeefe8b81))
* **sftp:** report download progress ([#185](https://github.com/Ludy87/cache-the-planet/issues/185)) ([d89d2f4](https://github.com/Ludy87/cache-the-planet/commit/d89d2f4ccd765b04d6d2439546792e1c3d3e4c59))
* **sftp:** report upload progress ([#188](https://github.com/Ludy87/cache-the-planet/issues/188)) ([8a4e354](https://github.com/Ludy87/cache-the-planet/commit/8a4e354aba9ff8418487ca7e4e21e150cfeca19c))
* **storage:** add github artifact backend ([#216](https://github.com/Ludy87/cache-the-planet/issues/216)) ([37436f8](https://github.com/Ludy87/cache-the-planet/commit/37436f8ccf44ddaaf62ef032d62770e2130e8470))
* **storage:** add github branch object storage ([#204](https://github.com/Ludy87/cache-the-planet/issues/204)) ([26fa631](https://github.com/Ludy87/cache-the-planet/commit/26fa63114f99ab7520bf7e180c03402b4c255052))
* **storage:** add SFTP cache object backend ([#174](https://github.com/Ludy87/cache-the-planet/issues/174)) ([01ea7c9](https://github.com/Ludy87/cache-the-planet/commit/01ea7c912a5d40698d68820a6aed8aebffeb5737))
* **storage:** expose branch cache scope in paths ([#213](https://github.com/Ludy87/cache-the-planet/issues/213)) ([ffa7c09](https://github.com/Ludy87/cache-the-planet/commit/ffa7c09f3b5ba264b84b31fa276a524457d0785b))
* **storage:** publish fork artifact metadata ([#217](https://github.com/Ludy87/cache-the-planet/issues/217)) ([7993241](https://github.com/Ludy87/cache-the-planet/commit/79932412a71709edc98a07ca22867171a5cf9c09))
* **storage:** support branch cache multipart metadata ([#205](https://github.com/Ludy87/cache-the-planet/issues/205)) ([5edb5ca](https://github.com/Ludy87/cache-the-planet/commit/5edb5ca8c624b2c15fb96faa01083729d64a247c))


### 🐛 Bug Fixes

* **action:** allow descriptive cache error outputs ([#184](https://github.com/Ludy87/cache-the-planet/issues/184)) ([4431711](https://github.com/Ludy87/cache-the-planet/commit/4431711e2dabb9d7a1bda851aef94f1283cea1f3))
* **action:** allow environment storage settings ([#193](https://github.com/Ludy87/cache-the-planet/issues/193)) ([651029a](https://github.com/Ludy87/cache-the-planet/commit/651029a99e72da2d5b1cf92d1ea8453662f8624e))
* **action:** expose artifact retention in multi-cache ([#219](https://github.com/Ludy87/cache-the-planet/issues/219)) ([d785c7f](https://github.com/Ludy87/cache-the-planet/commit/d785c7fad64cfa59458a2a3db243193d0f5c6b07))
* **action:** expose status outputs during restore ([#93](https://github.com/Ludy87/cache-the-planet/issues/93)) ([e56f9f3](https://github.com/Ludy87/cache-the-planet/commit/e56f9f38db4b0ea309bc80593cb9079e1dcd2f98))
* **action:** preserve SFTP port environment for post-save ([#192](https://github.com/Ludy87/cache-the-planet/issues/192)) ([474fc81](https://github.com/Ludy87/cache-the-planet/commit/474fc81d94f04e0c759fe75a6a9075c3cbc2816b))
* **action:** standardize save output names ([#86](https://github.com/Ludy87/cache-the-planet/issues/86)) ([bfa0210](https://github.com/Ludy87/cache-the-planet/commit/bfa0210301be56dd0c092dd9ca35fe48c7f2ca2b))
* allow cargo crate cache archives ([#197](https://github.com/Ludy87/cache-the-planet/issues/197)) ([4d851ef](https://github.com/Ludy87/cache-the-planet/commit/4d851ef761a92ee697988ce4e0fc7ab1fedfcc65))
* allow Cargo dependency scan false positives ([#246](https://github.com/Ludy87/cache-the-planet/issues/246)) ([20a649b](https://github.com/Ludy87/cache-the-planet/commit/20a649bd8c174e0bad605791dc1b7efe7c2b9596))
* allow Cargo registry dependency content ([#247](https://github.com/Ludy87/cache-the-planet/issues/247)) ([0f3b7d0](https://github.com/Ludy87/cache-the-planet/commit/0f3b7d076ab1c26128a0b7c77c3e7581c083d095))
* allow cargo sparse index cache entries ([f230f3e](https://github.com/Ludy87/cache-the-planet/commit/f230f3efa1a3081fd8b393bb682708cfe8df02bf))
* allow cargo sparse index cache entries ([#199](https://github.com/Ludy87/cache-the-planet/issues/199)) ([ffa6727](https://github.com/Ludy87/cache-the-planet/commit/ffa6727b08fac1da5fd61edf418633b26f087c7f))
* allow dependency security scan false positives ([#245](https://github.com/Ludy87/cache-the-planet/issues/245)) ([e7302f9](https://github.com/Ludy87/cache-the-planet/commit/e7302f901d22a4a4d9dc96105ced76ca84f26e52))
* allow stylesheet files in cache scans ([#107](https://github.com/Ludy87/cache-the-planet/issues/107)) ([27465a2](https://github.com/Ludy87/cache-the-planet/commit/27465a29227ac6193f8b65337c857b91ec5ba36b))
* **artifact:** prevent release creation for artifact storage ([#233](https://github.com/Ludy87/cache-the-planet/issues/233)) ([ae93160](https://github.com/Ludy87/cache-the-planet/commit/ae931605ccab3cde6972745131b46816cb0fe3d9))
* **artifact:** treat missing cache artifacts as misses ([#243](https://github.com/Ludy87/cache-the-planet/issues/243)) ([75c58ec](https://github.com/Ludy87/cache-the-planet/commit/75c58ec3ef8cbed2db2e66b36025a05ae26f4889))
* **artifact:** treat stale manifest references as misses ([#244](https://github.com/Ludy87/cache-the-planet/issues/244)) ([82de0e5](https://github.com/Ludy87/cache-the-planet/commit/82de0e5eee6c8e1752a8e8567ceb7d90dd09e63c))
* **artifact:** validate availability during probe ([4b640fc](https://github.com/Ludy87/cache-the-planet/commit/4b640fcee8db8c2032bf5e134d97aa0b447caef0))
* authenticate floating release tag pushes ([#52](https://github.com/Ludy87/cache-the-planet/issues/52)) ([f003207](https://github.com/Ludy87/cache-the-planet/commit/f0032078d40a51d9027f23fc7dfccecfb023fae5))
* bundle shared constants into common action ([#131](https://github.com/Ludy87/cache-the-planet/issues/131)) ([163ed4b](https://github.com/Ludy87/cache-the-planet/commit/163ed4b522dcf736e0ac412d2209a9fdcd97d586))
* **cache:** keep PR cache identity stable during publishing ([#157](https://github.com/Ludy87/cache-the-planet/issues/157)) ([52cc5a7](https://github.com/Ludy87/cache-the-planet/commit/52cc5a743de08898fde7a4748fb762efc40c71b8))
* **cache:** report cache hits when downloads are disabled ([#210](https://github.com/Ludy87/cache-the-planet/issues/210)) ([87f3070](https://github.com/Ludy87/cache-the-planet/commit/87f30706dd4b04e87e0a70d8ed3653c9af36e104))
* **cache:** retry transient transfer failures five times ([50d609a](https://github.com/Ludy87/cache-the-planet/commit/50d609a598a48dc0ee5ae1aa53a3121c465512b3))
* **cache:** retry transient transfer failures five times ([#209](https://github.com/Ludy87/cache-the-planet/issues/209)) ([5ca509c](https://github.com/Ludy87/cache-the-planet/commit/5ca509ccc62853152c0314ab7d3d0836bf6082e1))
* **cargo:** align cached paths across shared and PR jobs ([#159](https://github.com/Ludy87/cache-the-planet/issues/159)) ([ce09a45](https://github.com/Ludy87/cache-the-planet/commit/ce09a45888d78a7ef83654f77589386c3169fc16))
* **cargo:** restore shared cache with matching paths ([df4c32a](https://github.com/Ludy87/cache-the-planet/commit/df4c32a0ede96d79a4ef5553d869eb786b37ea28))
* **ci:** align integration cache paths with cache names ([#163](https://github.com/Ludy87/cache-the-planet/issues/163)) ([fb33222](https://github.com/Ludy87/cache-the-planet/commit/fb3322200aa467b49cd02ae6909bb10092b0104f))
* **ci:** avoid broad uv cache restore fallback ([#91](https://github.com/Ludy87/cache-the-planet/issues/91)) ([e4f2e54](https://github.com/Ludy87/cache-the-planet/commit/e4f2e546f0eb3e402312e4cc71bcb812ca2ffc84))
* **ci:** avoid runtime dependency in PR cache publisher ([#77](https://github.com/Ludy87/cache-the-planet/issues/77)) ([457faf4](https://github.com/Ludy87/cache-the-planet/commit/457faf453c341a4676637d952a922767feddcb2a))
* **ci:** broaden release please workflow triggers ([#126](https://github.com/Ludy87/cache-the-planet/issues/126)) ([7cbcc13](https://github.com/Ludy87/cache-the-planet/commit/7cbcc13c27ec8aec97da685b5e920523ca04301d))
* **ci:** correct task cache temp directory path ([#165](https://github.com/Ludy87/cache-the-planet/issues/165)) ([32996b5](https://github.com/Ludy87/cache-the-planet/commit/32996b5a3d274d93bd3892bdef2bd43d09e8ef89))
* **ci:** delete published PR cache artifacts ([#78](https://github.com/Ludy87/cache-the-planet/issues/78)) ([9f32651](https://github.com/Ludy87/cache-the-planet/commit/9f32651045bb9e0c9ea51a72c18ede37aa57f54f))
* **ci:** download all fork cache artifacts ([#220](https://github.com/Ludy87/cache-the-planet/issues/220)) ([b0964a8](https://github.com/Ludy87/cache-the-planet/commit/b0964a8736983adcdbeb9c877db070e7afcdb2d5))
* **ci:** enforce strict cache workflow restores ([#94](https://github.com/Ludy87/cache-the-planet/issues/94)) ([02207b3](https://github.com/Ludy87/cache-the-planet/commit/02207b35ef66f70b1317046b35191a8807844838))
* **ci:** fetch complete history for gitleaks ([#252](https://github.com/Ludy87/cache-the-planet/issues/252)) ([ac33fb4](https://github.com/Ludy87/cache-the-planet/commit/ac33fb4ccdf4ec10033b1962c301102afd47cd74))
* **ci:** harden release workflow token handling ([#61](https://github.com/Ludy87/cache-the-planet/issues/61)) ([e104dfc](https://github.com/Ludy87/cache-the-planet/commit/e104dfcf7a7403fbd208645e45748e183b52151a))
* **ci:** keep Gradle cache paths inside workspace ([#161](https://github.com/Ludy87/cache-the-planet/issues/161)) ([08ae703](https://github.com/Ludy87/cache-the-planet/commit/08ae7039fcfec35a4719eb3ab773be4b8d91bbc0))
* **ci:** match metadata artifact names ([bdaebab](https://github.com/Ludy87/cache-the-planet/commit/bdaebab9fa624465a86e7e9a7993d8146fd29ac9))
* **ci:** match metadata artifact names ([#222](https://github.com/Ludy87/cache-the-planet/issues/222)) ([1fec0c7](https://github.com/Ludy87/cache-the-planet/commit/1fec0c7a404609781752ebe496b08a03600dc9d4))
* **ci:** resolve fork metadata artifacts by API ([#223](https://github.com/Ludy87/cache-the-planet/issues/223)) ([cec7f61](https://github.com/Ludy87/cache-the-planet/commit/cec7f617a13b99d0068cb37f515d431b5a1eaad8))
* **ci:** resolve missing pull request metadata in cache publisher ([#76](https://github.com/Ludy87/cache-the-planet/issues/76)) ([60a02df](https://github.com/Ludy87/cache-the-planet/commit/60a02df5e023ff5404c8bd51caf60e1cecc06ca3))
* **ci:** restrict shared uv cache restore ([#92](https://github.com/Ludy87/cache-the-planet/issues/92)) ([57c94fc](https://github.com/Ludy87/cache-the-planet/commit/57c94fccb6f2ba01fc28a9e37d86ce40734b0417))
* **ci:** show encryption and npm test status in step summaries ([#79](https://github.com/Ludy87/cache-the-planet/issues/79)) ([29dbf22](https://github.com/Ludy87/cache-the-planet/commit/29dbf2283661ac055f25a26b1011f5d5049f006f))
* **ci:** stabilize archive fuzz test and add uncached test job ([#65](https://github.com/Ludy87/cache-the-planet/issues/65)) ([57b987f](https://github.com/Ludy87/cache-the-planet/commit/57b987f699e1a06de76b27dcdff12c6555b0f285))
* **ci:** upload PR cache artifacts only on cache miss ([01c62cc](https://github.com/Ludy87/cache-the-planet/commit/01c62cc7861eae06e42e05074f423ed60c00cb08))
* **ci:** use action for floating release tags ([#66](https://github.com/Ludy87/cache-the-planet/issues/66)) ([916006f](https://github.com/Ludy87/cache-the-planet/commit/916006fbbe3500a36f6c088339736d8e8612086f))
* **ci:** use detected Java version for Gradle cache paths ([#151](https://github.com/Ludy87/cache-the-planet/issues/151)) ([701d3ad](https://github.com/Ludy87/cache-the-planet/commit/701d3adc2019cea9d0f0172b337f74d0284582a9))
* **ci:** use relative Gradle cache paths ([#162](https://github.com/Ludy87/cache-the-planet/issues/162)) ([f8d6b5b](https://github.com/Ludy87/cache-the-planet/commit/f8d6b5b5ac6260b9f78b54d33eefdac0f306aeb0))
* **ci:** use self-repository action syntax ([275467b](https://github.com/Ludy87/cache-the-planet/commit/275467b98d63077752f11d691edc1c58baa6571b))
* **ci:** use self-repository action syntax ([#98](https://github.com/Ludy87/cache-the-planet/issues/98)) ([7cd619b](https://github.com/Ludy87/cache-the-planet/commit/7cd619b17130a7898e5ea5296f64b803810354f2))
* clean up save temporary archives ([#203](https://github.com/Ludy87/cache-the-planet/issues/203)) ([cdc12bf](https://github.com/Ludy87/cache-the-planet/commit/cdc12bfed1c697685de584ae4d11092a44b2fdb7))
* clean up untrusted PR references across manifests ([#170](https://github.com/Ludy87/cache-the-planet/issues/170)) ([6397f36](https://github.com/Ludy87/cache-the-planet/commit/6397f36287325eed91c16785e248d5f224ece9f1))
* continue multi-cache after entry failures ([aa259c6](https://github.com/Ludy87/cache-the-planet/commit/aa259c60c0bbcac1e5f7d5cc61f48336d2bd8775))
* continue multi-cache after entry failures ([#198](https://github.com/Ludy87/cache-the-planet/issues/198)) ([d1e68bc](https://github.com/Ludy87/cache-the-planet/commit/d1e68bc1114c0224b2fa470ca1a8e00a1b8fc47c))
* create missing floating release tags ([#54](https://github.com/Ludy87/cache-the-planet/issues/54)) ([8807a88](https://github.com/Ludy87/cache-the-planet/commit/8807a884aad82d0212bcb535690de1e4aad5ea5a))
* deduplicate untrusted cache assets ([#153](https://github.com/Ludy87/cache-the-planet/issues/153)) ([7c416e4](https://github.com/Ludy87/cache-the-planet/commit/7c416e4ab54db684f7afec759acf470abeec9aba))
* dependency security scan paths on Windows ([#248](https://github.com/Ludy87/cache-the-planet/issues/248)) ([4749907](https://github.com/Ludy87/cache-the-planet/commit/4749907000d247721bee612082066292a08aa766))
* **deps:** update glob to supported version ([#228](https://github.com/Ludy87/cache-the-planet/issues/228)) ([5f23333](https://github.com/Ludy87/cache-the-planet/commit/5f23333272930de30713349c8a2edf7d62e55ff1))
* discover cache configuration automatically ([#105](https://github.com/Ludy87/cache-the-planet/issues/105)) ([6ab43e4](https://github.com/Ludy87/cache-the-planet/commit/6ab43e4540321d3fa32efd95e34ebc1225ae05d1))
* exclude ([bf13983](https://github.com/Ludy87/cache-the-planet/commit/bf13983ca045ab948e1656f249973ca1fcab0fc9))
* force local tar archives ([#200](https://github.com/Ludy87/cache-the-planet/issues/200)) ([c841869](https://github.com/Ludy87/cache-the-planet/commit/c84186913fdd74ab7cc571b5cce216aafc4969d5))
* **gc:** close SFTP connection after cleanup ([#178](https://github.com/Ludy87/cache-the-planet/issues/178)) ([2a74d60](https://github.com/Ludy87/cache-the-planet/commit/2a74d60319589322b40d900a35e674f599593dec))
* **gc:** delete SFTP objects through storage backend ([#177](https://github.com/Ludy87/cache-the-planet/issues/177)) ([08c51da](https://github.com/Ludy87/cache-the-planet/commit/08c51da999ba873efcd18b0dd007bbe68a4bc5c4))
* include hidden files in cache artifacts ([#119](https://github.com/Ludy87/cache-the-planet/issues/119)) ([69cadcc](https://github.com/Ludy87/cache-the-planet/commit/69cadccb7c828e5066e9992c76b82852ca80f98e))
* include hidden Gradle cache files ([#118](https://github.com/Ludy87/cache-the-planet/issues/118)) ([eafb213](https://github.com/Ludy87/cache-the-planet/commit/eafb2136b5da465e3472c0a5d8264b11c2a4be42))
* keep cache identity out of asset names ([#144](https://github.com/Ludy87/cache-the-planet/issues/144)) ([f4c7648](https://github.com/Ludy87/cache-the-planet/commit/f4c764854fd38cfbdcc07af24937c4ce77ab2de9))
* **manifests:** allow default read-only manifest lookup ([#167](https://github.com/Ludy87/cache-the-planet/issues/167)) ([6c05868](https://github.com/Ludy87/cache-the-planet/commit/6c058683d032d118885301187dfb9029c8daacae))
* **multi-cache:** expose storage inputs ([#191](https://github.com/Ludy87/cache-the-planet/issues/191)) ([d6c2121](https://github.com/Ludy87/cache-the-planet/commit/d6c2121b2ccb138d7d4bc75e620359dc1193ceca))
* normalize dependency security scan paths ([#251](https://github.com/Ludy87/cache-the-planet/issues/251)) ([dd612a1](https://github.com/Ludy87/cache-the-planet/commit/dd612a139fae2ab5089ed2a3e9d829ccc2b39a27))
* normalize hyphenated action inputs ([f55bca1](https://github.com/Ludy87/cache-the-planet/commit/f55bca1c56360ff1c84f81c0c49e0bbcff31e439))
* normalize hyphenated action inputs ([#147](https://github.com/Ludy87/cache-the-planet/issues/147)) ([8541c2b](https://github.com/Ludy87/cache-the-planet/commit/8541c2bc61d31c3c8f745d9a5d6586239637a50e))
* pass cache config file to reusable integration workflows ([26b3ce2](https://github.com/Ludy87/cache-the-planet/commit/26b3ce270731942903be57c6e2bf95fc7d140dcd))
* pass multi-cache input names correctly ([#129](https://github.com/Ludy87/cache-the-planet/issues/129)) ([649f767](https://github.com/Ludy87/cache-the-planet/commit/649f767a4ee0f910b1bbf76a2d8beb9190c2a656))
* point Dependabot to example manifests ([#113](https://github.com/Ludy87/cache-the-planet/issues/113)) ([c6b4d9d](https://github.com/Ludy87/cache-the-planet/commit/c6b4d9d400bb0161913c96c1a227b616b733b089))
* populate rust cache fixture and align docker asset version ([#106](https://github.com/Ludy87/cache-the-planet/issues/106)) ([f1de43e](https://github.com/Ludy87/cache-the-planet/commit/f1de43e124f0b9d410009ad447fb82673950df82))
* **pr:** cleanup untrusted manifests v2 ([#171](https://github.com/Ludy87/cache-the-planet/issues/171)) ([f77a324](https://github.com/Ludy87/cache-the-planet/commit/f77a324af4d8ab9cab653ceaed1d76d914793d39))
* prepare tools before multi-cache restore ([#134](https://github.com/Ludy87/cache-the-planet/issues/134)) ([3571b71](https://github.com/Ludy87/cache-the-planet/commit/3571b71e9b47c664eab17bc75e984bfc28b9d276))
* preserve cache key hash in asset names ([#150](https://github.com/Ludy87/cache-the-planet/issues/150)) ([dfd6a72](https://github.com/Ludy87/cache-the-planet/commit/dfd6a724fa1e5be4ead1154fb4b5e20febf0f3c8))
* publish PR cache artifacts consistently ([#142](https://github.com/Ludy87/cache-the-planet/issues/142)) ([95c43b5](https://github.com/Ludy87/cache-the-planet/commit/95c43b504dec9a632986a52868952f00aabdd5a6))
* **publisher:** export configured cache names ([#74](https://github.com/Ludy87/cache-the-planet/issues/74)) ([03eb557](https://github.com/Ludy87/cache-the-planet/commit/03eb5576398db2980e88bd88c7604e4db7d26c38))
* remove owner and repository from asset names ([#152](https://github.com/Ludy87/cache-the-planet/issues/152)) ([0734347](https://github.com/Ludy87/cache-the-planet/commit/0734347842892602acb7c026c88becb7f0e53f1a))
* replace existing untrusted cache references ([#148](https://github.com/Ludy87/cache-the-planet/issues/148)) ([a6335f3](https://github.com/Ludy87/cache-the-planet/commit/a6335f3bc6e2e04044d7ee09faf97e3cbadb2e00))
* replace updated cache assets ([#149](https://github.com/Ludy87/cache-the-planet/issues/149)) ([b5c0c73](https://github.com/Ludy87/cache-the-planet/commit/b5c0c73ee17dc0b79136b693d370cd6d3996f69a))
* respect configured SFTP port ([979e320](https://github.com/Ludy87/cache-the-planet/commit/979e320c459f47b31fb9d597400f430bc0c378cb))
* respect configured SFTP port ([#201](https://github.com/Ludy87/cache-the-planet/issues/201)) ([e2929a2](https://github.com/Ludy87/cache-the-planet/commit/e2929a25303dc45b9c67143bae4204bb210ccaad))
* respect SFTP cache configuration ([#202](https://github.com/Ludy87/cache-the-planet/issues/202)) ([a9df4d6](https://github.com/Ludy87/cache-the-planet/commit/a9df4d60527c40b727c2bd6c737876fc520d9ed0))
* restore Cargo cache before toolchain setup ([#124](https://github.com/Ludy87/cache-the-planet/issues/124)) ([4fca0ce](https://github.com/Ludy87/cache-the-planet/commit/4fca0cef867245622e932f823afc58e0a7281ed1))
* restore shared Docker QEMU cache ([#141](https://github.com/Ludy87/cache-the-planet/issues/141)) ([a1d697d](https://github.com/Ludy87/cache-the-planet/commit/a1d697d09077d1f6aa5ca9ecf78271760a813bf5))
* **restore:** nested cache paths ([#164](https://github.com/Ludy87/cache-the-planet/issues/164)) ([2c2f038](https://github.com/Ludy87/cache-the-planet/commit/2c2f038d4116d62095e2c7702ecd2dbf0b260983))
* **restore:** normalize repeated archive separators ([#242](https://github.com/Ludy87/cache-the-planet/issues/242)) ([03d8990](https://github.com/Ludy87/cache-the-planet/commit/03d8990fd8b5c8d54946e9b33aceea474a8678eb))
* **restore:** report archive paths outside cache roots ([b01422d](https://github.com/Ludy87/cache-the-planet/commit/b01422d5c046c366c2c380d2dc05e89acd63cd9e))
* **restore:** report cache archive paths ([#237](https://github.com/Ludy87/cache-the-planet/issues/237)) ([85c1b49](https://github.com/Ludy87/cache-the-planet/commit/85c1b49dfdf00cdb981c1b65778d4f934623672b))
* **restore:** validate archive paths against input ([#84](https://github.com/Ludy87/cache-the-planet/issues/84)) ([c54398e](https://github.com/Ludy87/cache-the-planet/commit/c54398e688fbb7c4f5fc53e7bf253b975143f00e))
* retry manifest compare-and-swap conflicts ([#232](https://github.com/Ludy87/cache-the-planet/issues/232)) ([67b05a8](https://github.com/Ludy87/cache-the-planet/commit/67b05a8b31c6f14aefff270eed22e4ae3bd67849))
* run integration tests after distribution build ([#132](https://github.com/Ludy87/cache-the-planet/issues/132)) ([f1770dc](https://github.com/Ludy87/cache-the-planet/commit/f1770dc4168e0d29541a692e81a3178dd44554c0))
* run multi-cache in integration suites ([#133](https://github.com/Ludy87/cache-the-planet/issues/133)) ([aa0a98e](https://github.com/Ludy87/cache-the-planet/commit/aa0a98e6b95623304dc151be3842c7fa5cab16d3))
* satisfy actionlint secret context rules ([fca0ba1](https://github.com/Ludy87/cache-the-planet/commit/fca0ba17cc23c69269caebe94f638ab5238bcb20))
* **security:** allow Cargo package key fixtures ([#234](https://github.com/Ludy87/cache-the-planet/issues/234)) ([77ad40d](https://github.com/Ludy87/cache-the-planet/commit/77ad40d863077162260c10d7cc03e18381ab2780))
* **security:** allow credential-like cargo example fixtures ([#236](https://github.com/Ludy87/cache-the-planet/issues/236)) ([dc1cb59](https://github.com/Ludy87/cache-the-planet/commit/dc1cb59464a6cff7212c0685a22f478c81cdd60e))
* **security:** allow credential-like package source names ([c1a1e83](https://github.com/Ludy87/cache-the-planet/commit/c1a1e83cc05b9628335175fa1ae10bac3646ea84))
* **security:** allow harmless Cargo rsa examples ([#215](https://github.com/Ludy87/cache-the-planet/issues/215)) ([19009d1](https://github.com/Ludy87/cache-the-planet/commit/19009d1a0dfcb428bf8372a0a443fee35af7c2d0))
* **security:** allow harmless Cargo source filenames ([#214](https://github.com/Ludy87/cache-the-planet/issues/214)) ([1ecb69e](https://github.com/Ludy87/cache-the-planet/commit/1ecb69ed00184992b42500c7cd09746d637b409e))
* **security:** allow npm package lock metadata ([1192434](https://github.com/Ludy87/cache-the-planet/commit/1192434b193ecebfebbe9ded9d173bfc01f58af2))
* **security:** allow npm package lock metadata ([#240](https://github.com/Ludy87/cache-the-planet/issues/240)) ([d04079d](https://github.com/Ludy87/cache-the-planet/commit/d04079d90894945029fc055b9fef147f0e206f46))
* **security:** apply excludes before cache scanning ([#211](https://github.com/Ludy87/cache-the-planet/issues/211)) ([3f12a19](https://github.com/Ludy87/cache-the-planet/commit/3f12a199c34bbc6f1f306abb4625d129f19ef8f6))
* **security:** harden fork artifact metadata ([#218](https://github.com/Ludy87/cache-the-planet/issues/218)) ([a8b759c](https://github.com/Ludy87/cache-the-planet/commit/a8b759cdfa9d230c63de572653109a64a060e423))
* **security:** match cargo registry fixture paths ([342f225](https://github.com/Ludy87/cache-the-planet/commit/342f22506d91ee5246b2b5ee6752694f0407f41e))
* **security:** match cargo registry fixture paths ([#239](https://github.com/Ludy87/cache-the-planet/issues/239)) ([e7f07be](https://github.com/Ludy87/cache-the-planet/commit/e7f07be5907646df4ce691a8e5fcd9c6cb4a7777))
* **sftp:** show transfer progress details ([#196](https://github.com/Ludy87/cache-the-planet/issues/196)) ([493fb72](https://github.com/Ludy87/cache-the-planet/commit/493fb72513624d70c9e0ea639c2bc8330882bd32))
* simplify Gradle integration Java setup ([#135](https://github.com/Ludy87/cache-the-planet/issues/135)) ([866a045](https://github.com/Ludy87/cache-the-planet/commit/866a045d0ede8e5a161a4e47c10ba8150f9edd68))
* stale cache security scan bundle ([#250](https://github.com/Ludy87/cache-the-planet/issues/250)) ([0cd9710](https://github.com/Ludy87/cache-the-planet/commit/0cd9710b9bbc6ec073f894532734601f1c02b92b))
* **storage:** detect artifact conflict errors ([#227](https://github.com/Ludy87/cache-the-planet/issues/227)) ([f54b4bc](https://github.com/Ludy87/cache-the-planet/commit/f54b4bcf89fae84ef03ed79d0308396b13959192))
* **storage:** detect artifact conflicts from SDK errors ([2a535ea](https://github.com/Ludy87/cache-the-planet/commit/2a535ea4449dfc1fe222249aa8a77577073cb62a))
* **storage:** preserve artifact part suffix ([#229](https://github.com/Ludy87/cache-the-planet/issues/229)) ([d8fa2de](https://github.com/Ludy87/cache-the-planet/commit/d8fa2dea821eeb5099ccbf5f3a8bbdcf45191c9d))
* **storage:** prevent artifact uploads from using releases ([#235](https://github.com/Ludy87/cache-the-planet/issues/235)) ([35a1d92](https://github.com/Ludy87/cache-the-planet/commit/35a1d92ad004ffd4a6bab59ece141cc8c7f7a177))
* **storage:** reuse duplicate metadata artifacts ([#226](https://github.com/Ludy87/cache-the-planet/issues/226)) ([2ac1c05](https://github.com/Ludy87/cache-the-planet/commit/2ac1c055b75f5e750a9a2cee9e5af31f2003dd53))
* **storage:** reuse duplicate run artifacts ([#225](https://github.com/Ludy87/cache-the-planet/issues/225)) ([df71159](https://github.com/Ludy87/cache-the-planet/commit/df7115993bca5855033e01065572108e61de94ee))
* **storage:** send release make-latest as string ([#224](https://github.com/Ludy87/cache-the-planet/issues/224)) ([99c4a30](https://github.com/Ludy87/cache-the-planet/commit/99c4a30026fbe012104cf5d46b5f3830a18e853e))
* **storage:** set branch part default to 24 mib ([570f5f4](https://github.com/Ludy87/cache-the-planet/commit/570f5f4c8776e1439ea49f1e1a2c0437d24c0b37))
* **storage:** set branch part default to 24 mib ([#206](https://github.com/Ludy87/cache-the-planet/issues/206)) ([7661a84](https://github.com/Ludy87/cache-the-planet/commit/7661a842ae16de3bfcffde2755ed07489ccbc793))
* **storage:** skip missing fork metadata ([6699a07](https://github.com/Ludy87/cache-the-planet/commit/6699a078f9238f8e226d57cd2dfcbb94587857f4))
* **storage:** skip missing fork metadata ([#221](https://github.com/Ludy87/cache-the-planet/issues/221)) ([0ee5e91](https://github.com/Ludy87/cache-the-planet/commit/0ee5e91e18c98dcebfb2bc9bb9ce16cec056d5cb))
* update .gitignore to exclude local agent instructions and skills ([264edcb](https://github.com/Ludy87/cache-the-planet/commit/264edcb530cc449af7ef0f7c80df5f445f35a616))
* use workspace paths for multi-cache integration ([#136](https://github.com/Ludy87/cache-the-planet/issues/136)) ([a52ca16](https://github.com/Ludy87/cache-the-planet/commit/a52ca168733a1c877b4051030de874d50dcf4360))
* validate reusable cache workflows and Dependabot config ([#47](https://github.com/Ludy87/cache-the-planet/issues/47)) ([3a5afb5](https://github.com/Ludy87/cache-the-planet/commit/3a5afb500d1cca53a79592088af62a1c5a98cc04))
* **version:** Revert release metadata to 1.10.0 ([e4f0bac](https://github.com/Ludy87/cache-the-planet/commit/e4f0bac42488ca78f1c7a352951a561d7f2ae004))
* **workflows:** pass manifest path to cleanup ([#181](https://github.com/Ludy87/cache-the-planet/issues/181)) ([5f08a83](https://github.com/Ludy87/cache-the-planet/commit/5f08a83fda8097db262964e113e63fe43b83bd1d))
* **workflows:** separate cache storage publishing ([#176](https://github.com/Ludy87/cache-the-planet/issues/176)) ([18748a4](https://github.com/Ludy87/cache-the-planet/commit/18748a4a5e4c5bc19ec7b274626bc791c17ffc5c))


### ⚡ Performance

* **cache:** reduce redundant GitHub API requests ([#82](https://github.com/Ludy87/cache-the-planet/issues/82)) ([3c7f5db](https://github.com/Ludy87/cache-the-planet/commit/3c7f5dbe67db8e73c9a4502bc14eb5d3b8fa647a))
* Ignore generated example targets ([6c0592a](https://github.com/Ludy87/cache-the-planet/commit/6c0592a7f5bd36df61a037947b9e865578d51d66))
* reduce npm CI network overhead ([#45](https://github.com/Ludy87/cache-the-planet/issues/45)) ([68b527e](https://github.com/Ludy87/cache-the-planet/commit/68b527e6e6be4cf158923af7f81e06adac9469ec))
* **sftp:** retune download transfer settings ([#190](https://github.com/Ludy87/cache-the-planet/issues/190)) ([b58f801](https://github.com/Ludy87/cache-the-planet/commit/b58f801ee19d6e44b5e451cd218fc671abb02565))
* **sftp:** tune transfer performance ([#189](https://github.com/Ludy87/cache-the-planet/issues/189)) ([8f39ced](https://github.com/Ludy87/cache-the-planet/commit/8f39cede8f4f6331f547421325a4138e45184489))


### 📚 Documentation

* add cache scope examples ([#95](https://github.com/Ludy87/cache-the-planet/issues/95)) ([736bc5d](https://github.com/Ludy87/cache-the-planet/commit/736bc5daed94ce16c37025306ca8a9e94a657370))
* add issue report templates ([#57](https://github.com/Ludy87/cache-the-planet/issues/57)) ([8b883df](https://github.com/Ludy87/cache-the-planet/commit/8b883df43ee33c5b444b681a94320c68bf157070))
* add pull request template ([#56](https://github.com/Ludy87/cache-the-planet/issues/56)) ([38d2dd6](https://github.com/Ludy87/cache-the-planet/commit/38d2dd645e24b96127345b3689d05f493287d1e5))
* clarify garbage-collection and cache-key documentation ([#81](https://github.com/Ludy87/cache-the-planet/issues/81)) ([78ba221](https://github.com/Ludy87/cache-the-planet/commit/78ba221aff8c39641a46157293665c7a8867ab3c))
* document action switches and internals ([#103](https://github.com/Ludy87/cache-the-planet/issues/103)) ([b65cee0](https://github.com/Ludy87/cache-the-planet/commit/b65cee09176d0db4e9efa45875978f55e39c3ee2))
* document multi-cache usage ([#137](https://github.com/Ludy87/cache-the-planet/issues/137)) ([3943601](https://github.com/Ludy87/cache-the-planet/commit/3943601eb9386e8cc12ad56e59bfe15a3dd848b0))
* document Node.js and dependency requirements ([49eec7c](https://github.com/Ludy87/cache-the-planet/commit/49eec7c7d3a7653ea6eebf6488eb9fcbbec6bdf1))
* streamline README and move maintainer guides ([#49](https://github.com/Ludy87/cache-the-planet/issues/49)) ([3ec8cc5](https://github.com/Ludy87/cache-the-planet/commit/3ec8cc5f1530bb1e1a2c97c00d44420d588a93be))
* update third-party notices ([#125](https://github.com/Ludy87/cache-the-planet/issues/125)) ([8f9b00a](https://github.com/Ludy87/cache-the-planet/commit/8f9b00aee1fa9fe43a01d7d098eee1fb1b07d497))


### 🔒 Security

* add dependency audit and SBOM checks ([#63](https://github.com/Ludy87/cache-the-planet/issues/63)) ([60a589f](https://github.com/Ludy87/cache-the-planet/commit/60a589f19906859b711f3256516eb9074d2401d4))
* add trivy repository scan ([#109](https://github.com/Ludy87/cache-the-planet/issues/109)) ([d59f0dd](https://github.com/Ludy87/cache-the-planet/commit/d59f0ddcfe10840e2dde097186ae949d9f4cc60a))
* avoid template injection in cache diagnostics ([#121](https://github.com/Ludy87/cache-the-planet/issues/121)) ([4990611](https://github.com/Ludy87/cache-the-planet/commit/4990611c29f5d824d87e7fcc49d00ee59c4310aa))
* **ci:** harden PR cache handling and reduce workflow permissions ([05c3674](https://github.com/Ludy87/cache-the-planet/commit/05c36749f6b18be6d557c83704eaa5127147f58b))
* **ci:** reduce workflow permissions and avoid redundant PR cache artifacts ([b48fa59](https://github.com/Ludy87/cache-the-planet/commit/b48fa59e468019521021e66ac06c6d03268e4170))
* harden artifact publishing and restore ([#101](https://github.com/Ludy87/cache-the-planet/issues/101)) ([57895d7](https://github.com/Ludy87/cache-the-planet/commit/57895d7451368464af335f23e8d60e5a07e58e53))
* harden cache assets and streaming ([#58](https://github.com/Ludy87/cache-the-planet/issues/58)) ([f6abda0](https://github.com/Ludy87/cache-the-planet/commit/f6abda06e296317e7f86e792919d94dc75439c9f))
* harden cache validation and API requests ([#60](https://github.com/Ludy87/cache-the-planet/issues/60)) ([0bc0e68](https://github.com/Ludy87/cache-the-planet/commit/0bc0e683830faf80389748c57b1b32b4d688522e))
* harden Cargo cache path handling ([#230](https://github.com/Ludy87/cache-the-planet/issues/230)) ([e939864](https://github.com/Ludy87/cache-the-planet/commit/e93986401d28645b1794bb92316fce16f017c910))
* harden Cargo cache path handling ([#230](https://github.com/Ludy87/cache-the-planet/issues/230)) ([f421cba](https://github.com/Ludy87/cache-the-planet/commit/f421cba101325706d009ad86dd10db201b805230))
* harden PR cache workflows and artifact handling ([#44](https://github.com/Ludy87/cache-the-planet/issues/44)) ([1fc40f2](https://github.com/Ludy87/cache-the-planet/commit/1fc40f2bb6e5469e6fe6afbf28ce3e622b5217cb))
* reject workspace links during restore ([#99](https://github.com/Ludy87/cache-the-planet/issues/99)) ([b174b9c](https://github.com/Ludy87/cache-the-planet/commit/b174b9c277568111bcb8fbc9db8894bbaed57ca1))
* remove github-release fallbacks ([#231](https://github.com/Ludy87/cache-the-planet/issues/231)) ([447459f](https://github.com/Ludy87/cache-the-planet/commit/447459f5318906be55d3aa170bf6fd94bb1929f8))
* run Docker example as non-root ([#123](https://github.com/Ludy87/cache-the-planet/issues/123)) ([12794c5](https://github.com/Ludy87/cache-the-planet/commit/12794c537fe628d10c16c9f2dc0a6586900baded))
* **sftp:** remove JSON credential fallbacks ([#207](https://github.com/Ludy87/cache-the-planet/issues/207)) ([06a28be](https://github.com/Ludy87/cache-the-planet/commit/06a28be150c1dfcbb9ed3cc7d7455a84ec61b818))
* use trusted cache-name configuration for PR publishing ([#48](https://github.com/Ludy87/cache-the-planet/issues/48)) ([8d9245c](https://github.com/Ludy87/cache-the-planet/commit/8d9245c72ce2cd60b53634b6450613001c9c52e5))

## [1.10.0](https://github.com/Ludy87/cache-the-planet/compare/v1.9.0...v1.10.0) (2026-09-22)


### 🎉 Features

* **action:** expose cache errors as output ([#182](https://github.com/Ludy87/cache-the-planet/issues/182)) ([d92dd85](https://github.com/Ludy87/cache-the-planet/commit/d92dd85523a33e2892aabffda2a90f88ba84299a))


### 🐛 Bug Fixes

* **action:** allow descriptive cache error outputs ([#184](https://github.com/Ludy87/cache-the-planet/issues/184)) ([8163315](https://github.com/Ludy87/cache-the-planet/commit/816331595214ef3d3ae9d3d7ee95d67331ff1dc1))
* **workflows:** pass manifest path to cleanup ([#181](https://github.com/Ludy87/cache-the-planet/issues/181)) ([1b5455c](https://github.com/Ludy87/cache-the-planet/commit/1b5455c10c317c050984c8890179b0006e1af035))

## [1.9.0](https://github.com/Ludy87/cache-the-planet/compare/v1.8.0...v1.9.0) (2026-09-21)


### 🎉 Features

* **manifest:** support configurable manifest paths ([#179](https://github.com/Ludy87/cache-the-planet/issues/179)) ([57c34b2](https://github.com/Ludy87/cache-the-planet/commit/57c34b29f596cd166b5582aefaec5238d74f4e7a))

## [1.8.0](https://github.com/Ludy87/cache-the-planet/compare/v1.7.0...v1.8.0) (2026-09-21)


### 🎉 Features

* **storage:** add SFTP cache object backend ([#174](https://github.com/Ludy87/cache-the-planet/issues/174)) ([2378162](https://github.com/Ludy87/cache-the-planet/commit/2378162d2c81b8b63d2d224b78a3f6618d898e8c))


### 🐛 Bug Fixes

* **gc:** close SFTP connection after cleanup ([#178](https://github.com/Ludy87/cache-the-planet/issues/178)) ([0b5065f](https://github.com/Ludy87/cache-the-planet/commit/0b5065f169f681a0249cf0bdd25a181869e63731))
* **gc:** delete SFTP objects through storage backend ([#177](https://github.com/Ludy87/cache-the-planet/issues/177)) ([b9f547c](https://github.com/Ludy87/cache-the-planet/commit/b9f547cb8bd855f4f7b5940818156d5c0adf5767))
* **workflows:** separate cache storage publishing ([#176](https://github.com/Ludy87/cache-the-planet/issues/176)) ([58dc78c](https://github.com/Ludy87/cache-the-planet/commit/58dc78cb790ee884df6a2b9e68147b429b8d109c))

## [1.7.0](https://github.com/Ludy87/cache-the-planet/compare/v1.6.0...v1.7.0) (2026-09-18)


### 🎉 Features

* **manifests:** split cache references by scope and pull request ([#166](https://github.com/Ludy87/cache-the-planet/issues/166)) ([1f42a7f](https://github.com/Ludy87/cache-the-planet/commit/1f42a7fd53fca68ba6ee1ced042f5e3b442d2b37))


### 🐛 Bug Fixes

* **cache:** keep PR cache identity stable during publishing ([#157](https://github.com/Ludy87/cache-the-planet/issues/157)) ([5bd7b0b](https://github.com/Ludy87/cache-the-planet/commit/5bd7b0b97f4a766c615c9ca6f3499d3813d2a297))
* **cargo:** align cached paths across shared and PR jobs ([#159](https://github.com/Ludy87/cache-the-planet/issues/159)) ([1588027](https://github.com/Ludy87/cache-the-planet/commit/158802718dcbc77957c780c604c1140b8b507c2c))
* **cargo:** restore shared cache with matching paths ([5d2eb78](https://github.com/Ludy87/cache-the-planet/commit/5d2eb789063e3cc1934b894222fde6f581859c04))
* **ci:** align integration cache paths with cache names ([#163](https://github.com/Ludy87/cache-the-planet/issues/163)) ([b01622f](https://github.com/Ludy87/cache-the-planet/commit/b01622fcc03c96367996a2959e2a0e5683370d87))
* **ci:** correct task cache temp directory path ([#165](https://github.com/Ludy87/cache-the-planet/issues/165)) ([ce5ef0c](https://github.com/Ludy87/cache-the-planet/commit/ce5ef0c96ea53b36df44911f533c5547649454de))
* **ci:** keep Gradle cache paths inside workspace ([#161](https://github.com/Ludy87/cache-the-planet/issues/161)) ([c5fa877](https://github.com/Ludy87/cache-the-planet/commit/c5fa877652a13972a2f5a4ffe1ced9d2d5aad7e8))
* **ci:** use detected Java version for Gradle cache paths ([#151](https://github.com/Ludy87/cache-the-planet/issues/151)) ([2c8921a](https://github.com/Ludy87/cache-the-planet/commit/2c8921a92c830d3c0e3c8a7257b95105f371b56d))
* **ci:** use relative Gradle cache paths ([#162](https://github.com/Ludy87/cache-the-planet/issues/162)) ([538c18e](https://github.com/Ludy87/cache-the-planet/commit/538c18e1c8dd2e30d7e9bfc6e348523326afad71))
* clean up untrusted PR references across manifests ([#170](https://github.com/Ludy87/cache-the-planet/issues/170)) ([c9a952e](https://github.com/Ludy87/cache-the-planet/commit/c9a952e3009a2bad5a2b1c8d939e743e537d2a43))
* **manifests:** allow default read-only manifest lookup ([#167](https://github.com/Ludy87/cache-the-planet/issues/167)) ([a0d6507](https://github.com/Ludy87/cache-the-planet/commit/a0d6507ccc222d0a8aa7086940bb79a018780889))
* **pr:** cleanup untrusted manifests v2 ([#171](https://github.com/Ludy87/cache-the-planet/issues/171)) ([15e22d1](https://github.com/Ludy87/cache-the-planet/commit/15e22d1a4cdd711c839b10ef0e4b01e656496097))
* **restore:** nested cache paths ([#164](https://github.com/Ludy87/cache-the-planet/issues/164)) ([f8e05e0](https://github.com/Ludy87/cache-the-planet/commit/f8e05e0283f392d402188b4fb574945b04e634f0))

## [1.6.0](https://github.com/Ludy87/cache-the-planet/compare/v1.5.0...v1.6.0) (2026-09-16)


### 🎉 Features

* add multi-cache action and integration workflow ([#128](https://github.com/Ludy87/cache-the-planet/issues/128)) ([c90bcf9](https://github.com/Ludy87/cache-the-planet/commit/c90bcf9ea6533d1c2509633af717a23b4ee1924b))
* add multi-cache output lists ([#138](https://github.com/Ludy87/cache-the-planet/issues/138)) ([0012727](https://github.com/Ludy87/cache-the-planet/commit/00127272370d89b74f49a22d6f7b850a34090406))
* derive cache identity from archive inputs ([#143](https://github.com/Ludy87/cache-the-planet/issues/143)) ([d0281dc](https://github.com/Ludy87/cache-the-planet/commit/d0281dc064cf34aa7cec6c52dff842205184308d))
* expose named multi-cache results ([#139](https://github.com/Ludy87/cache-the-planet/issues/139)) ([a1de9ff](https://github.com/Ludy87/cache-the-planet/commit/a1de9ffb10d74c71a1b242c7ec2d7af68da2929f))
* separate restore and save strictness ([#146](https://github.com/Ludy87/cache-the-planet/issues/146)) ([ffc3b17](https://github.com/Ludy87/cache-the-planet/commit/ffc3b170f770b8837093735778eb3dadd09b086a))


### 🐛 Bug Fixes

* bundle shared constants into common action ([#131](https://github.com/Ludy87/cache-the-planet/issues/131)) ([00b5239](https://github.com/Ludy87/cache-the-planet/commit/00b5239c5667a23aa234f9d5b492219af2797df7))
* **ci:** broaden release please workflow triggers ([#126](https://github.com/Ludy87/cache-the-planet/issues/126)) ([2703e01](https://github.com/Ludy87/cache-the-planet/commit/2703e01150821e44a244f00cd3c91d21d24d3eaf))
* **ci:** upload PR cache artifacts only on cache miss ([655a31b](https://github.com/Ludy87/cache-the-planet/commit/655a31bd41c9e5e757192046169d034544b2d0be))
* deduplicate untrusted cache assets ([#153](https://github.com/Ludy87/cache-the-planet/issues/153)) ([78e869c](https://github.com/Ludy87/cache-the-planet/commit/78e869c220c2b12ec7bbef35950ec44bd561b5af))
* keep cache identity out of asset names ([#144](https://github.com/Ludy87/cache-the-planet/issues/144)) ([fa17b58](https://github.com/Ludy87/cache-the-planet/commit/fa17b58a1f31b95ae5be33106404a43dd1398626))
* normalize hyphenated action inputs ([b001661](https://github.com/Ludy87/cache-the-planet/commit/b001661ed3d96736b6cb9cd20f3b94743332cd12))
* normalize hyphenated action inputs ([#147](https://github.com/Ludy87/cache-the-planet/issues/147)) ([3c89bab](https://github.com/Ludy87/cache-the-planet/commit/3c89baba480ce5fa00fa57d6164b92e603e28687))
* pass multi-cache input names correctly ([#129](https://github.com/Ludy87/cache-the-planet/issues/129)) ([669a814](https://github.com/Ludy87/cache-the-planet/commit/669a814b5602a762d3152fd87f2310a7a37f3a38))
* prepare tools before multi-cache restore ([#134](https://github.com/Ludy87/cache-the-planet/issues/134)) ([b638853](https://github.com/Ludy87/cache-the-planet/commit/b6388535163231a4007fff2242b815e7342204e9))
* preserve cache key hash in asset names ([#150](https://github.com/Ludy87/cache-the-planet/issues/150)) ([188f948](https://github.com/Ludy87/cache-the-planet/commit/188f94865e523465bc191bf46d9a1fe7a194ba66))
* publish PR cache artifacts consistently ([#142](https://github.com/Ludy87/cache-the-planet/issues/142)) ([ee217ea](https://github.com/Ludy87/cache-the-planet/commit/ee217ea7baa1b0cfddfe5243195c43a77321e305))
* remove owner and repository from asset names ([#152](https://github.com/Ludy87/cache-the-planet/issues/152)) ([4d17d84](https://github.com/Ludy87/cache-the-planet/commit/4d17d8415c583de483579411ef74caa32fa5c47e))
* replace existing untrusted cache references ([#148](https://github.com/Ludy87/cache-the-planet/issues/148)) ([317baaa](https://github.com/Ludy87/cache-the-planet/commit/317baaa3f52d85b7a2b6acc5157f7b68eeac7876))
* replace updated cache assets ([#149](https://github.com/Ludy87/cache-the-planet/issues/149)) ([957310c](https://github.com/Ludy87/cache-the-planet/commit/957310c341f145eb6465b90fef06068c2eafe3a1))
* restore Cargo cache before toolchain setup ([#124](https://github.com/Ludy87/cache-the-planet/issues/124)) ([9539137](https://github.com/Ludy87/cache-the-planet/commit/9539137b177ecdb665d064c614b6330afa02d570))
* restore shared Docker QEMU cache ([#141](https://github.com/Ludy87/cache-the-planet/issues/141)) ([090466e](https://github.com/Ludy87/cache-the-planet/commit/090466e097fc0519e653b8568d2180db41dcc8e9))
* run integration tests after distribution build ([#132](https://github.com/Ludy87/cache-the-planet/issues/132)) ([df54325](https://github.com/Ludy87/cache-the-planet/commit/df543252ad2db8637dfae27c38f0a5fc6a89147a))
* run multi-cache in integration suites ([#133](https://github.com/Ludy87/cache-the-planet/issues/133)) ([42ef4c9](https://github.com/Ludy87/cache-the-planet/commit/42ef4c9121d2c108b5edce7ed72d8637927448a5))
* simplify Gradle integration Java setup ([#135](https://github.com/Ludy87/cache-the-planet/issues/135)) ([6caac55](https://github.com/Ludy87/cache-the-planet/commit/6caac55b695d82de470b5051d198d10d25bcf866))
* use workspace paths for multi-cache integration ([#136](https://github.com/Ludy87/cache-the-planet/issues/136)) ([e0abaf0](https://github.com/Ludy87/cache-the-planet/commit/e0abaf0af6d1d89dc29332d22731299ee5dfa40c))


### 📚 Documentation

* document multi-cache usage ([#137](https://github.com/Ludy87/cache-the-planet/issues/137)) ([5d79346](https://github.com/Ludy87/cache-the-planet/commit/5d793467fd606d91fd3f37b1bca566735bf8dd39))
* update third-party notices ([#125](https://github.com/Ludy87/cache-the-planet/issues/125)) ([57aa772](https://github.com/Ludy87/cache-the-planet/commit/57aa7720c74842bfaae5ee8d92e2d80846fb17ed))


### 🔒 Security

* **ci:** harden PR cache handling and reduce workflow permissions ([2319617](https://github.com/Ludy87/cache-the-planet/commit/231961755fc95eb0e24cd7b02a3695ea17249f30))
* **ci:** reduce workflow permissions and avoid redundant PR cache artifacts ([2d653bf](https://github.com/Ludy87/cache-the-planet/commit/2d653bfe9ace0d6d1a9b2f7ee3eff5362a26257b))

## [1.5.0](https://github.com/Ludy87/cache-the-planet/compare/v1.4.1...v1.5.0) (2026-09-10)


### 🎉 Features

* add Rust Cargo cache integration ([#104](https://github.com/Ludy87/cache-the-planet/issues/104)) ([e434739](https://github.com/Ludy87/cache-the-planet/commit/e434739b2719bbdb3314c709fb14c2e6e614e38d))


### 🐛 Bug Fixes

* allow stylesheet files in cache scans ([#107](https://github.com/Ludy87/cache-the-planet/issues/107)) ([7171fc9](https://github.com/Ludy87/cache-the-planet/commit/7171fc9ee364d7f86d1aa717274aa24c6f18b77f))
* discover cache configuration automatically ([#105](https://github.com/Ludy87/cache-the-planet/issues/105)) ([e1b34fc](https://github.com/Ludy87/cache-the-planet/commit/e1b34fc09d18ffd691db066788d13d608635c8c4))
* include hidden files in cache artifacts ([#119](https://github.com/Ludy87/cache-the-planet/issues/119)) ([3e10eb7](https://github.com/Ludy87/cache-the-planet/commit/3e10eb7fed84d1d07e90e0c135a2355842bd34ec))
* include hidden Gradle cache files ([#118](https://github.com/Ludy87/cache-the-planet/issues/118)) ([8e2936e](https://github.com/Ludy87/cache-the-planet/commit/8e2936e1511a8f8695ca38446e542525509c95ab))
* pass cache config file to reusable integration workflows ([89b5e76](https://github.com/Ludy87/cache-the-planet/commit/89b5e7624fe654cdb2c3dc2b7b50542674dd4a04))
* point Dependabot to example manifests ([#113](https://github.com/Ludy87/cache-the-planet/issues/113)) ([5e50f2e](https://github.com/Ludy87/cache-the-planet/commit/5e50f2ed43ab9e3d31ef77ea2928cdff7cb3b2a8))
* populate rust cache fixture and align docker asset version ([#106](https://github.com/Ludy87/cache-the-planet/issues/106)) ([fc142e6](https://github.com/Ludy87/cache-the-planet/commit/fc142e6875ba090bfc7a8d35716c42336596eabe))


### ⚡ Performance

* Ignore generated example targets ([d074ec5](https://github.com/Ludy87/cache-the-planet/commit/d074ec5f94ee53392df1891dcba04d83630df029))


### 📚 Documentation

* document action switches and internals ([#103](https://github.com/Ludy87/cache-the-planet/issues/103)) ([db57dff](https://github.com/Ludy87/cache-the-planet/commit/db57dff165cb34f76d392de9eb48fb40bd769f6a))


### 🔒 Security

* add trivy repository scan ([#109](https://github.com/Ludy87/cache-the-planet/issues/109)) ([8a912d7](https://github.com/Ludy87/cache-the-planet/commit/8a912d7129ab7dc82a17db07a1d0d7c314d2298a))
* avoid template injection in cache diagnostics ([#121](https://github.com/Ludy87/cache-the-planet/issues/121)) ([a86a204](https://github.com/Ludy87/cache-the-planet/commit/a86a2048bb058ab8fd3051da0ffc15d60da038b8))
* harden artifact publishing and restore ([#101](https://github.com/Ludy87/cache-the-planet/issues/101)) ([0effe67](https://github.com/Ludy87/cache-the-planet/commit/0effe674a0166f996f3c9b7d0a9510730cdfd8c9))
* reject workspace links during restore ([#99](https://github.com/Ludy87/cache-the-planet/issues/99)) ([d93ea0f](https://github.com/Ludy87/cache-the-planet/commit/d93ea0f22cb4ba7e61883fd184517d85d8a9eedd))
* run Docker example as non-root ([#123](https://github.com/Ludy87/cache-the-planet/issues/123)) ([55fb30a](https://github.com/Ludy87/cache-the-planet/commit/55fb30a9319a6990282996ad5f05b60081b6ac20))

## [1.4.1](https://github.com/Ludy87/cache-the-planet/compare/v1.4.0...v1.4.1) (2026-09-06)


### 🐛 Bug Fixes

* **ci:** use self-repository action syntax ([c5c8d0f](https://github.com/Ludy87/cache-the-planet/commit/c5c8d0fd5d455b1deb54c7618a2a7e12b59f1c15))
* **ci:** use self-repository action syntax ([#98](https://github.com/Ludy87/cache-the-planet/issues/98)) ([ecff773](https://github.com/Ludy87/cache-the-planet/commit/ecff773705093013be23991b54d08a6bb6f02bd7))


### 📚 Documentation

* add cache scope examples ([#95](https://github.com/Ludy87/cache-the-planet/issues/95)) ([92a4971](https://github.com/Ludy87/cache-the-planet/commit/92a49719ad27bac24c19b92a8076914f304f9d62))

## [1.4.0](https://github.com/Ludy87/cache-the-planet/compare/v1.3.2...v1.4.0) (2026-09-06)


### 🎉 Features

* **action:** add automatic post-save caching ([#88](https://github.com/Ludy87/cache-the-planet/issues/88)) ([e1465e8](https://github.com/Ludy87/cache-the-planet/commit/e1465e834611cda5751c63f47dc49b90de131033))
* **action:** add restore sub-action metadata ([#87](https://github.com/Ludy87/cache-the-planet/issues/87)) ([0290141](https://github.com/Ludy87/cache-the-planet/commit/0290141f6d288106a7ee01e90c3f7bc739056bbf))
* **ci:** unify cache post-save and workflow safeguards ([#90](https://github.com/Ludy87/cache-the-planet/issues/90)) ([3e4ff7f](https://github.com/Ludy87/cache-the-planet/commit/3e4ff7fb1f2e73eaa79ca210e3ebc04042a3c567))
* **config:** allow compression level in config ([#89](https://github.com/Ludy87/cache-the-planet/issues/89)) ([bcee523](https://github.com/Ludy87/cache-the-planet/commit/bcee523a3e65093faf9ed82fc8ba105006105f5a))


### 🐛 Bug Fixes

* **action:** expose status outputs during restore ([#93](https://github.com/Ludy87/cache-the-planet/issues/93)) ([ba23430](https://github.com/Ludy87/cache-the-planet/commit/ba23430c229f7eb85dbaf75475ac20719f45c27d))
* **action:** standardize save output names ([#86](https://github.com/Ludy87/cache-the-planet/issues/86)) ([48d6144](https://github.com/Ludy87/cache-the-planet/commit/48d6144e086833dd7de94185f72034ce554a90dd))
* **ci:** avoid broad uv cache restore fallback ([#91](https://github.com/Ludy87/cache-the-planet/issues/91)) ([fdca9f4](https://github.com/Ludy87/cache-the-planet/commit/fdca9f489a7fce833430ad899ae6ae485078cfe7))
* **ci:** enforce strict cache workflow restores ([#94](https://github.com/Ludy87/cache-the-planet/issues/94)) ([4c32e6c](https://github.com/Ludy87/cache-the-planet/commit/4c32e6c75c3363be52d150b6b87fa24ad93ba2fc))
* **ci:** restrict shared uv cache restore ([#92](https://github.com/Ludy87/cache-the-planet/issues/92)) ([20d92ff](https://github.com/Ludy87/cache-the-planet/commit/20d92ff599441f50f3d9c8e52479fca7f7d03b12))
* **restore:** validate archive paths against input ([#84](https://github.com/Ludy87/cache-the-planet/issues/84)) ([36fc9c5](https://github.com/Ludy87/cache-the-planet/commit/36fc9c5796baf789493f38771cc716771192e070))

## [1.3.2](https://github.com/Ludy87/cache-the-planet/compare/v1.3.1...v1.3.2) (2026-09-06)


### 🐛 Bug Fixes

* **ci:** delete published PR cache artifacts ([#78](https://github.com/Ludy87/cache-the-planet/issues/78)) ([3e1c353](https://github.com/Ludy87/cache-the-planet/commit/3e1c353029867251f07c316e1458a3b274803c74))
* **ci:** show encryption and npm test status in step summaries ([#79](https://github.com/Ludy87/cache-the-planet/issues/79)) ([f5e86f8](https://github.com/Ludy87/cache-the-planet/commit/f5e86f8f2b24e186b130015bd2ea67ae841588db))


### ⚡ Performance

* **cache:** reduce redundant GitHub API requests ([#82](https://github.com/Ludy87/cache-the-planet/issues/82)) ([712600e](https://github.com/Ludy87/cache-the-planet/commit/712600e0cec5de8d8373da4c80450638c829a0a0))


### 📚 Documentation

* clarify garbage-collection and cache-key documentation ([#81](https://github.com/Ludy87/cache-the-planet/issues/81)) ([49b5f13](https://github.com/Ludy87/cache-the-planet/commit/49b5f13c4455caabfd77c35d2371a71eed145033))

## [1.3.1](https://github.com/Ludy87/cache-the-planet/compare/v1.3.0...v1.3.1) (2026-09-05)


### 🐛 Bug Fixes

* **ci:** avoid runtime dependency in PR cache publisher ([#77](https://github.com/Ludy87/cache-the-planet/issues/77)) ([1234ed4](https://github.com/Ludy87/cache-the-planet/commit/1234ed4f864bd366c7fceb4454f39cd247b07660))
* **ci:** resolve missing pull request metadata in cache publisher ([#76](https://github.com/Ludy87/cache-the-planet/issues/76)) ([9c8614b](https://github.com/Ludy87/cache-the-planet/commit/9c8614be5af4e672c13c63112aa92b10d3c4ba17))
* **publisher:** export configured cache names ([#74](https://github.com/Ludy87/cache-the-planet/issues/74)) ([2a54d74](https://github.com/Ludy87/cache-the-planet/commit/2a54d74f0c0fa32afbb11a26fb2011c868db4a13))

## [1.3.0](https://github.com/Ludy87/cache-the-planet/compare/v1.2.7...v1.3.0) (2026-09-05)


### 🎉 Features

* configure cache repository and manifest branch ([#68](https://github.com/Ludy87/cache-the-planet/issues/68)) ([d8096a8](https://github.com/Ludy87/cache-the-planet/commit/d8096a8de75a681eeec5940838d6b8a83ec937e1))

## [1.2.7](https://github.com/Ludy87/cache-the-planet/compare/v1.2.6...v1.2.7) (2026-09-05)


### Bug Fixes

* **ci:** use action for floating release tags ([#66](https://github.com/Ludy87/cache-the-planet/issues/66)) ([de6b11c](https://github.com/Ludy87/cache-the-planet/commit/de6b11c61913db4cc3d617087da178c38bbf62d7))

## [1.2.6](https://github.com/Ludy87/cache-the-planet/compare/v1.2.5...v1.2.6) (2026-09-05)


### Bug Fixes

* **ci:** stabilize archive fuzz test and add uncached test job ([#65](https://github.com/Ludy87/cache-the-planet/issues/65)) ([f3909df](https://github.com/Ludy87/cache-the-planet/commit/f3909df7d6a48212d9687f6666799cee1c4997af))


### Security

* add dependency audit and SBOM checks ([#63](https://github.com/Ludy87/cache-the-planet/issues/63)) ([aea21d3](https://github.com/Ludy87/cache-the-planet/commit/aea21d366d2f1291534b03021200c6e26c835b97))

## [1.2.5](https://github.com/Ludy87/cache-the-planet/compare/v1.2.4...v1.2.5) (2026-09-05)


### Bug Fixes

* **ci:** harden release workflow token handling ([#61](https://github.com/Ludy87/cache-the-planet/issues/61)) ([a051ce5](https://github.com/Ludy87/cache-the-planet/commit/a051ce553c63807bb75b6627604b8275c25a3109))


### Security

* harden cache validation and API requests ([#60](https://github.com/Ludy87/cache-the-planet/issues/60)) ([5462103](https://github.com/Ludy87/cache-the-planet/commit/5462103453bd6a4f6289507cff2703cad6841f2e))

## [1.2.4](https://github.com/Ludy87/cache-the-planet/compare/v1.2.3...v1.2.4) (2026-09-05)


### Documentation

* add issue report templates ([#57](https://github.com/Ludy87/cache-the-planet/issues/57)) ([acc6e89](https://github.com/Ludy87/cache-the-planet/commit/acc6e89053cbf2f976c388512ecbdd70eb5beef4))
* add pull request template ([#56](https://github.com/Ludy87/cache-the-planet/issues/56)) ([d96c3a9](https://github.com/Ludy87/cache-the-planet/commit/d96c3a95efe1784e78e99a7565206892fce9bbd7))


### Security

* harden cache assets and streaming ([#58](https://github.com/Ludy87/cache-the-planet/issues/58)) ([29024e6](https://github.com/Ludy87/cache-the-planet/commit/29024e65ec701d6b6627f67d16194149c7f23b39))

## [1.2.3](https://github.com/Ludy87/cache-the-planet/compare/v1.2.2...v1.2.3) (2026-09-05)


### Bug Fixes

* create missing floating release tags ([#54](https://github.com/Ludy87/cache-the-planet/issues/54)) ([cdbc992](https://github.com/Ludy87/cache-the-planet/commit/cdbc9923def4f4373d219818b0cb79328bdb54c8))

## [1.2.2](https://github.com/Ludy87/cache-the-planet/compare/v1.2.1...v1.2.2) (2026-09-05)


### Bug Fixes

* authenticate floating release tag pushes ([#52](https://github.com/Ludy87/cache-the-planet/issues/52)) ([a3008c9](https://github.com/Ludy87/cache-the-planet/commit/a3008c9d8d052b428389c775364f3a2c6f1a0e5f))

## [1.2.1](https://github.com/Ludy87/cache-the-planet/compare/v1.2.0...v1.2.1) (2026-09-05)


### Bug Fixes

* update .gitignore to exclude local agent instructions and skills ([d561ad5](https://github.com/Ludy87/cache-the-planet/commit/d561ad573e2eb90df8ba50f565c3c33096ba8b67))


### Documentation

* streamline README and move maintainer guides ([#49](https://github.com/Ludy87/cache-the-planet/issues/49)) ([4050c70](https://github.com/Ludy87/cache-the-planet/commit/4050c708e2513ce06ba3d8b16445c1499d3f0ea4))


### Security

* use trusted cache-name configuration for PR publishing ([#48](https://github.com/Ludy87/cache-the-planet/issues/48)) ([29398ee](https://github.com/Ludy87/cache-the-planet/commit/29398ee423b61709a7faa84b844d04f03e4e3e87))

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
