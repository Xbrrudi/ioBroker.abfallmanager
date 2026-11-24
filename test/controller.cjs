'use strict';
const fs=require('node:fs');const path=require('node:path');const assert=require('node:assert/strict');const {createRequire}=require('node:module');
const reportDir=process.env.TEST_OUTPUT_DIR||path.resolve(process.cwd(),'test-results');fs.mkdirSync(reportDir,{recursive:true});
const initialLogs=new Map();
const runtime=process.env.IOBROKER_TEST_ROOT||path.resolve(__dirname,'../../runtime');const req=createRequire(path.join(runtime,'package.json'));const {Client}=req('@iobroker/db-objects-redis');const {Client:States}=req('@iobroker/db-states-redis');const conf=JSON.parse(fs.readFileSync(path.join(runtime,'iobroker-data/iobroker.json')));const logger={info:()=>{},debug:()=>{},silly:()=>{},warn:console.log,error:console.error};
const {wrap}=require('../lib/ics-blocks');const {parseIcs}=require('../lib/schedule');
const wait=ms=>new Promise(r=>setTimeout(r,ms));
async function until(fn,label){for(let i=0;i<100;i++){if(await fn())return;await wait(250);}throw Error('Timeout '+label);}
(async()=>{
 let db,states;await new Promise(r=>db=new Client({connection:conf.objects,logger,connected:r}));await new Promise(r=>states=new States({connection:conf.states,logger,connected:r}));const read=()=>db.getObjectAsync('system.adapter.wastemanager.0');for(const file of fs.readdirSync(path.join(runtime,'log')).filter(f=>/^iobroker.*\.log$/.test(f)))initialLogs.set(file,fs.readFileSync(path.join(runtime,'log',file),'utf8').length);const checks=[];const ok=s=>{checks.push(s);console.log('OK',s);};
 const day=offset=>{const d=new Date();d.setDate(d.getDate()+offset);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};
 const ics=wrap([-1,0,1].map((offset,i)=>`BEGIN:VEVENT\nUID:cleanup-${i}\nDTSTART;VALUE=DATE:${day(offset).replace(/-/g,'')}\nSUMMARY:Restabfall Cleanup ${i}\nEND:VEVENT`));
 async function config(values){const obj=await read();obj.common.enabled=true;obj.native={...obj.native,...values};await db.setObjectAsync(obj._id,obj);await wait(4500);await until(async()=>!!(await states.getStateAsync('system.adapter.wastemanager.0.alive'))?.val,'alive');}
 try{
 await config({icsText:ics,manualEntries:[{date:day(-1),type:'bio',title:'gestern'},{date:day(1),type:'bio',title:'morgen'}],autoCleanup:true,retentionDays:1,preservedSetting:'cleanup-preserve'});
 await until(async()=>parseIcs((await read()).native.icsText).entries.length===2,'automatische ICS-Bereinigung');let obj=await read();assert.equal(obj.native.manualEntries.length,1);assert.equal(obj.native.manualEntries[0].title,'morgen');assert.equal(obj.native.preservedSetting,'cleanup-preserve');ok('Automatische Bereinigung beim echten Adapterstart: gestrige ICS- und manuelle Termine entfernt, heutige erhalten');
 await until(async()=>{const s=await states.getStateAsync('wastemanager.0.schedule.json');return s&&JSON.parse(s.val).length===3;},'schedule nach Bereinigung');ok('Bereinigter Zeitplan wird in ioBroker-Datenpunkte übernommen');
 await config({icsText:ics,manualEntries:[],retentionDays:7});assert.equal(parseIcs((await read()).native.icsText).entries.length,3);ok('Konfigurierbare Aufbewahrung von sieben Tagen im echten Adapter');
 await config({icsText:ics,manualEntries:[],autoCleanup:false,retentionDays:1});assert.equal(parseIcs((await read()).native.icsText).entries.length,3);ok('Deaktivierte Automatik erhält abgelaufene Termine');
 await states.setStateAsync('wastemanager.0.cleanup.trigger',{val:true,ack:false});await until(async()=>parseIcs((await read()).native.icsText).entries.length===2,'cleanup.trigger');ok('cleanup.trigger bereinigt auf ausdrückliche Anforderung auch bei deaktivierter Automatik');
 const log=fs.readdirSync(path.join(runtime,'log')).filter(f=>/^iobroker.*\.log$/.test(f)).map(f=>fs.readFileSync(path.join(runtime,'log',f),'utf8').slice(initialLogs.get(f)||0)).join('\n');const problems=log.split('\n').filter(l=>/ - (warn|error): wastemanager\.0/.test(l));assert.deepEqual(problems,[]);ok('Keine Warnungen oder Fehler des Abfallmanager-Adapters bei allen realen Starts');
 fs.writeFileSync(path.join(reportDir,'controller-test.json'),JSON.stringify({date:new Date().toISOString(),node:process.version,admin:req('iobroker.admin/package.json').version,controller:req('iobroker.js-controller/package.json').version,checks,problems},null,2));
 }finally{await db.destroy();await states.destroy();}
})().catch(e=>{console.error(e);process.exitCode=1;});

