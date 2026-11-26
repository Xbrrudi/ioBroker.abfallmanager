# ioBroker Waste Manager

[Deutsch](README.de.md)

Waste Manager processes local waste collection calendars. It combines iCalendar (ICS) files with manual entries and publishes collection dates and display states in ioBroker. It requires no vendor-specific hardware.

## Requirements and installation

The adapter requires Node.js 22.19.0 or later, js-controller 7.0.7 or later, and Admin 8.0.0 or later. The optional widget requires VIS 2. The package includes the built Admin components and their Module Federation manifest.

Install the published package from npm. Admission to ioBroker Latest is pending.

```sh
iobroker url iobroker.wastemanager
```

The existing [iobroker.abfallmanager 0.21.7](https://www.npmjs.com/package/iobroker.abfallmanager/v/0.21.7) remains available. Switching to the new name requires a new instance and explicit migration; follow [MIGRATION.md](MIGRATION.md) to retain dates, settings and VIS-2 projects. Do not remove the old instance.

## Configure waste types and collection dates

1. Under **Waste types** (*Tonnenarten*), configure each type's ID, name, comma-separated matching keywords, color and enabled status. The built-in types are residual waste, recyclables, organic waste and paper. Residual waste and recyclables are enabled by default.
2. Under **General / ICS** (*Allgemein / ICS*), choose an ICS file and review the preview. Exact duplicates are skipped. Collections for the same bin on the same day or changed collections with the same UID can require a decision. Replace, skip or add the incoming entry, and optionally apply the same decision to the remaining conflicts. Confirm the import to add the entries to the draft. You can then import more files.
3. Under **Dates / Corrections** (*Termine / Korrekturen*), review imported and manual entries in one chronological list with 25 entries per page. Add, edit, move or delete individual collections. Existing manual cancellations and rescheduling entries remain visible and take effect when the calendar is calculated.
4. Select **Save** or **Save and close** in Admin to persist the draft.

The ICS importer accepts individual `VEVENT` entries, all-day and timed `DTSTART` values, folded lines and escaped text. The date portion of `DTSTART` determines the pickup day. Export recurring events as individual occurrences before importing, since the importer rejects `RRULE`. The per-file limit is 5 MB.

## Remove expired collections

Automatic cleanup runs on startup and on the first minute tick after the local date changes. It permanently removes expired ICS and manual entries while preserving other settings. The default retention is one day, so a collection is removed the following day. A value of 0 removes it on the collection day, and 7 removes it seven calendar days later. Set a retention period from 0 to 365 days or disable automatic cleanup. Set `cleanup.trigger` to `true` to run cleanup immediately, including when automatic cleanup is disabled.

## States and VIS 2

The adapter exposes these states under `wastemanager.N`, where `N` is the instance number.

| States | Contents |
| --- | --- |
| `schedule.json` | Resolved schedule from imported and manual entries |
| `next.date`, `next.daysLeft`, `next.types` | Next collection date, days until collection and waste types due |
| `display.visible`, `display.types`, `display.json`, `display.count` | Visibility, waste types, widget data and the number of bins displayed |
| `bins.<id>.visible`, `bins.<id>.date`, `bins.<id>.image` | Visibility, next date and image path for each configured bin |
| `status.imported`, `status.manual`, `status.warnings`, `status.error` | Import and manual-entry counts, parser warnings and startup configuration errors |
| `cleanup.trigger`, `cleanup.lastRun`, `cleanup.lastRemoved` | Manual cleanup control, last run and number of entries removed |

The visibility window applies to the next pickup date. In **Display in VIS 2** (*Anzeige in VIS 2*), set how many days in advance to display bins (0–30, default 2) and the local hour to hide them on pickup day (0–24, default 18).

Add the native **Waste Manager** widget in the VIS 2 editor. It reads `display.json` through the existing VIS connection. Choose the instance, bin width and height, spacing, shadow, labels, font size and color, and what to show when no bin is due. The four transparent bin images appear from left to right in this order: residual waste, recyclables, organic waste and paper. Visible bins share a baseline and hidden bins take up no space.

The widget draws the images in an SVG at their configured CSS pixel dimensions. A larger VIS frame provides more room, while a smaller frame can clip the content. Resize the frame in the editor as needed. New widgets start at left/top 0%, width 60% and height 35%. Existing widgets retain their styles, including pixel-based positions and dimensions. For affected projects with a frame that jumps when using percentage dimensions, see the separate [VIS 2 compatibility notes](compat/README.md) and [test report](TESTBERICHT.md).

## Development and tests

```sh
npm ci
npm ci --prefix src-admin
npm run build:admin
npm ci --prefix src-widgets-jsvite
npm run build:widgets
npm test
npm run check
npm run test:package
npm run test:integration
npm run preflight:widgets
npm pack
```

The GitHub Actions test workflow validates the package and tests installation, startup and shutdown with js-controller 7.2.5 on Node.js 22, 24 and 26 across Ubuntu, Windows and macOS. The additional `npm run test:browser` and `npm run test:controller` checks use a separate installation pointed to by `IOBROKER_TEST_ROOT`, with Admin 8.3.5 on `127.0.7.1:18081`, js-controller 7.2.5 and a Waste Manager test instance. These checks modify the test instance configuration. Reports go to `TEST_OUTPUT_DIR` or `test-results/`. See the [test report](TESTBERICHT.md) for previous results.

## Releases

See the [release procedure](RENAME-RELEASE.md). Keep `release.yml` disabled in GitHub Actions. Releases use `test-and-release.yml`.


The tag-triggered release workflow checks version metadata, tests, builds, schemas and package contents before publishing the verified archive through npm Trusted Publishing and attaching it to the GitHub release. For a partial workflow failure, use **Re-run failed jobs** to reuse the verified archive from that run. If the npm version already exists, the workflow checks its integrity against the archive.

## Changelog

### 0.21.9

- Require js-controller 7.0.7 or later.
- Complete repository metadata and responsive Admin settings.
- Use compact-mode timers and verify npm provenance in the release workflow.

### 0.21.8

- Rename the adapter, package, Admin and VIS-2 registration to `wastemanager` (English: Waste Manager; German: Abfallmanager), without changing functionality or widget layout.
- Document migration with retained calendars, manual entries, settings and a rollback path; keep the old package available.

### 0.21.7

- Updated `@iobroker/testing` to `^6.3.0` (E0036).
- Removed the top-level version property from `io-package.json` (E1105).
- Automated npm and GitHub releases with a tag-triggered GitHub Actions workflow.

## License

Copyright (c) 2026 Andre Rudat <xbrrudi@gmx.de> and Abfallmanager contributors

[MIT](LICENSE)
