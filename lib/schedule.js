'use strict';

// ICS date-only and local date-time are interpreted as local collection dates.
// No UTC conversion: a pickup belongs to its stated calendar day.
function parseIcs(input) {
    const lines = String(input || '').replace(/\r\n?/g, '\n').split('\n');
    const unfolded = [];
    for (const line of lines) {
        if (/^[ \t]/.test(line) && unfolded.length) unfolded[unfolded.length - 1] += line.slice(1);
        else unfolded.push(line);
    }
    const entries = [];
    const warnings = [];
    let event = null;
    for (const line of unfolded) {
        if (line === 'BEGIN:VEVENT') { event = {}; continue; }
        if (line === 'END:VEVENT') {
            if (event) {
                const date = dateFromIcs(event.DTSTART);
                if (date && event.SUMMARY) entries.push({date, title: event.SUMMARY, uid: event.UID || '', source: 'ics', type: event['X-ABFALLMANAGER-TYPE'] || ''});
                else warnings.push('VEVENT ohne gültiges DTSTART oder SUMMARY');
                if (event.RRULE) warnings.push('RRULE nicht unterstützt: ' + (event.UID || event.SUMMARY || 'Termin'));
            }
            event = null;
            continue;
        }
        if (!event) continue;
        const colon = line.indexOf(':');
        if (colon < 0) continue;
        const key = line.slice(0, colon).split(';')[0].toUpperCase();
        const val = line.slice(colon + 1).replace(/\\,/g, ',').replace(/\\n/gi, ' ').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
        if (['DTSTART','SUMMARY','UID','RRULE','X-ABFALLMANAGER-TYPE'].includes(key)) event[key] = val;
    }
    return {entries, warnings};
}
function dateFromIcs(raw) {
    const m = /^(\d{4})(\d{2})(\d{2})/.exec(String(raw || ''));
    if (!m) return null;
    const y = Number(m[1]), mo = Number(m[2]), d = Number(m[3]);
    const x = new Date(y, mo - 1, d);
    if (x.getFullYear() !== y || x.getMonth() !== mo - 1 || x.getDate() !== d) return null;
    return `${m[1]}-${m[2]}-${m[3]}`;
}
function validDate(s) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(s))) return false;
    return dateFromIcs(String(s).replace(/-/g,'')) === s;
}
function parseManual(input) {
    const value = typeof input === 'string' ? JSON.parse(input || '[]') : (input ?? []);
    if (!Array.isArray(value)) throw Error('Manuelle Termine müssen ein JSON-Array sein');
    return value.map((item, index) => {
        const action = String(item?.action || 'add');
        if (!['add', 'cancel', 'move'].includes(action) || !validDate(item?.date) || !String(item?.type || '').trim() ||
            (action === 'move' && !validDate(item?.originalDate))) {
            throw Error('Ungültiger manueller Termin an Position ' + (index + 1));
        }
        return {date:item.date, type:String(item.type), title:String(item.title || item.type),
            action, originalDate:action === 'move' ? item.originalDate : '', source:'manual'};
    });
}
function resolve(entries, bins) {
    const typed = entries.map(e => {
        let type = e.type;
        if (!type) {
            const name = String(e.title || '').toLocaleLowerCase('de-DE');
            const match = bins.find(b => String(b.keywords || '').split(',').some(k => k.trim() && name.includes(k.trim().toLocaleLowerCase('de-DE'))));
            type = match && match.id;
        }
        return {...e, type};
    }).filter(e => e.type && bins.some(b => b.id === e.type));
    const map = new Map();
    for (const e of typed.filter(e => e.source !== 'manual')) map.set(e.date + '|' + e.type + '|' + e.title, e);
    // Manual corrections take precedence over imported ICS dates, independent of source order.
    for (const e of typed.filter(e => e.source === 'manual')) {
        if (e.action === 'cancel') { for (const k of map.keys()) if (k.startsWith(e.date + '|' + e.type + '|')) map.delete(k); }
        else if (e.action === 'move') {
            for (const k of map.keys()) if (k.startsWith(e.originalDate + '|' + e.type + '|')) map.delete(k);
            map.set(e.date + '|' + e.type + '|' + e.title, e);
        } else map.set(e.date + '|' + e.type + '|manual', e);
    }
    return [...map.values()].map(e => ({date:e.date,type:e.type,title:e.title,source:e.source}))
        .sort((a,b) => a.date.localeCompare(b.date) || a.type.localeCompare(b.type));
}
function localDay(d) { return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime(); }
function dayDiff(date, now) {
    const [y,m,d] = date.split('-').map(Number);
    return Math.round((Date.UTC(y,m-1,d) - Date.UTC(now.getFullYear(),now.getMonth(),now.getDate())) / 86400000);
}
function calculate(schedule, bins, daysBefore, hideHour, now = new Date()) {
    const active = new Set(bins.filter(b => b.enabled).map(b => b.id));
    const upcoming = schedule.filter(e => active.has(e.type) && (dayDiff(e.date, now) > 0 || (dayDiff(e.date, now) === 0 && now.getHours() < hideHour)));
    const nextDate = upcoming.length ? upcoming[0].date : '';
    const next = upcoming.filter(e => e.date === nextDate);
    const visible = upcoming.filter(e => e.date === nextDate).filter(e => {
        const days = dayDiff(e.date, now);
        return days >= 0 && days <= daysBefore;
    });
    return {today: `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`, nextDate, next, visible, daysLeft: nextDate ? dayDiff(nextDate, now) : -1};
}
// Remove expired VEVENT blocks while retaining the original calendar metadata.
function pruneIcs(input, now = new Date(), retentionDays = 1) {
    const source = String(input || '');
    if (!source.trim()) return {text: source, removed: 0};
    const lines = source.replace(/\r\n?/g, '\n').split('\n');
    const output = [];
    let block = null;
    let removed = 0;
    for (const line of lines) {
        if (line === 'BEGIN:VEVENT') { block = [line]; continue; }
        if (block) {
            block.push(line);
            if (line === 'END:VEVENT') {
                const start = block.find(l => /^DTSTART(?:;[^:]*)?:/.test(l));
                const date = start && dateFromIcs(start.slice(start.indexOf(':') + 1));
                if (date && dayDiff(date, now) <= -retentionDays) removed++;
                else output.push(...block);
                block = null;
            }
        } else output.push(line);
    }
    if (block) output.push(...block);
    return {text: output.join('\n'), removed};
}
function pruneManual(input, now = new Date(), retentionDays = 1) {
    const rows = typeof input === 'string' ? JSON.parse(input || '[]') : (input || []);
    if (!Array.isArray(rows)) throw Error('Manuelle Termine müssen ein Array sein');
    const entries = rows.filter(row => !validDate(row.date) || dayDiff(row.date, now) > -retentionDays);
    return {entries, removed: rows.length - entries.length};
}
module.exports = {parseIcs,parseManual,resolve,calculate,validDate,dayDiff,pruneIcs,pruneManual};
