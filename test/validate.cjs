const fs=require('node:fs');const Ajv=require('ajv');
const ajv=new Ajv({strict:false,allErrors:true});const schema=require('./jsonConfig-schema-admin-8.3.5.json');const config=require('../admin/jsonConfig.json');
if(!ajv.validate(schema,config))throw Error(JSON.stringify(ajv.errors,null,2));
const io=require('../io-package.json');const pkg=require('../package.json');if(io.common.version!==pkg.version)throw Error('Versionsunterschied');
const manifest=require('../admin/custom/mf-manifest.json');if(manifest.name!=='WastemanagerSet')throw Error('Federation-Name');
for(const panel of [config.items.general.items.importPanel,config.items.dates.items.calendar]){if(panel.guiApi!==2)throw Error('GUI API');if(!fs.existsSync('admin/'+panel.url))throw Error('Komponente fehlt');}
if(/"type":\s*"iframe"/.test(JSON.stringify(config)))throw Error('iframe');
console.log('jsonConfig: Admin-8.3.5-Schema gültig; GUI API 2, Manifest und Paketversion korrekt.');
