## [1.2.1](https://github.com/alrayyes/washing-instructions/compare/v1.2.0...v1.2.1) (2026-08-14)

### Bug Fixes

* stop the no-iron card repeating itself down the page ([#27](https://github.com/alrayyes/washing-instructions/issues/27)) ([da99fef](https://github.com/alrayyes/washing-instructions/commit/da99fefe13a107ca301994af04eb87a4afdb42f9))

## [1.2.0](https://github.com/alrayyes/washing-instructions/compare/v1.1.1...v1.2.0) (2026-08-13)

### Features

* add microfibre towels to the chart ([848101a](https://github.com/alrayyes/washing-instructions/commit/848101a55828d8a9ed368168d05621f42147edc4))
* set the reference sheet to fit rather than spill ([37fe04e](https://github.com/alrayyes/washing-instructions/commit/37fe04e71fb86fe67541d1acadadd87b318b65a4))

### Bug Fixes

* **release:** actually set LEFTHOOK=0 on the push ([#17](https://github.com/alrayyes/washing-instructions/issues/17)) ([851aa28](https://github.com/alrayyes/washing-instructions/commit/851aa28b10540055ba51bf30bf212183d7162b7d)), closes [#16](https://github.com/alrayyes/washing-instructions/issues/16)
* **release:** push the changelog with the hooks turned off ([#16](https://github.com/alrayyes/washing-instructions/issues/16)) ([25d91df](https://github.com/alrayyes/washing-instructions/commit/25d91df79103d16f062616c94f5d6e6141c57492)), closes [#12](https://github.com/alrayyes/washing-instructions/issues/12) [#14](https://github.com/alrayyes/washing-instructions/issues/14) [#15](https://github.com/alrayyes/washing-instructions/issues/15)

## [1.1.1](https://github.com/alrayyes/washing-instructions/compare/v1.1.0...v1.1.1) (2026-08-12)

### Bug Fixes

* **release:** write notes that list what landed ([#9](https://github.com/alrayyes/washing-instructions/issues/9)) ([ba7184d](https://github.com/alrayyes/washing-instructions/commit/ba7184d693a8310826bc161e1d9d74c3a09ea293))

## [1.1.0](https://github.com/alrayyes/washing-instructions/compare/v1.0.0...v1.1.0) (2026-08-11)

### Features

* **ci:** publish the container image, and build it before trusting it ([eb961ff](https://github.com/alrayyes/washing-instructions/commit/eb961ff0030dc390f2c6e850edd481d518d8688b))

### Bug Fixes

* **ci:** run the image as the user that owns the mount ([b976e19](https://github.com/alrayyes/washing-instructions/commit/b976e19cb6839b46a868623bc422dd61226e8615))

## 1.0.0 (2026-08-11)

### Features

* describe the appliances and validate the instruction CSV ([22cf6c1](https://github.com/alrayyes/washing-instructions/commit/22cf6c109a9aa33b4cf1e4ca7735d0c9f3109fb7))
* describe the CSV in a schema other tools can read ([2a2ce6e](https://github.com/alrayyes/washing-instructions/commit/2a2ce6eba4f22c2033297c38ac3734c21e1a96c7))
* make the appliances data instead of code ([65f3a00](https://github.com/alrayyes/washing-instructions/commit/65f3a00f8070b25a40675668007142cf22443edd))
* merge cards on the settings rather than on every attribute ([a6d2342](https://github.com/alrayyes/washing-instructions/commit/a6d234216bfe5d6e9acf930c78e75845078fe6f4))
* render the phone and printable PDFs ([c39904b](https://github.com/alrayyes/washing-instructions/commit/c39904bc76f87196ad26873aabd8c48423210315))
* run it in a container ([cc7010c](https://github.com/alrayyes/washing-instructions/commit/cc7010c4a4b3ad245e2ac76a26e6d605a0416ecb)), closes [#10](https://github.com/alrayyes/washing-instructions/issues/10)
* ship a dummy chart and keep your own out of git ([808614a](https://github.com/alrayyes/washing-instructions/commit/808614a1c287f84b45d76f950b954cddbe02c2f2))
* work out which piles can share a drum ([d8ad9be](https://github.com/alrayyes/washing-instructions/commit/d8ad9be0a334b5d31838cb55792b025534f0347a))

### Bug Fixes

* **ci:** install Vale without needing node ([8a1cc18](https://github.com/alrayyes/washing-instructions/commit/8a1cc188ef745e570a08643d513925daa715c641))
* **ci:** let commitlint read the repository it was given ([6f9d42e](https://github.com/alrayyes/washing-instructions/commit/6f9d42efec8480af484e8658985a9bebe5f40f7c))
* **ci:** let vale sync reach GitHub, and pin what it fetches ([4f57746](https://github.com/alrayyes/washing-instructions/commit/4f577461811b09b48b6bb800ae81766888fe1ffb))
* **ci:** make Dependabot's bumps land as Conventional Commits ([c231754](https://github.com/alrayyes/washing-instructions/commit/c2317542a9b7fe0f9eb52704ce6c574f25d6d94d))
* **ci:** release with a token the ruleset lets through ([54a1794](https://github.com/alrayyes/washing-instructions/commit/54a1794ed71906f28fb3e964b39b02d052476d62))
* **ci:** run LTeX on the Java it ships with ([d444d79](https://github.com/alrayyes/washing-instructions/commit/d444d797d10e92586b727d9bbc360b3838f46c58))
* **ci:** run semantic-release on Node, and stop failing without a token ([0dfb127](https://github.com/alrayyes/washing-instructions/commit/0dfb127bc8fc5cd3dafdb5e6308c59bb739d1274))
* **ci:** run Vale on a glibc image ([f72271b](https://github.com/alrayyes/washing-instructions/commit/f72271bf16d7176ca2723e37837e8899cab7f001))
