'use strict';

/**
 * This hook is invoked during installation before a package's dependencies
 * are selected.
 * The `packageJson` parameter is the deserialized package.json
 * contents for the package that is about to be installed.
 * The `context` parameter provides a log() function.
 * The return value is the updated object.
 */
function readPackage(packageJson, context) {
  console.log(`==> Processing ${packageJson.name} from ${__filename}`);
  if (packageJson.name === 'a' || packageJson.name === 'b') {
    for (const dependencyName of Object.keys(packageJson.dependencies || {})) {
      if (dependencyName === 'c' || dependencyName === 'd') {
        const versionSpec = packageJson.dependencies[dependencyName];
        if (/^workspace:/.test(versionSpec)) {
          console.log(`Rewriting "${packageJson.name}" dependencies[${dependencyName}]`);
          packageJson.dependencies[dependencyName] = `link:../${dependencyName}/`;
        }
      }
    }
  }
  return packageJson;
}

module.exports = {
  hooks: {
    readPackage
  }
};
