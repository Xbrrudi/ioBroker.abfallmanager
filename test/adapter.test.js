'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const {createRequire}=require('node:module');
const localRequire=createRequire(require.resolve('../main'));const {wrap}=require('../lib/ics-blocks');
async function harness(config,initial){
 let clock=initial,tick;const states=new Map(),logs=[];const instance={_id:'system.adapter.wastemanager.0',native:structuredClone(config)};let writes=0;
 class FakeDate extends Date {constructor(...args){super(...(args.length?args:[clock]));}}
 class Adapter{constructor(options){assert.equal(options.name,'wastemanager');this.namespace=options.name+'.0';this.config=structuredClone(config);this.log={warn:m=>logs.push(m),error:m=>logs.push(m),info:()=>{}};}on(event,handler){if(event==='unload')this.unload=handler;}setInterval(fn,delay){assert.equal(delay,60000);tick=fn;return 1;}clearInterval(handle){assert.equal(handle,1);assert.ok(tick);tick=undefined;}async getForeignObjectAsync(){return structuredClone(instance);}async setForeignObjectAsync(id,value){instance.native=structuredClone(value.native);writes++;}async setObjectNotExistsAsync(){}async subscribeStatesAsync(){}async setStateAsync(id,value){states.set(id,value);}}
 const context={require:name=>name==='@iobroker/adapter-core'?{Adapter}:localRequire(name),module:{exports:{}},Date:FakeDate};
 vm.runInNewContext(fs.readFileSync(require.resolve('../main'),'utf8'),context);const adapter=new context.module.exports();await adapter.onReady();return {adapter,states,logs,instance,writes:()=>writes,setTime:v=>clock=v,tick:()=>tick()};
}
test('Täglicher Timer bereinigt genau nach Kalenderwechsel und erhält Einstellungen',async()=>{
 const config=structuredClone(require('../io-package.json').native);config.icsText=wrap(['BEGIN:VEVENT\nDTSTART;VALUE=DATE:20270104\nSUMMARY:Restabfall Grevesmühlen\nEND:VEVENT']);config.customSetting='unverändert';config.manualEntries=[{date:'2027-01-04',type:'rest',title:'Manuell'}];
 const h=await harness(config,new Date(2027,0,4,23,58).getTime());assert.equal(h.writes(),0);h.setTime(new Date(2027,0,4,23,59).getTime());await h.tick();assert.equal(h.writes(),0);h.setTime(new Date(2027,0,5,0,0).getTime());await h.tick();assert.equal(h.writes(),1);
 assert.equal(h.instance.native.manualEntries.length,0);assert.equal(h.instance.native.customSetting,'unverändert');assert.equal(JSON.parse(h.states.get('schedule.json').val).length,0);assert.deepEqual(h.logs,[]);await h.tick();assert.equal(h.writes(),1);
 let callbacks=0;h.adapter.unload(()=>callbacks++);assert.equal(h.adapter.timer,undefined);h.adapter.unload(()=>callbacks++);assert.equal(callbacks,2);
});
test('Deaktivierte Bereinigung lässt gespeicherte Alttermine unverändert',async()=>{
 const cfg=structuredClone(require('../io-package.json').native);cfg.autoCleanup=false;cfg.manualEntries=JSON.stringify([{date:'2020-01-01',type:'rest',title:'Alt'}]);const h=await harness(cfg,new Date(2027,0,4).getTime());assert.equal(h.writes(),0);assert.equal(typeof h.instance.native.manualEntries,'string');assert.deepEqual(h.logs,[]);
});

test('Kopierte Alt-Konfiguration erhält ICS-Typzuweisung, manuelle Korrekturen und Einstellungen',async()=>{
 const config=structuredClone(require('../io-package.json').native);
 config.autoCleanup=false;
 config.icsText='BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ioBroker//Abfallmanager//DE\nBEGIN:VEVENT\nUID:legacy-explicit-type\nDTSTART;VALUE=DATE:20270104\nSUMMARY:Sonderabholung\nX-ABFALLMANAGER-TYPE:papier\nEND:VEVENT\nEND:VCALENDAR';
 config.manualEntries=JSON.stringify([{date:'2027-01-06',originalDate:'2027-01-05',action:'move',type:'rest',title:'Verschoben'},{date:'2020-01-01',type:'bio',title:'Archiv'}]);
 config.importedEntries=[{date:'2027-01-04',type:'papier',title:'Sonderabholung'}];
 config.daysBefore=7;config.hideHour=20;config.retentionDays=30;
 config.bins.forEach(bin=>bin.enabled=true);config.customSetting='keep';
 const original=structuredClone(config);
 const h=await harness(config,new Date(2027,0,3,12).getTime());
 assert.equal(h.writes(),0);assert.deepEqual(h.instance.native,original);assert.deepEqual(config,original);
 assert.equal(require('../lib/schedule').parseIcs(h.instance.native.icsText).entries[0].uid,'legacy-explicit-type');
 const schedule=JSON.parse(h.states.get('schedule.json').val);
 assert.ok(schedule.some(e=>e.date==='2027-01-04'&&e.type==='papier'));
 assert.ok(schedule.some(e=>e.date==='2027-01-06'&&e.type==='rest'));
 assert.ok(schedule.some(e=>e.date==='2020-01-01'&&e.type==='bio'));
 assert.equal(h.states.get('status.imported').val,1);assert.equal(h.states.get('status.manual').val,2);
 assert.equal(h.states.get('bins.papier.image').val,'/adapter/wastemanager/papier.png');
 assert.ok(JSON.parse(h.states.get('display.json').val).every(e=>e.image.startsWith('/adapter/wastemanager/')));
 assert.deepEqual(h.logs,[]);
});
