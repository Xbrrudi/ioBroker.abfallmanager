 'use strict';

const {parseIcs,parseManual,resolve,dayDiff} = require('./schedule');
const {blocks,wrap}=require('./ics-blocks');
function row(block,bins) {
  const parsed=parseIcs(wrap([block])); const e=parsed.entries[0];
  if(!e)return null;
  const r=resolve([e],bins)[0];
  return {...e,type:r?.type||'',block};
}
function hash(cfg) {return JSON.stringify([cfg.icsText||'',cfg.manualEntries||[],cfg.bins||[]]);}
function previewImport(cfg,text,filename='') {
  if(typeof text!=='string'||text.length>5_000_000||!text.includes('BEGIN:VCALENDAR')||!text.includes('END:VCALENDAR'))throw Error('Ungültige oder zu große ICS-Datei');
  const bins=cfg.bins||require('./default-bins.json'); const incoming=blocks(text).map(b=>row(b,bins));
  if(incoming.some(x=>!x))throw Error('ICS enthält einen Termin ohne gültiges Datum oder Titel');
  if(parseIcs(text).warnings.length)throw Error(parseIcs(text).warnings.join('; '));
  const existing=blocks(cfg.icsText).map(b=>row(b,bins)).filter(Boolean);
  const manual=parseManual(cfg.manualEntries);
  const known=new Map();
  for(const x of existing) {const key=x.date+'|'+x.type; if(!known.has(key))known.set(key,[]);known.get(key).push(x);}
  for(const x of manual) {const key=x.date+'|'+x.type;if(!known.has(key))known.set(key,[]);known.get(key).push(x);}
  const entries=incoming.map((x,i)=>{
    const matches=[...new Set([...(known.get(x.date+'|'+x.type)||[]),...existing.filter(y=>x.uid&&y.uid===x.uid)])];
    const exact=matches.some(y=>y.title===x.title&&y.date===x.date&&y.type===x.type) || incoming.slice(0,i).some(y=>y.date===x.date&&y.type===x.type&&y.title===x.title);
    const conflict=matches.length>0 && !exact;
    // Also detect multiple same-type events inside the new file.
    const earlier=incoming.slice(0,i).some(y=>y.date===x.date&&y.type===x.type);
    return {index:i,date:x.date,type:x.type||'unbekannt',title:x.title,uid:x.uid,existing:matches.map(y=>({title:y.title,source:y.source})),status:exact?'duplicate':conflict||earlier?'conflict':'new'};
  });
  return {filename,token:hash(cfg),entries,counts:{total:entries.length,new:entries.filter(x=>x.status==='new').length,conflicts:entries.filter(x=>x.status==='conflict').length,duplicates:entries.filter(x=>x.status==='duplicate').length}};
}
function commitImport(cfg,payload) {
  const {text,token,decisions={}}=payload;
  if(token!==hash(cfg))throw Error('Termine wurden zwischenzeitlich geändert. Bitte Import erneut prüfen.');
  const preview=previewImport(cfg,text,payload.filename); const bins=cfg.bins||[];
  let stored=blocks(cfg.icsText); let manual=Array.isArray(cfg.manualEntries)?[...cfg.manualEntries]:JSON.parse(cfg.manualEntries||'[]');
  const incoming=blocks(text); let added=0,replaced=0,skipped=0;
  for(const e of preview.entries){
    if(e.status==='duplicate'){skipped++;continue;}
    const decision=e.status==='new'?'add':decisions[e.index];
    if(!['add','skip','replace'].includes(decision))throw Error('Konfliktentscheidung fehlt bei Termin '+(e.index+1));
    if(decision==='skip'){skipped++;continue;}
    if(decision==='replace') {
      const same=x=>(e.uid&&x?.uid===e.uid)||(x?.date===e.date && (x?.type||'unbekannt')===e.type);
      stored=stored.filter(b=>!same(row(b,bins)));
      manual=manual.filter(x=>!same(x));
      replaced++;
    }
    stored.push(incoming[e.index]);added++;
  }
  return {icsText:wrap(stored,cfg.icsText || text),manualEntries:manual,added,replaced,skipped};
}
module.exports={previewImport,commitImport};
