# Manual switch to ioBroker.wastemanager

This is a rename, not a release. All package versions remain **0.21.7** until a separate version approval. Do not publish this working version or create a tag during the switch. The existing `iobroker.abfallmanager@0.21.7` must remain available; never unpublish it.

## Name checks

Checked on 2026-11-24:

| Destination | Result |
| --- | --- |
| `https://registry.npmjs.org/iobroker.wastemanager` | HTTP 404, no published package |
| `https://api.github.com/repos/Xbrrudi/ioBroker.wastemanager` | HTTP 404, no accessible repository |
| ioBroker Latest `sources-dist.json` | No `wastemanager` key |
| ioBroker Stable `sources-dist-stable.json` | No `wastemanager` key |

Official lists: [Latest](https://github.com/ioBroker/ioBroker.repositories/blob/master/sources-dist.json), [Stable](https://github.com/ioBroker/ioBroker.repositories/blob/master/sources-dist-stable.json). These checks do not reserve names. Recheck immediately before renaming/publishing; stop on a conflict. GitHub can still refuse a name reserved by an inaccessible repository.

## Maintainer procedure (in order)

1. Review PR #2 and its tests. In the current GitHub repository select **Actions → Release → … → Disable workflow** for `release.yml`. Its source now also has no tag trigger and skips its first job, so the retired publisher cannot publish from this branch. The new `test-and-release.yml` additionally requires GitHub's `disabled_manually` state. Cancel any old pending release runs. Do not rerun historic release jobs.
2. Merge PR #2, then verify the tests on `main`. Keep the Node.js 22/24/26 × Ubuntu/Windows/macOS matrix unchanged. The rename has not been tested on the old macOS run; inspect the new run separately.
3. Rename the existing repository through **Settings → General → Repository name** from `ioBroker.abfallmanager` to `ioBroker.wastemanager`. Do not create a replacement repository: renaming keeps issues, PR #2, branches, tags and history. Verify the old repository URL redirects, and check Actions and branch protections afterwards. The new raw icon/README URLs become usable after this step.
4. Update local clones: `git remote set-url origin https://github.com/Xbrrudi/ioBroker.wastemanager.git`. In Codex edit the saved cloud environment's repository selection to the renamed repository (same repository ID `1468844801`), default branch `main`, and update setup scripts, working directory paths and any package/namespace references. Existing checkouts can retain their directory name, but their remote and test commands must use the new name. Recreate the environment if its repository binding cannot be edited. Setup still needs `npm ci`, `npm ci --prefix src-admin`, and `npm ci --prefix src-widgets-jsvite`. Do not automatically install or migrate a user's live ioBroker instance.
5. Obtain separate approval for the first **new** version, then update root `package.json`, root lockfile (including `packages[""]`), `io-package.json`, and the Admin/widget package versions and lockfiles together. Add the approved version to both changelogs and translated `common.news`. Preserve previous news and changelog entries. Do not reuse the old `v0.21.7` tag: it belongs to the old package.
6. Build and verify that approved commit with the commands in README. Use `npm pack --ignore-scripts --pack-destination <empty-directory>` to create the new `iobroker.wastemanager-<approved-version>.tgz`. Inspect the archive and run schema/preflight checks from the extracted package. Keep the verified TGZ: the future tagged workflow checks its integrity against npm.
7. The maintainer performs the **first** publication interactively using their own npm account with package-creation permission: `npm login`, then `npm publish /absolute/path/iobroker.wastemanager-<approved-version>.tgz --access public --registry https://registry.npmjs.org/`. Complete npm's required authentication/2FA. This bootstrap creates the new package so its Trusted Publisher can be configured. Do not place a personal token in this PR or a workflow. Verify `npm view iobroker.wastemanager@<approved-version> dist.integrity` and installation before proceeding.
8. Add the ioBroker maintainer as an npm owner: `npm owner add bluefox iobroker.wastemanager`. Complete any npm authentication/invitation flow and verify with `npm owner ls iobroker.wastemanager`. Use the npm username `bluefox`.
9. On npm, open **iobroker.wastemanager → Settings → Trusted publishing → GitHub Actions**. Set organization/user `Xbrrudi`, repository `ioBroker.wastemanager`, workflow filename `test-and-release.yml`, and leave Environment empty (the workflow declares none). Save and verify the exact spelling. Configure this on the **new** npm package; the old publisher entry does not transfer. Keep token-based automated publishing disabled. Remove the old package's Trusted Publisher once the new path is confirmed.
10. Only after separate release/tag approval, create the new version tag on the approved `main` commit. The workflow should find the bootstrap package with identical integrity, skip publishing, and attach its verified TGZ to the GitHub release. A mismatch must be investigated, never worked around by overwriting npm. Subsequent approved versions use Trusted Publishing. Keep `release.yml` disabled.
11. After successful new-package installation and migration validation, prepare the ioBroker **Latest** submission using key `wastemanager` and metadata/icon URLs under `Xbrrudi/ioBroker.wastemanager`. Stable admission is a separate later process. Do not claim the new name is installable from either list before it is accepted.
12. Only after the new package is available and the migration instructions have been validated, mark the previous package deprecated, for example `npm deprecate 'iobroker.abfallmanager@*' 'Renamed to iobroker.wastemanager. Back up and follow https://github.com/Xbrrudi/ioBroker.wastemanager/blob/main/MIGRATION.md before migrating.'`. Deprecation leaves 0.21.7 installable. Never run `npm unpublish` and never delete old instances as part of this switch.

No repository rename, npm publication, owner change, Trusted Publisher change, deprecation, live migration, release tag, or Codex environment change is performed by this PR.
