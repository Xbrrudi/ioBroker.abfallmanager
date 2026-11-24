'use strict';

const assert = require('node:assert/strict');
const { createHash } = require('node:crypto');
const { appendFileSync, readFileSync } = require('node:fs');
const path = require('node:path');
const { setTimeout: wait } = require('node:timers/promises');
const pkg = require('../../package.json');
const lock = require('../../package-lock.json');
const adapter = require('../../io-package.json');

async function main() {
    const mode = process.argv[2];
    const tag = process.env.GITHUB_REF_NAME;
    assert.match(tag, /^v(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)\.(?:0|[1-9]\d*)(?:-[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?$/);
    const version = tag.slice(1);
    for (const value of [pkg.version, lock.version, lock.packages[''].version, adapter.common.version]) {
        assert.equal(value, version, 'Release tag and package versions must match');
    }
    assert.ok(!Object.hasOwn(adapter, 'version'), 'Unexpected top-level io-package.json version');
    if (mode === 'version') return;
    assert.ok(['lookup', 'confirm'].includes(mode), 'Unknown release check');

    const archive = path.join(process.env.RUNNER_TEMP, 'verified-release', `${pkg.name}-${version}.tgz`);
    const integrity = 'sha512-' + createHash('sha512').update(readFileSync(archive)).digest('base64');
    const url = `https://registry.npmjs.org/${pkg.name}/${version}`;
    const attempts = mode === 'confirm' ? 12 : 1;

    for (let attempt = 0; attempt < attempts; attempt++) {
        const response = await fetch(url, {
            headers: { 'cache-control': 'no-cache' },
            signal: AbortSignal.timeout(15_000),
        });
        if (response.ok) {
            const metadata = await response.json();
            assert.equal(metadata.dist?.integrity, integrity, 'npm contains a different archive for this version');
            if (mode === 'lookup') appendFileSync(process.env.GITHUB_OUTPUT, 'published=true\n');
            return;
        }
        assert.equal(response.status, 404, 'Unexpected npm registry response');
        if (mode === 'lookup') {
            appendFileSync(process.env.GITHUB_OUTPUT, 'published=false\n');
            return;
        }
        await wait(5000);
    }
    throw new Error('Published version did not appear in the npm registry');
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
