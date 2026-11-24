var __getOwnPropNames = Object.getOwnPropertyNames;
var __commonJS = (cb, mod) => function __require() {
  try {
    return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
  } catch (e) {
    throw mod = 0, e;
  }
};

// lib/schedule.js
var require_schedule = __commonJS({
  "lib/schedule.js"(exports, module) {
    "use strict";
    function parseIcs(input) {
      const lines = String(input || "").replace(/\r\n?/g, "\n").split("\n");
      const unfolded = [];
      for (const line of lines) {
        if (/^[ \t]/.test(line) && unfolded.length) unfolded[unfolded.length - 1] += line.slice(1);
        else unfolded.push(line);
      }
      const entries = [];
      const warnings = [];
      let event = null;
      for (const line of unfolded) {
        if (line === "BEGIN:VEVENT") {
          event = {};
          continue;
        }
        if (line === "END:VEVENT") {
          if (event) {
            const date = dateFromIcs(event.DTSTART);
            if (date && event.SUMMARY) entries.push({ date, title: event.SUMMARY, uid: event.UID || "", source: "ics", type: event["X-ABFALLMANAGER-TYPE"] || "" });
            else warnings.push("VEVENT ohne g\xFCltiges DTSTART oder SUMMARY");
            if (event.RRULE) warnings.push("RRULE nicht unterst\xFCtzt: " + (event.UID || event.SUMMARY || "Termin"));
          }
          event = null;
          continue;
        }
        if (!event) continue;
        const colon = line.indexOf(":");
        if (colon < 0) continue;
        const key = line.slice(0, colon).split(";")[0].toUpperCase();
        const val = line.slice(colon + 1).replace(/\\,/g, ",").replace(/\\n/gi, " ").replace(/\\;/g, ";").replace(/\\\\/g, "\\");
        if (["DTSTART", "SUMMARY", "UID", "RRULE", "X-ABFALLMANAGER-TYPE"].includes(key)) event[key] = val;
      }
      return { entries, warnings };
    }
    function dateFromIcs(raw) {
      const m = /^(\d{4})(\d{2})(\d{2})/.exec(String(raw || ""));
      if (!m) return null;
      const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
      const x = new Date(y, mo - 1, d);
      if (x.getFullYear() !== y || x.getMonth() !== mo - 1 || x.getDate() !== d) return null;
      return `${m[1]}-${m[2]}-${m[3]}`;
    }
    function validDate(s) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
      return dateFromIcs(String(s).replace(/-/g, "")) === s;
    }
    function parseManual(input) {
      const value = typeof input === "string" ? JSON.parse(input || "[]") : input ?? [];
      if (!Array.isArray(value)) throw Error("Manuelle Termine m\xFCssen ein JSON-Array sein");
      return value.map((item, index) => {
        const action = String(item?.action || "add");
        if (!["add", "cancel", "move"].includes(action) || !validDate(item?.date) || !String(item?.type || "").trim() || action === "move" && !validDate(item?.originalDate)) {
          throw Error("Ung\xFCltiger manueller Termin an Position " + (index + 1));
        }
        return {
          date: item.date,
          type: String(item.type),
          title: String(item.title || item.type),
          action,
          originalDate: action === "move" ? item.originalDate : "",
          source: "manual"
        };
      });
    }
    function resolve(entries, bins) {
      const typed = entries.map((e) => {
        let type = e.type;
        if (!type) {
          const name = String(e.title || "").toLocaleLowerCase("de-DE");
          const match = bins.find((b) => String(b.keywords || "").split(",").some((k) => k.trim() && name.includes(k.trim().toLocaleLowerCase("de-DE"))));
          type = match && match.id;
        }
        return { ...e, type };
      }).filter((e) => e.type && bins.some((b) => b.id === e.type));
      const map = /* @__PURE__ */ new Map();
      for (const e of typed.filter((e2) => e2.source !== "manual")) map.set(e.date + "|" + e.type + "|" + e.title, e);
      for (const e of typed.filter((e2) => e2.source === "manual")) {
        if (e.action === "cancel") {
          for (const k of map.keys()) if (k.startsWith(e.date + "|" + e.type + "|")) map.delete(k);
        } else if (e.action === "move") {
          for (const k of map.keys()) if (k.startsWith(e.originalDate + "|" + e.type + "|")) map.delete(k);
          map.set(e.date + "|" + e.type + "|" + e.title, e);
        } else map.set(e.date + "|" + e.type + "|manual", e);
      }
      return [...map.values()].map((e) => ({ date: e.date, type: e.type, title: e.title, source: e.source })).sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
    }
    function dayDiff(date, now) {
      const [y, m, d] = date.split("-").map(Number);
      return Math.round((Date.UTC(y, m - 1, d) - Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())) / 864e5);
    }
    function calculate(schedule, bins, daysBefore, hideHour, now = /* @__PURE__ */ new Date()) {
      const active = new Set(bins.filter((b) => b.enabled).map((b) => b.id));
      const upcoming = schedule.filter((e) => active.has(e.type) && (dayDiff(e.date, now) > 0 || dayDiff(e.date, now) === 0 && now.getHours() < hideHour));
      const nextDate = upcoming.length ? upcoming[0].date : "";
      const next = upcoming.filter((e) => e.date === nextDate);
      const visible = upcoming.filter((e) => e.date === nextDate).filter((e) => {
        const days = dayDiff(e.date, now);
        return days >= 0 && days <= daysBefore;
      });
      return { today: `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`, nextDate, next, visible, daysLeft: nextDate ? dayDiff(nextDate, now) : -1 };
    }
    function pruneIcs(input, now = /* @__PURE__ */ new Date(), retentionDays = 1) {
      const source = String(input || "");
      if (!source.trim()) return { text: source, removed: 0 };
      const lines = source.replace(/\r\n?/g, "\n").split("\n");
      const output = [];
      let block = null;
      let removed = 0;
      for (const line of lines) {
        if (line === "BEGIN:VEVENT") {
          block = [line];
          continue;
        }
        if (block) {
          block.push(line);
          if (line === "END:VEVENT") {
            const start = block.find((l) => /^DTSTART(?:;[^:]*)?:/.test(l));
            const date = start && dateFromIcs(start.slice(start.indexOf(":") + 1));
            if (date && dayDiff(date, now) <= -retentionDays) removed++;
            else output.push(...block);
            block = null;
          }
        } else output.push(line);
      }
      if (block) output.push(...block);
      return { text: output.join("\n"), removed };
    }
    function pruneManual(input, now = /* @__PURE__ */ new Date(), retentionDays = 1) {
      const rows = typeof input === "string" ? JSON.parse(input || "[]") : input || [];
      if (!Array.isArray(rows)) throw Error("Manuelle Termine m\xFCssen ein Array sein");
      const entries = rows.filter((row) => !validDate(row.date) || dayDiff(row.date, now) > -retentionDays);
      return { entries, removed: rows.length - entries.length };
    }
    module.exports = { parseIcs, parseManual, resolve, calculate, validDate, dayDiff, pruneIcs, pruneManual };
  }
});

