'use strict';

console.log(`==> Loaded "${__filename}"`)

/**
 * This hook is invoked during installation before a package's dependencies
 * are selected.
 * The `packageJson` parameter is the deserialized package.json
 * contents for the package that is about to be installed.
 * The `context` parameter provides a log() function.
 * The return value is the updated object.
 */
function readPackage(packageJson, context) {
  console.log(`==> Processing "${packageJson.name}" from ${__filename}`);

  // Project-specific overrides can happen here, whereas the "workspace:" rewriting
  // happens in common/temp-split/global-pnpmfile.cjs

  return packageJson;
}

module.exports = {
  hooks: {
    readPackage
  }
};
