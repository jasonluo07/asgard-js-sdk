/* eslint-disable @typescript-eslint/explicit-function-return-type */
const fs = require('fs');
const path = require('path');

const semver = require('semver');

const newVersion = process.argv[2]; // e.g. 1.2.3, 1.2.3-beta.1
if (!semver.valid(newVersion)) {
  console.error(
    'Usage: node scripts/bump-version.js <new-version>\n<new-version> must be a valid semver version, e.g. 1.2.3 or 1.2.3-beta.1'
  );
  process.exit(1);
}

const corePath = path.resolve(__dirname, '../packages/core/package.json');
const reactPath = path.resolve(__dirname, '../packages/react/package.json');

function updateVersion(file, newVersion) {
  const pkg = JSON.parse(fs.readFileSync(file, 'utf-8'));
  pkg.version = newVersion;
  fs.writeFileSync(file, JSON.stringify(pkg, null, 2) + '\n');
}

updateVersion(corePath, newVersion);
updateVersion(reactPath, newVersion);

console.log(newVersion); // output for workflow
