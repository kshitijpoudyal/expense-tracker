// The version in app.json changes on every merge (see scripts/bump-version.js). Leaving it out of the
// fingerprint keeps installed builds receiving OTA updates until native code actually changes.
const { SourceSkips } = require('@expo/fingerprint');

/** @type {import('@expo/fingerprint').Config} */
module.exports = {
  sourceSkips: SourceSkips.PackageJsonAndroidAndIosScriptsIfNotContainRun | SourceSkips.ExpoConfigVersions,
};
