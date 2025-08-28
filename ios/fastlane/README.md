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

### ios build_simulator

```sh
[bundle exec] fastlane ios build_simulator
```

Build for iOS Simulator

### ios build_device

```sh
[bundle exec] fastlane ios build_device
```

Build for iOS Device

### ios build_archive

```sh
[bundle exec] fastlane ios build_archive
```

Build and archive for distribution

### ios beta

```sh
[bundle exec] fastlane ios beta
```

Push a new beta build to TestFlight

### ios release

```sh
[bundle exec] fastlane ios release
```

Deploy to App Store

### ios clean

```sh
[bundle exec] fastlane ios clean
```

Clean build artifacts

----

This README.md is auto-generated and will be re-generated every time [_fastlane_](https://fastlane.tools) is run.

More information about _fastlane_ can be found on [fastlane.tools](https://fastlane.tools).

The documentation of _fastlane_ can be found on [docs.fastlane.tools](https://docs.fastlane.tools).
