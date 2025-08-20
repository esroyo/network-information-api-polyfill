### [0.5.0](https://github.com/esroyo/network-information-api-polyfill/compare/v0.4.0...v0.5.0) (2025.08.11)

- feat!: rename option `cfOrigin` to simply `origin`
  ([aa47e05](https://github.com/esroyo/network-information-api-polyfill/commit/aa47e050b898dfd0e90e99eed152893d80df6500))
- chore: correct minified/compressed size
  ([ac03ac0](https://github.com/esroyo/network-information-api-polyfill/commit/ac03ac097aad5636d0740cf45c7b78e85e6f1e3a))

### [0.4.0](https://github.com/esroyo/network-information-api-polyfill/compare/v0.3.1...v0.4.0) (2025.08.10)

- feat!: avoid ES6 class for better minification
  ([76bee9e](https://github.com/esroyo/network-information-api-polyfill/commit/76bee9ebd9e6038c5f8f9400038a74911bae3820))
- feat!: make classifications configurable
  ([7800fad](https://github.com/esroyo/network-information-api-polyfill/commit/7800fad7d8de2202b8ca640b63554f9afe9d978b))

### [0.3.1](https://github.com/esroyo/network-information-api-polyfill/compare/v0.3.0...v0.3.1) (2025.07.30)

- fix: adding a small 50 kbps buffer to the 3g/4g boundary (0.7 → 0.75 Mbps)
  ([df31e9d](https://github.com/esroyo/network-information-api-polyfill/commit/df31e9dc25f596c93e5221be5a68c7ed60b15d2c))

### [0.3.0](https://github.com/esroyo/network-information-api-polyfill/compare/v0.2.2...v0.3.0) (2025.07.30)

- feat: update classification with WICG/netinfo official spec
  ([5a9f42b](https://github.com/esroyo/network-information-api-polyfill/commit/5a9f42bd58a2822ff346d97edf85b3760e055b2b))

### [0.2.2](https://github.com/esroyo/network-information-api-polyfill/compare/v0.2.1...v0.2.2) (2025.07.29)

- fix: avoid fetch call with an object context
  ([bf2a51a](https://github.com/esroyo/network-information-api-polyfill/commit/bf2a51a9094dc5c425f6fd312533300e186c221d))

### [0.2.1](https://github.com/esroyo/network-information-api-polyfill/compare/v0.2.0...v0.2.1) (2025.07.28)

- chore: enable injecton of fetch
  ([078ff27](https://github.com/esroyo/network-information-api-polyfill/commit/078ff27a2c05968fc9aa307ad735fe0fd6c2ab19))

### [0.2.0](https://github.com/esroyo/network-information-api-polyfill/compare/v0.1.2...v0.2.0) (2025.07.27)

- feat: improve the estimation when perf resource is not avail
  ([fee3df3](https://github.com/esroyo/network-information-api-polyfill/commit/fee3df3088adae45941655d51747230e31d43f4e))

### [0.1.2](https://github.com/esroyo/network-information-api-polyfill/compare/v0.1.1...v0.1.2) (2025.07.26)

- fix: allow to work without the Performance "resource" entries available
  ([9e8e6a5](https://github.com/esroyo/network-information-api-polyfill/commit/9e8e6a5855e2c3f3e6d70eed341a9d045699b707))
- fix: make effectiveType more specific
  ([2e6fd04](https://github.com/esroyo/network-information-api-polyfill/commit/2e6fd0417d4030adbd323961565f0c37ea0b1b09))

### [0.1.1](https://github.com/esroyo/network-information-api-polyfill/compare/v0.1.0...v0.1.1) (2025.07.26)

- fix: avoid globalTypeAugmentation error on JSR
  ([e9cc84e](https://github.com/esroyo/network-information-api-polyfill/commit/e9cc84ebe5114652b5feffa2d545d265fe620d20))
- chore: deps into importmap
  ([1acadb0](https://github.com/esroyo/network-information-api-polyfill/commit/1acadb035646ad6dac77e884bb887cc8da29f376))

### [0.1.0](https://github.com/esroyo/network-information-api-polyfill/releases/tag/v0.1.0) (2025.07.25)

- feat: initial release