// lib/ics-blocks.js
var require_ics_blocks = __commonJS({
  "lib/ics-blocks.js"(exports, module) {
    "use strict";
    function blocks(text) {
      const out = [];
      let b = null;
      for (const line of String(text || "").replace(/\r\n?/g, "\n").replace(/\n[ \t]/g, "").split("\n")) {
        if (line === "BEGIN:VEVENT") b = [line];
        else if (b) {
          b.push(line);
          if (line === "END:VEVENT") {
            out.push(b.join("\n"));
            b = null;
          }
        }
      }
      return out;
    }
    function wrap(b, original = "") {
      if (original.includes("BEGIN:VCALENDAR")) {
        const metadata = String(original).replace(/\r\n?/g, "\n").replace(/BEGIN:VEVENT\n[\s\S]*?END:VEVENT\n?/g, "");
        return metadata.replace("END:VCALENDAR", b.join("\n") + "\nEND:VCALENDAR");
      }
      return "BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ioBroker//Waste Manager//DE\n" + b.join("\n") + "\nEND:VCALENDAR";
    }
    module.exports = { blocks, wrap };
  }
});

// lib/default-bins.json
var require_default_bins = __commonJS({
  "lib/default-bins.json"(exports, module) {
    module.exports = [
      {
        id: "rest",
        name: "Restabfalltonne",
        keywords: "Restabfall,Restm\xFCll",
        enabled: true,
        color: "#4a4a4a"
      },
      {
        id: "gelb",
        name: "Wertstofftonne",
        keywords: "Wertstoff,Gelbe Tonne,Gelber Sack",
        enabled: true,
        color: "#e8d122"
      },
      {
        id: "bio",
        name: "Biotonne",
        keywords: "Bioabfall,Biotonne",
        enabled: false,
        color: "#81552e"
      },
      {
        id: "papier",
        name: "Papiertonne",
        keywords: "Papier,Pappe",
        enabled: false,
        color: "#2269ae"
      }
    ];
  }
});

