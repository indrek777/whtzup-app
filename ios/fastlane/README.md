fastlane documentation
----

# Installation

Make sure you have the latest version of the Xcode command line tools installed:

```sh
xcode-select --install
```

For _fastlane_ installation instructions, see [Installing _fastlane_](https://docs.fastlane.tools/#installing-fastlane)

# Available Actions

## iOS

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Push a new beta build to TestFlight

### ios build

```sh
[bundle exec] fastlane ios build
```

Build the app for testing

### ios build_dev

```sh
[bundle exec] fastlane ios build_dev
```

Build the app without code signing (for development)

### ios build_test

```sh
[bundle exec] fastlane ios build_test
```

Build the app without archiving (for testing)

### ios upload_testflight

```sh
[bundle exec] fastlane ios upload_testflight
```

Build and upload to TestFlight

### ios upload_appstore

```sh
[bundle exec] fastlane ios upload_appstore
```

Build and upload to App Store

### ios version

```sh
[bundle exec] fastlane ios version
```

Update version number

### ios clean

```sh
[bundle exec] fastlane ios clean
```

Clean build folder

### ios test

```sh
[bundle exec] fastlane ios test
```

Run tests

### ios setup_codesigning

```sh
[bundle exec] fastlane ios setup_codesigning
```

Setup code signing

### ios setup

```sh
[bundle exec] fastlane ios setup
```

Setup project dependencies

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
