'use strict';
const fs=require('node:fs'); const path=require('node:path');
const root=__dirname;const io=require('./io-package.json');const pkg=require('./package.json');
let failed=false;
function check(label,ok,details=''){console.log(`${ok?'OK':'FEHLER'}  ${label}${details?' — '+details:''}`);if(!ok)failed=true;}
check('Adaptername',pkg.name==='iobroker.abfallmanager');
check('Versionsgleichheit',pkg.version===io.common.version);
for(const f of ['main.js','admin/jsonConfig.json','lib/schedule.js','www/gelb.png','www/rest.png','www/bio.png','www/papier.png']) check(f,fs.existsSync(path.join(root,f)));
const widget=path.join(root,'widgets/abfallmanager/customWidgets.js');
const built=fs.existsSync(widget)&&fs.statSync(widget).size>100;
const registered=Boolean(io.common.visWidgets?.vis2AbfallmanagerWidgets);
check('VIS-2-Registrierung konsistent',!registered || built);
check('VIS-2 ESM-Registrierung',io.common.visWidgets?.vis2AbfallmanagerWidgets?.bundlerType==='module');
check('VIS-2 Module-Federation-Manifest',fs.existsSync(path.join(root,'widgets/abfallmanager/mf-manifest.json')));
console.log(`VIS-2-Build: ${built?'vorhanden':'FEHLT (noch nicht installierbar als natives Widget)'}`);
if(process.argv.includes('--require-widgets'))check('Fertiges VIS-2-Widget erforderlich',built&&registered);
process.exitCode=failed?1:0;