// lib/importer.js
var require_importer = __commonJS({
  "lib/importer.js"(exports, module) {
    "use strict";
    var { parseIcs, parseManual, resolve, dayDiff } = require_schedule();
    var { blocks, wrap } = require_ics_blocks();
    function row(block, bins) {
      const parsed = parseIcs(wrap([block]));
      const e = parsed.entries[0];
      if (!e) return null;
      const r = resolve([e], bins)[0];
      return { ...e, type: r?.type || "", block };
    }
    function hash(cfg) {
      return JSON.stringify([cfg.icsText || "", cfg.manualEntries || [], cfg.bins || []]);
    }
    function previewImport(cfg, text, filename = "") {
      if (typeof text !== "string" || text.length > 5e6 || !text.includes("BEGIN:VCALENDAR") || !text.includes("END:VCALENDAR")) throw Error("Ung\xFCltige oder zu gro\xDFe ICS-Datei");
      const bins = cfg.bins || require_default_bins();
      const incoming = blocks(text).map((b) => row(b, bins));
      if (incoming.some((x) => !x)) throw Error("ICS enth\xE4lt einen Termin ohne g\xFCltiges Datum oder Titel");
      if (parseIcs(text).warnings.length) throw Error(parseIcs(text).warnings.join("; "));
      const existing = blocks(cfg.icsText).map((b) => row(b, bins)).filter(Boolean);
      const manual = parseManual(cfg.manualEntries);
      const known = /* @__PURE__ */ new Map();
      for (const x of existing) {
        const key = x.date + "|" + x.type;
        if (!known.has(key)) known.set(key, []);
        known.get(key).push(x);
      }
      for (const x of manual) {
        const key = x.date + "|" + x.type;
        if (!known.has(key)) known.set(key, []);
        known.get(key).push(x);
      }
      const entries = incoming.map((x, i) => {
        const matches = [.../* @__PURE__ */ new Set([...known.get(x.date + "|" + x.type) || [], ...existing.filter((y) => x.uid && y.uid === x.uid)])];
        const exact = matches.some((y) => y.title === x.title && y.date === x.date && y.type === x.type) || incoming.slice(0, i).some((y) => y.date === x.date && y.type === x.type && y.title === x.title);
        const conflict = matches.length > 0 && !exact;
        const earlier = incoming.slice(0, i).some((y) => y.date === x.date && y.type === x.type);
        return { index: i, date: x.date, type: x.type || "unbekannt", title: x.title, uid: x.uid, existing: matches.map((y) => ({ title: y.title, source: y.source })), status: exact ? "duplicate" : conflict || earlier ? "conflict" : "new" };
      });
      return { filename, token: hash(cfg), entries, counts: { total: entries.length, new: entries.filter((x) => x.status === "new").length, conflicts: entries.filter((x) => x.status === "conflict").length, duplicates: entries.filter((x) => x.status === "duplicate").length } };
    }
    function commitImport(cfg, payload) {
      const { text, token, decisions = {} } = payload;
      if (token !== hash(cfg)) throw Error("Termine wurden zwischenzeitlich ge\xE4ndert. Bitte Import erneut pr\xFCfen.");
      const preview = previewImport(cfg, text, payload.filename);
      const bins = cfg.bins || [];
      let stored = blocks(cfg.icsText);
      let manual = Array.isArray(cfg.manualEntries) ? [...cfg.manualEntries] : JSON.parse(cfg.manualEntries || "[]");
      const incoming = blocks(text);
      let added = 0, replaced = 0, skipped = 0;
      for (const e of preview.entries) {
        if (e.status === "duplicate") {
          skipped++;
          continue;
        }
        const decision = e.status === "new" ? "add" : decisions[e.index];
        if (!["add", "skip", "replace"].includes(decision)) throw Error("Konfliktentscheidung fehlt bei Termin " + (e.index + 1));
        if (decision === "skip") {
          skipped++;
          continue;
        }
        if (decision === "replace") {
          const same = (x) => e.uid && x?.uid === e.uid || x?.date === e.date && (x?.type || "unbekannt") === e.type;
          stored = stored.filter((b) => !same(row(b, bins)));
          manual = manual.filter((x) => !same(x));
          replaced++;
        }
        stored.push(incoming[e.index]);
        added++;
      }
      return { icsText: wrap(stored, cfg.icsText || text), manualEntries: manual, added, replaced, skipped };
    }
    module.exports = { previewImport, commitImport };
  }
});

