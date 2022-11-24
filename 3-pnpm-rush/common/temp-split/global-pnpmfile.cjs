"use strict";
// Copyright (c) Microsoft Corporation. All rights reserved. Licensed under the MIT license.
// See LICENSE in the project root for license information.
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _a;
// The "rush install" or "rush update" commands will copy this template to
// "common/temp-split/global-pnpmfile.js" so that it can implement Rush-specific features.
// It reads its input data from "common/temp/pnpmfileSettings.json",
// which includes the path to the user's pnpmfile for the currently selected variant. The pnpmfile is
// required directly by this shim and is called after Rush's transformations are applied.
const path_1 = __importDefault(require("path"));
let settings;
let userPnpmfile;
let semver;
let normalizePath;
// Initialize all external aspects of the pnpmfile shim. When using the shim, settings
// are always expected to be available. Init must be called before running any hook that
// depends on a resource obtained from or related to the settings, and will require modules
// once so they aren't repeatedly required in the hook functions.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function init(context) {
    // Sometimes PNPM may provide us a context arg that doesn't fit spec, ex.:
    // https://github.com/pnpm/pnpm/blob/97c64bae4d14a8c8f05803f1d94075ee29c2df2f/packages/get-context/src/index.ts#L134
    // So we need to normalize the context format before we move on
    if (typeof context !== 'object' || Array.isArray(context)) {
        context = {
            log: (message) => { },
            originalContext: context
        };
    }
    if (!settings) {
        // Initialize the settings from file
        if (!context.splitWorkspacePnpmfileShimSettings) {
            context.splitWorkspacePnpmfileShimSettings = require('./pnpmfileSettings.json');
        }
        settings = context.splitWorkspacePnpmfileShimSettings;
    }
    else if (!context.splitWorkspacePnpmfileShimSettings) {
        // Reuse the already initialized settings
        context.splitWorkspacePnpmfileShimSettings = settings;
    }
    // If a userPnpmfilePath is provided, we expect it to exist
    if (!userPnpmfile && settings.userPnpmfilePath) {
        userPnpmfile = require(settings.userPnpmfilePath);
    }
    // If a semverPath is provided, we expect it to exist
    if (!semver && settings.semverPath) {
        semver = require(settings.semverPath);
    }
    if (!normalizePath && settings.pathNormalizerPath) {
        normalizePath = require(settings.pathNormalizerPath);
    }
    // Return the normalized context
    return context;
}
// Rewrite rush project referenced in split workspace.
// For example: "project-a": "workspace:*" --> "project-a": "link:../../project-a"
function rewriteRushProjectVersions(packageName, dependencies) {
    if (!dependencies) {
        return;
    }
    if (!settings || !normalizePath) {
        throw new Error(`splitWorkspaceGlobalPnpmfileShimSettings not initialized`);
    }
    const splitWorkspaceProject = settings.splitWorkspaceProjects[packageName];
    if (!splitWorkspaceProject) {
        return;
    }
    for (const dependencyName of Object.keys(dependencies)) {
        const currentVersion = dependencies[dependencyName];
        if (currentVersion.startsWith('workspace:')) {
            const workspaceProjectInfo = settings.workspaceProjects[dependencyName];
            if (workspaceProjectInfo) {
                // Case 1. "<package_name>": "workspace:*"
                const relativePath = normalizePath(path_1.default.relative(splitWorkspaceProject.projectRelativeFolder, workspaceProjectInfo.projectRelativeFolder));
                const newVersion = 'link:' + relativePath;
                dependencies[dependencyName] = newVersion;
            }
            else {
                // Case 2. "<alias>": "workspace:<aliased_package_name>@<version>"
                const packageSpec = currentVersion.slice('workspace:'.length);
                const nameEndsAt = packageSpec[0] === '@' ? packageSpec.slice(1).indexOf('@') + 1 : packageSpec.indexOf('@');
                const aliasedPackageName = nameEndsAt > 0 ? packageSpec.slice(0, nameEndsAt) : packageSpec;
                // const depVersion: string = nameEndsAt > 0 ? packageSpec.slice(nameEndsAt + 1) : '';
                const aliasedWorkspaceProjectInfo = settings.workspaceProjects[aliasedPackageName];
                if (aliasedWorkspaceProjectInfo) {
                    const relativePath = normalizePath(path_1.default.relative(splitWorkspaceProject.projectRelativeFolder, aliasedWorkspaceProjectInfo.projectRelativeFolder));
                    const newVersion = 'link:' + relativePath;
                    dependencies[dependencyName] = newVersion;
                }
            }
        }
        else if (currentVersion.startsWith('npm:')) {
            // Case 3. "<alias>": "npm:<package_name>@<dep_version>"
            const packageSpec = currentVersion.slice('npm:'.length);
            const nameEndsAt = packageSpec[0] === '@' ? packageSpec.slice(1).indexOf('@') + 1 : packageSpec.indexOf('@');
            const aliasedPackageName = nameEndsAt > 0 ? packageSpec.slice(0, nameEndsAt) : packageSpec;
            // const depVersion: string = nameEndsAt > 0 ? packageSpec.slice(nameEndsAt + 1) : '';
            const aliasedWorkspaceProjectInfo = settings.workspaceProjects[aliasedPackageName];
            if (aliasedWorkspaceProjectInfo) {
                const relativePath = normalizePath(path_1.default.relative(splitWorkspaceProject.projectRelativeFolder, aliasedWorkspaceProjectInfo.projectRelativeFolder));
                const newVersion = 'link:' + relativePath;
                dependencies[dependencyName] = newVersion;
            }
        }
    }
}
const splitWorkspaceGlobalPnpmfileShim = {
    hooks: {
        // Call the original pnpmfile (if it exists)
        afterAllResolved: (lockfile, context) => {
            var _a;
            context = init(context);
            return ((_a = userPnpmfile === null || userPnpmfile === void 0 ? void 0 : userPnpmfile.hooks) === null || _a === void 0 ? void 0 : _a.afterAllResolved)
                ? userPnpmfile.hooks.afterAllResolved(lockfile, context)
                : lockfile;
        },
        // Rewrite workspace protocol to link protocol for non split workspace projects
        readPackage: (pkg, context) => {
            var _a;
            context = init(context);
            rewriteRushProjectVersions(pkg.name, pkg.dependencies);
            rewriteRushProjectVersions(pkg.name, pkg.devDependencies);
            return ((_a = userPnpmfile === null || userPnpmfile === void 0 ? void 0 : userPnpmfile.hooks) === null || _a === void 0 ? void 0 : _a.readPackage) ? userPnpmfile.hooks.readPackage(pkg, context) : pkg;
        },
        // Call the original pnpmfile (if it exists)
        filterLog: (_a = userPnpmfile === null || userPnpmfile === void 0 ? void 0 : userPnpmfile.hooks) === null || _a === void 0 ? void 0 : _a.filterLog
    }
};
module.exports = splitWorkspaceGlobalPnpmfileShim;
//# sourceMappingURL=SplitWorkspaceGlobalPnpmfileShim.js.map