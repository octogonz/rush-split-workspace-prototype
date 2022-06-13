# rush-split-workspace-prototype

## 1. Original PNPM workspace

This workspace contains 4 projects `a`, `b`, `c`, and `d`.

The [.npmrc](./1-pnpm/.npmrc) file specifies `shared-workspace-lockfile=false`, so each project gets its own lockfile.  Each project gets its own split installation of `react`.  The `workspace:*` dependencies are linked using `link:`:

[a/pnpm-lock.yaml](./1-pnpm/a/pnpm-lock.yaml)
```yaml
lockfileVersion: 5.4

specifiers:
  b: workspace:*
  c: workspace:*
  d: workspace:*
  react: '*'

dependencies:
  b: link:../b
  c: link:../c
  d: link:../d
  react: 18.1.0

. . .
```

### Installing and building this example:
```shell
cd 1-pnpm

# Install dependencies
pnpm install --recursive

# Build the projects
pnpm --recursive run build
```

## 2. Two PNPM workspaces

The **2-pnpm-pnpm/new** workspace contains the "leaf" projects `c` and `d`, with `shared-workspace-lockfile=false`.

The **2-pnpm-pnpm/old** workspace contains the "root" projects `a` and `b`, with Rush-style `shared-workspace-lockfile=true`.  The cross-workspace dependencies are handled using `link:` which preserves the original module resolutions from Example 1:

[old/a/package.json](./2-pnpm-pnpm/old/a/package.json)
```js
{
  "name": "a",
  "version": "0.0.0",
  "scripts": {
    "build": "echo Building a"
  },
  "dependencies": {
    "b": "workspace:*",
    "c": "link:../../new/c/",
    "d": "link:../../new/d/",
    "react": "*"
  }
}
```

### Installing and building this example:
```shell
# Stage 1: Install + build the new (shared) workspace (must happen first)
cd 2-pnpm-pnpm/new

pnpm install

# Build the new projects c and d
pnpm --recursive run build

# Stage 2: Install + build the old (split) workspace (must happen second)
cd ../old

pnpm install --recursive

# Build the old projects a and b
pnpm --recursive run build
```

# 3. Recreating this idea with Rush

The **3-pnpm-rush** folder contains a Rush monorepo, whose **rush.json** refers to the "new" projects `c` and `d`.  When you run `rush install` it generates the PNPM workspace in **common/temp/

However a secondary workspace is defined in [common/temp-split/pnpm-workspace.yaml](./3-pnpm-rush/common/temp-split/pnpm-workspace.yaml) with `shared-workspace-lockfile=false`. This secondary workspace manages installation of `a` and `b`.

Note that the **package.json** files use `workspace:*` instead of `link:`:

[a/package.json](./3-pnpm-rush/a/package.json)
```js
{
  "name": "a",
  "version": "0.0.0",
  "scripts": {
    "build": "echo Building a"
  },
  "dependencies": {
    "b": "workspace:*",
    "c": "workspace:*",  // <-- this will get rewritten by .pnpmfile.cjs
    "d": "workspace:*",  // <-- this will get rewritten by .pnpmfile.cjs
    "react": "*"
  }
}
```

The cross-workspace dependencies will get rewritten during installation by [.pnpmfile.cjs](./3-pnpm-rush/a/.pnpmfile.cjs) files.  PNPM's design for `shared-workspace-lockfile=false` requires a separate **.pnpmfile.cjs** in each project folder, but we can probably hook that behavior somehow, to avoid having to copy+paste the **.pnpmfile.cjs** into every project.

### Installing this example:
```shell
# Stage 1: Install the new (shared) workspace using Rush (must happen first)
cd 3-pnpm-rush

# Install dependencies
rush install

# Stage 2: Build the old (split) workspace second using PNPM
cd common/temp-split

# Install dependencies
pnpm install --recursive
```

### Building this example:

Now, temporarily modify **rush.json** to uncomment the entries for old projects `a` and `b`:

[rush.json](./3-pnpm-rush/rush.json)
```
. . .

    {
      "packageName": "a",
      "projectFolder": "a",
      //"splitWorkspace": true
    },
    {
      "packageName": "b",
      "projectFolder": "b",
      //"splitWorkspace": true
    },

    {
      "packageName": "c",
      "projectFolder": "c"
    },
    {
      "packageName": "d",
      "projectFolder": "d"
    }
  ]
. . .
```

Now the `rush build` command will build all four projects, as if they were part of the same workspace:
```shell
rush build
```

## Proposal

- Patch the Rush software so that `rush install` automatically generates and installs the secondary workspace, using `"splitWorkspace": true` to recognize the projects that have not been migrated yet, and thus should be part of the "old" workspace.

- `rush install` will also inject the **.pnpmfile.cjs** workaround to rewrite `workspace:` -> `link:` as appropriate

- Patch the Rush software so that `rush build` considers processes all projects (`a`, `b`, `c`, `d`) as if they belong to a single workspace.