// lib/entries.js
var require_entries = __commonJS({
  "lib/entries.js"(exports, module) {
    "use strict";
    var { parseIcs, parseManual, resolve, validDate } = require_schedule();
    var { blocks, wrap } = require_ics_blocks();
    function token(cfg) {
      return JSON.stringify([cfg.icsText || "", cfg.manualEntries || [], cfg.bins || []]);
    }
    function manualRows(cfg) {
      return typeof cfg.manualEntries === "string" ? JSON.parse(cfg.manualEntries || "[]") : cfg.manualEntries || [];
    }
    function list(cfg) {
      const bins = cfg.bins || require_default_bins();
      const ics = blocks(cfg.icsText).map((block, index) => {
        const e = parseIcs(wrap([block])).entries[0];
        const r = e && resolve([e], bins)[0];
        return e ? { key: "ics:" + index, date: e.date, type: r?.type || "", title: e.title, source: "ICS", action: "add" } : null;
      }).filter(Boolean);
      const manual = manualRows(cfg).map((row, index) => {
        const e = parseManual([row])[0];
        return { ...e, key: "manual:" + index, source: "Manuell" };
      });
      return { token: token(cfg), entries: [...ics, ...manual].sort((a, b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type)) };
    }
    function mutate(cfg, req) {
      if (req.token !== token(cfg)) throw Error("Termine wurden ge\xE4ndert. Bitte neu laden.");
      let ics = blocks(cfg.icsText), manual = manualRows(cfg).map((e) => ({ ...e }));
      if (req.action === "add") {
        const entry = { date: req.date, type: req.type, title: req.title, action: "add" };
        parseManual([entry]);
        manual.push(entry);
      } else {
        const [kind, number] = String(req.key || "").split(":");
        const index = Number(number);
        if (!Number.isInteger(index) || index < 0) throw Error("Ung\xFCltige Termin-ID");
        if (!["delete", "edit"].includes(req.action)) throw Error("Ung\xFCltige Aktion");
        if (kind === "ics" && index < ics.length) {
          if (req.action === "delete") ics.splice(index, 1);
          else {
            if (!validDate(req.date)) throw Error("Ung\xFCltiges Datum");
            const title = String(req.title || "").trim();
            if (!title) throw Error("Beschreibung fehlt");
            const bins = cfg.bins || require_default_bins();
            if (!bins.some((b) => b.id === req.type)) throw Error("Tonnenart fehlt");
            let lines = ics[index].split("\n").filter((l) => !/^(DTSTART|DTEND|DURATION|SUMMARY|X-ABFALLMANAGER-TYPE)(?:;[^:]*)?:/.test(l));
            lines.splice(1, 0, "DTSTART;VALUE=DATE:" + req.date.replace(/-/g, ""), "SUMMARY:" + title.replace(/\\/g, "\\\\").replace(/\n/g, "\\n").replace(/,/g, "\\,").replace(/;/g, "\\;"), "X-ABFALLMANAGER-TYPE:" + req.type);
            ics[index] = lines.join("\n");
          }
        } else if (kind === "manual" && index < manual.length) {
          if (req.action === "delete") manual.splice(index, 1);
          else {
            manual[index] = { ...manual[index], date: req.date, type: req.type, title: req.title };
            parseManual([manual[index]]);
          }
        } else throw Error("Termin nicht gefunden");
      }
      return { icsText: wrap(ics, cfg.icsText), manualEntries: manual };
    }
    module.exports = { list, mutate };
  }
});

// lib/admin-model.js
var require_admin_model = __commonJS({
  "lib/admin-model.js"(exports, module) {
    var { previewImport, commitImport } = require_importer();
    var { list, mutate } = require_entries();
    module.exports = { previewImport, commitImport, list, mutate };
  }
});
export default require_admin_model();
