#!/usr/bin/env bash
set -euo pipefail

tarball="iobroker.abfallmanager-${GITHUB_REF_NAME#v}.tgz"
archive="$RUNNER_TEMP/verified-release/$tarball"

# The official deploy action checks out a clean tree and publishes the current directory.
# Restore the verified files and check that this directory packs to the same bytes.
# Remove output directories so stale tracked chunks cannot enter the publish package.
rm -rf admin/custom widgets/abfallmanager
tar -xzf "$archive" --strip-components=1
repacked="$(mktemp -d)"
npm pack --ignore-scripts --pack-destination "$repacked"
cmp "$archive" "$repacked/$tarball"
