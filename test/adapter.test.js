'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const vm=require('node:vm');const {createRequire}=require('node:module');
const localRequire=createRequire(require.resolve('../main'));const {wrap}=require('../lib/ics-blocks');
async function harness(config,initial){
 let clock=initial,tick;const states=new Map(),logs=[];const instance={_id:'system.adapter.abfallmanager.0',native:structuredClone(config)};let writes=0;
 class FakeDate extends Date {constructor(...args){super(...(args.length?args:[clock]));}}
 class Adapter{constructor(){this.namespace='abfallmanager.0';this.config=structuredClone(config);this.log={warn:m=>logs.push(m),error:m=>logs.push(m),info:()=>{}};}on(){}async getForeignObjectAsync(){return structuredClone(instance);}async setForeignObjectAsync(id,value){instance.native=structuredClone(value.native);writes++;}async setObjectNotExistsAsync(){}async subscribeStatesAsync(){}async setStateAsync(id,value){states.set(id,value);}}
 const context={require:name=>name==='@iobroker/adapter-core'?{Adapter}:localRequire(name),module:{exports:{}},Date:FakeDate,setInterval:fn=>{tick=fn;return 1;},clearInterval:()=>{}};
 vm.runInNewContext(fs.readFileSync(require.resolve('../main'),'utf8'),context);const adapter=new context.module.exports();await adapter.onReady();return {adapter,states,logs,instance,writes:()=>writes,setTime:v=>clock=v,tick:()=>tick()};
}
test('Täglicher Timer bereinigt genau nach Kalenderwechsel und erhält Einstellungen',async()=>{
 const config=structuredClone(require('../io-package.json').native);config.icsText=wrap(['BEGIN:VEVENT\nDTSTART;VALUE=DATE:20270104\nSUMMARY:Restabfall Grevesmühlen\nEND:VEVENT']);config.customSetting='unverändert';config.manualEntries=[{date:'2027-01-04',type:'rest',title:'Manuell'}];
 const h=await harness(config,new Date(2027,0,4,23,58).getTime());assert.equal(h.writes(),0);h.setTime(new Date(2027,0,4,23,59).getTime());await h.tick();assert.equal(h.writes(),0);h.setTime(new Date(2027,0,5,0,0).getTime());await h.tick();assert.equal(h.writes(),1);assert.equal(h.instance.native.manualEntries.length,0);assert.equal(h.instance.native.customSetting,'unverändert');assert.equal(JSON.parse(h.states.get('schedule.json').val).length,0);assert.deepEqual(h.logs,[]);await h.tick();assert.equal(h.writes(),1);
});
test('Deaktivierte Bereinigung lässt gespeicherte Alttermine unverändert',async()=>{
 const cfg=structuredClone(require('../io-package.json').native);cfg.autoCleanup=false;cfg.manualEntries=JSON.stringify([{date:'2020-01-01',type:'rest',title:'Alt'}]);const h=await harness(cfg,new Date(2027,0,4).getTime());assert.equal(h.writes(),0);assert.equal(typeof h.instance.native.manualEntries,'string');assert.deepEqual(h.logs,[]);
});
