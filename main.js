'use strict';
const utils = require('@iobroker/adapter-core');
const {parseIcs,parseManual,resolve,calculate,pruneIcs,pruneManual} = require('./lib/schedule');
const {previewImport,commitImport} = require('./lib/importer');
const {list,mutate} = require('./lib/entries');
class Wastemanager extends utils.Adapter {
    constructor(options = {}) {
        super({...options, name:'wastemanager'});
        this.on('ready', () => this.onReady());
        this.on('stateChange', (id, state) => this.onStateChange(id, state));
        this.on('message', obj => this.onMessage(obj));
        this.on('unload', callback => { if (this.timer) clearInterval(this.timer); callback(); });
    }
    async onMessage(obj) {
        if (!obj || !obj.callback || !['previewImport','commitImport','listEntries','mutateEntry'].includes(obj.command)) return;
        try {
            const instance = await this.getForeignObjectAsync(`system.adapter.${this.namespace}`);
            if (!instance) throw Error('Instanz nicht gefunden');
            const payload = obj.message || {};
            let result;
            if (obj.command === 'listEntries') {
                result = list(instance.native);
            } else if (obj.command === 'mutateEntry') {
                result = mutate(instance.native, payload);
                instance.native.icsText = result.icsText;
                instance.native.manualEntries = result.manualEntries;
                instance.native.importedEntries = resolve(parseIcs(result.icsText).entries, instance.native.bins || require('./lib/default-bins.json')).map(e=>({date:e.date,type:e.type,title:e.title}));
                await this.setForeignObjectAsync(instance._id, instance);
                this.config.icsText = result.icsText;
                this.config.manualEntries = result.manualEntries;
                await this.loadSchedule();
                await this.update();
                result = list(instance.native);
            } else if (obj.command === 'previewImport') {
                result = previewImport(instance.native, payload.text, payload.filename);
            } else {
                result = commitImport(instance.native, payload);
                instance.native.icsText = result.icsText;
                instance.native.manualEntries = result.manualEntries;
                instance.native.importedEntries = resolve(parseIcs(result.icsText).entries, instance.native.bins || require('./lib/default-bins.json')).map(e=>({date:e.date,type:e.type,title:e.title}));
                await this.setForeignObjectAsync(instance._id, instance);
                this.config.icsText = result.icsText;
                this.config.manualEntries = result.manualEntries;
                await this.loadSchedule();
                await this.update();
                result = {added:result.added, replaced:result.replaced, skipped:result.skipped};
            }
            this.sendTo(obj.from, obj.command, {ok:true, result}, obj.callback);
        } catch (e) { this.sendTo(obj.from, obj.command, {ok:false, error:e.message}, obj.callback); }
    }
    async state(id, val, type = 'string', role = 'value', unit = '') {
        await this.setObjectNotExistsAsync(id, {type:'state',common:{name:id,type,role,read:true,write:false,unit},native:{}});
        await this.setStateAsync(id,{val,ack:true});
    }
    async onStateChange(id, state) {
        if (id !== `${this.namespace}.cleanup.trigger` || !state || state.ack || state.val !== true) return;
        try {
            await this.cleanup(true);
            await this.loadSchedule();
            await this.update();
        } catch (e) { this.log.error('Bereinigung fehlgeschlagen: ' + e.message); }
        finally { await this.setStateAsync('cleanup.trigger', {val:false, ack:true}); }
    }
    async cleanup(force = false) {
        if (!force && this.config.autoCleanup === false) return;
        const instance = await this.getForeignObjectAsync(`system.adapter.${this.namespace}`);
        if (!instance) throw Error('Instanzkonfiguration nicht gefunden');
        Object.assign(this.config, instance.native);
        const days = Math.max(0, Math.min(365, Number(this.config.retentionDays ?? 1)));
        const ics = pruneIcs(this.config.icsText, new Date(), days);
        const manual = pruneManual(this.config.manualEntries, new Date(), days);
        const removed = ics.removed + manual.removed;
        if (removed) {
            instance.native.icsText = ics.text;
            instance.native.manualEntries = manual.entries;
            instance.native.importedEntries = resolve(parseIcs(ics.text).entries, instance.native.bins || require('./lib/default-bins.json')).map(e=>({date:e.date,type:e.type,title:e.title}));
            await this.setForeignObjectAsync(instance._id, instance);
            this.config.icsText = ics.text;
            this.config.manualEntries = manual.entries;
            this.log.info(`${removed} abgelaufene Termine dauerhaft entfernt`);
        }
        await this.state('cleanup.lastRemoved', removed, 'number');
        await this.state('cleanup.lastRun', new Date().toISOString(), 'string', 'text');
    }
    async loadSchedule() {
        const cfg = this.config;
        const bins = Array.isArray(cfg.bins) && cfg.bins.length ? cfg.bins : require('./lib/default-bins.json');
        const imported = parseIcs(cfg.icsText);
        const manual = parseManual(cfg.manualEntries);
        this.schedule = resolve([...imported.entries,...manual], bins);
        this.bins = bins;
        this.daysBefore = Math.max(0,Math.min(30,Number(cfg.daysBefore) || 0));
        this.hideHour = Math.max(0,Math.min(24,Number(cfg.hideHour) || 0));
        for (const warning of imported.warnings) this.log.warn(warning);
        await this.state('schedule.json',JSON.stringify(this.schedule),'string','json');
        await this.state('status.imported',imported.entries.length,'number');
        await this.state('status.manual',manual.length,'number');
        await this.state('status.warnings',imported.warnings.join(' | '),'string','text');
    }
    async onReady() {
        try {
            await this.setObjectNotExistsAsync('cleanup.trigger', {type:'state',common:{name:'Abgelaufene Termine jetzt bereinigen',type:'boolean',role:'button',read:true,write:true},native:{}});
            await this.setStateAsync('cleanup.trigger',{val:false,ack:true});
            await this.subscribeStatesAsync('cleanup.trigger');
            await this.cleanup();
            await this.loadSchedule();
            await this.update();
            this.lastCleanupDay = new Date().toDateString();
            this.timer = setInterval(async () => {
                try {
                    const today = new Date().toDateString();
                    if (today !== this.lastCleanupDay) {
                        this.lastCleanupDay = today;
                        await this.cleanup();
                        await this.loadSchedule();
                    }
                    await this.update();
                } catch (e) { this.log.error(String(e)); }
            }, 60000);
            this.log.info(`Abfallmanager gestartet: ${this.schedule.length} Termine, ${this.bins.filter(b=>b.enabled).length} aktive Tonnen`);
        } catch (e) {
            this.log.error('Konfiguration ungültig: ' + (e && e.message || e));
            await this.state('status.error',String(e && e.message || e),'string','text');
        }
    }
    async update() {
        const result = calculate(this.schedule,this.bins,this.daysBefore,this.hideHour);
        await this.state('next.date',result.nextDate,'string','text');
        await this.state('next.daysLeft',result.daysLeft,'number');
        await this.state('next.types',JSON.stringify(result.next.map(e=>e.type)),'string','json');
        await this.state('display.visible',result.visible.length > 0,'boolean','indicator');
        await this.state('display.types',JSON.stringify(result.visible.map(e=>e.type)),'string','json');
        const displayed = result.visible.filter((e,i,a)=>a.findIndex(x=>x.type===e.type)===i).map(e=>({ ...e, image:`/adapter/wastemanager/${e.type}.png` }));
        await this.state('display.json',JSON.stringify(displayed), 'string','json');
        await this.state('display.count',displayed.length,'number');
        // Stable per-bin datapoints for individual VIS widgets. Create states even if inactive.
        for (const bin of this.bins) {
            const id = String(bin.id || '');
            if (!/^[a-z][a-z0-9_-]*$/.test(id)) continue;
            const item = displayed.find(e => e.type === id);
            const next = this.schedule.find(e => e.type === id && e.date >= result.today);
            await this.state(`bins.${id}.visible`,Boolean(item),'boolean','indicator');
            await this.state(`bins.${id}.date`,next ? next.date : '', 'string','text');
            await this.state(`bins.${id}.image`,`/adapter/wastemanager/${id}.png`,'string','text');
        }
    }
}
if (require.main === module) new Wastemanager();
module.exports = Wastemanager;
