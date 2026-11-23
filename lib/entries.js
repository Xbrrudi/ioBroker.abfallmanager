'use strict';
const {parseIcs,parseManual,resolve,validDate}=require('./schedule');
const {blocks,wrap}=require('./ics-blocks');
function token(cfg){return JSON.stringify([cfg.icsText||'',cfg.manualEntries||[],cfg.bins||[]]);}
function manualRows(cfg){return typeof cfg.manualEntries==='string'?JSON.parse(cfg.manualEntries||'[]'):(cfg.manualEntries||[]);}
function list(cfg){
 const bins=cfg.bins||require('./default-bins.json');
 const ics=blocks(cfg.icsText).map((block,index)=>{const e=parseIcs(wrap([block])).entries[0];const r=e&&resolve([e],bins)[0];return e?{key:'ics:'+index,date:e.date,type:r?.type||'',title:e.title,source:'ICS',action:'add'}:null;}).filter(Boolean);
 const manual=manualRows(cfg).map((row,index)=>{const e=parseManual([row])[0];return {...e,key:'manual:'+index,source:'Manuell'};});
 return {token:token(cfg),entries:[...ics,...manual].sort((a,b)=>a.date.localeCompare(b.date)||a.type.localeCompare(b.type))};
}
function mutate(cfg,req){
 if(req.token!==token(cfg))throw Error('Termine wurden geändert. Bitte neu laden.');
 let ics=blocks(cfg.icsText),manual=manualRows(cfg).map(e=>({...e}));
 if(req.action==='add') {const entry={date:req.date,type:req.type,title:req.title,action:'add'};parseManual([entry]);manual.push(entry);}
 else {
  const [kind,number]=String(req.key||'').split(':');const index=Number(number);
  if(!Number.isInteger(index)||index<0)throw Error('Ungültige Termin-ID');
  if(!['delete','edit'].includes(req.action))throw Error('Ungültige Aktion');
  if(kind==='ics'&&index<ics.length){
   if(req.action==='delete')ics.splice(index,1);
   else {
    if(!validDate(req.date))throw Error('Ungültiges Datum');
    const title=String(req.title||'').trim();if(!title)throw Error('Beschreibung fehlt');
    const bins=cfg.bins||require('./default-bins.json');if(!bins.some(b=>b.id===req.type))throw Error('Tonnenart fehlt');
    // Preserve UID and other event properties; normalize edited pickups to all-day events.
    let lines=ics[index].split('\n').filter(l=>! /^(DTSTART|DTEND|DURATION|SUMMARY|X-ABFALLMANAGER-TYPE)(?:;[^:]*)?:/.test(l));
    lines.splice(1,0,'DTSTART;VALUE=DATE:'+req.date.replace(/-/g,''),'SUMMARY:'+title.replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;'),'X-ABFALLMANAGER-TYPE:'+req.type);
    ics[index]=lines.join('\n');
   }
  }else if(kind==='manual'&&index<manual.length){
   if(req.action==='delete')manual.splice(index,1);
   else {manual[index]={...manual[index],date:req.date,type:req.type,title:req.title};parseManual([manual[index]]);}
  }else throw Error('Termin nicht gefunden');
 }
 return {icsText:wrap(ics,cfg.icsText),manualEntries:manual};
}
module.exports={list,mutate};
