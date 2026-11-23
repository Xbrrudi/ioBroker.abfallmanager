import React from 'react';
import { ConfigGeneric } from '@iobroker/json-config';
import model from './model.mjs';
const {previewImport,commitImport,list,mutate}=model;
const css=`.abfall-panel{width:100%;line-height:1.5}.abfall-panel button,.abfall-panel input,.abfall-panel select{font:inherit;padding:8px;margin:4px;border:1px solid #888;border-radius:4px;color:inherit;background:transparent}.abfall-panel button{cursor:pointer}.abfall-panel button:disabled{opacity:.5;cursor:default}.abfall-panel table{width:100%;border-collapse:collapse;table-layout:fixed}.abfall-panel td,.abfall-panel th{padding:8px;border-bottom:1px solid #9996;text-align:left;overflow-wrap:anywhere}.abfall-panel .notice{padding:10px;border:1px solid #888;border-radius:4px;margin:8px 0}.abfall-panel .error{color:#d32f2f}.abfall-panel .fields{display:flex;flex-wrap:wrap;align-items:end;gap:8px}.abfall-panel label{display:inline-flex;flex-direction:column}.abfall-panel h3{margin-bottom:8px}`;
class Base extends ConfigGeneric {
 constructor(props){super(props);this.state={...this.state,error:'',message:''};}
 stage(result){
  const data={...this.props.data,icsText:result.icsText,manualEntries:result.manualEntries};
  // The Admin owns persistence and its existing authenticated connection. No direct writes here.
  this.props.onChange(data);
  this.setState({error:'',message:'Änderungen im Entwurf. Zum dauerhaften Übernehmen oben „Speichern“ wählen.'});
 }
 guard(fn){try{fn();}catch(e){this.setState({error:e.message});}}
 shell(children){return <section className="abfall-panel"><style>{css}</style>{this.state.error&&<p role="alert" className="error">{this.state.error}</p>}{this.state.message&&<p role="status" className="notice">{this.state.message}</p>}{children}</section>;}
}
export class ImportPanel extends Base {
 constructor(props){super(props);this.state={...this.state,preview:null,text:'',decisions:{},all:false,busy:false};}
 async file(file){
  if(!file)return;
  this.setState({busy:true,error:'',message:'',preview:null});
  try{
   if(file.size>5000000)throw Error('ICS-Datei ist zu groß (maximal 5 MB).');
   const text=await file.text();const preview=previewImport(this.props.data,text,file.name);
   this.setState({text,preview,decisions:{},all:false});
  }catch(e){this.setState({error:e.message});}finally{this.setState({busy:false});}
 }
 decide(index,value){const decisions={...this.state.decisions};if(this.state.all){this.state.preview.entries.filter(e=>e.status==='conflict').forEach(e=>decisions[e.index]=value);}else decisions[index]=value;this.setState({decisions});}
 renderItem(error,disabled){
  const p=this.state.preview;const pending=p?.entries.some(e=>e.status==='conflict'&&!this.state.decisions[e.index]);
  return this.shell(<>
   <h3>ICS-Datei direkt importieren</h3><p>Eine Datei auswählen, Vorschau prüfen und in den Entwurf übernehmen. Danach können Sie weitere Dateien ergänzen. Dauerhaft gespeichert wird mit „Speichern“ im Admin.</p>
   <input aria-label="ICS-Datei" type="file" accept=".ics,text/calendar" disabled={disabled||this.state.busy||!!p} onChange={e=>{this.file(e.target.files[0]);e.target.value='';}}/>
   {p&&<><h3>{p.filename}</h3><p>{p.counts.new} neue Termine · {p.counts.duplicates} Duplikate · {p.counts.conflicts} Konflikte</p>
    <label style={{flexDirection:'row'}}><input type="checkbox" checked={this.state.all} onChange={e=>this.setState({all:e.target.checked})}/>Nächste Entscheidung auf alle Konflikte anwenden</label>
    <table><thead><tr><th>Datum</th><th>Tonne / Termin</th><th>Status / Entscheidung</th></tr></thead><tbody>{p.entries.map(e=><tr key={e.index}><td>{e.date}</td><td>{e.type}<br/>{e.title}{e.existing.length>0&&<small style={{display:'block'}}>Vorhanden: {e.existing.map(x=>x.title).join(', ')}</small>}</td><td>{e.status==='duplicate'?'Duplikat – wird übersprungen':e.status==='new'?'Neu':<select aria-label={'Konflikt '+(e.index+1)} value={this.state.decisions[e.index]||''} onChange={x=>this.decide(e.index,x.target.value)}><option value="" disabled>Bitte entscheiden</option><option value="replace">Überschreiben</option><option value="skip">Überspringen</option><option value="add">Ergänzen</option></select>}</td></tr>)}</tbody></table>
    <button disabled={disabled||pending} onClick={()=>this.guard(()=>{this.stage(commitImport(this.props.data,{text:this.state.text,token:p.token,filename:p.filename,decisions:this.state.decisions}));this.setState({preview:null,text:''});})}>Import bestätigen und in Entwurf übernehmen</button>
    <button onClick={()=>this.setState({preview:null,text:'',error:''})}>Import verwerfen</button>
   </>}
  </>);
 }
}
export class CalendarPanel extends Base {
 constructor(props){super(props);this.state={...this.state,editor:null,deleteKey:null,page:0};}
 apply(req){this.guard(()=>{this.stage(mutate(this.props.data,req));this.setState({editor:null,deleteKey:null});});}
 renderItem(error,disabled){
  let data;try{data=list(this.props.data);}catch(e){return this.shell(<p role="alert">{e.message}</p>);}
  const edit=this.state.editor;const page=Math.min(this.state.page,Math.max(0,Math.ceil(data.entries.length/25)-1));
  const bins=this.props.data.bins||[];const field=(name,value)=>this.setState({editor:{...edit,[name]:value}});
  return this.shell(<><h3>Alle Termine / Korrekturen ({data.entries.length})</h3><p>Chronologisch sortiert, einschließlich deaktivierter Tonnen und gespeicherter Streichungen. Ein Datum lässt sich über „Bearbeiten / Verschieben“ ändern.</p>
   <button disabled={disabled||!!edit} onClick={()=>this.setState({editor:{action:'add',date:'',type:bins[0]?.id||'',title:'',token:data.token}})}>Termin hinzufügen</button>
   {edit&&<form onSubmit={e=>{e.preventDefault();this.apply(edit);}}><div className="fields"><label>Datum<input required aria-label="Datum" type="date" value={edit.date} onChange={e=>field('date',e.target.value)}/></label><label>Tonne<select aria-label="Tonne" required value={edit.type} onChange={e=>field('type',e.target.value)}><option value="">Bitte auswählen</option>{bins.map(b=><option key={b.id} value={b.id}>{b.name}</option>)}</select></label><label>Beschreibung<input aria-label="Beschreibung" required value={edit.title} onChange={e=>field('title',e.target.value)}/></label><button type="submit" disabled={disabled}>Änderung bestätigen</button><button type="button" onClick={()=>this.setState({editor:null})}>Abbrechen</button></div></form>}
   <table><thead><tr><th>Datum</th><th>Tonne / Beschreibung</th><th>Quelle / Aktion</th><th>Bearbeiten</th></tr></thead><tbody>{data.entries.slice(page*25,page*25+25).map(e=><tr key={e.key}><td>{e.date}</td><td>{bins.find(b=>b.id===e.type)?.name||e.type||'Nicht zugeordnet'}<br/>{e.title}</td><td>{e.source}{e.action==='cancel'?' / gestrichen':e.action==='move'?' / verschoben von '+e.originalDate:''}</td><td><button disabled={disabled||!!edit} onClick={()=>this.setState({editor:{...e,action:'edit',token:data.token}})}>Bearbeiten / Verschieben</button><button disabled={disabled||!!edit} onClick={()=>this.setState({deleteKey:e.key})}>Löschen</button>{this.state.deleteKey===e.key&&<span>Termin löschen?<button onClick={()=>this.apply({action:'delete',key:e.key,token:data.token})}>Löschen bestätigen</button><button onClick={()=>this.setState({deleteKey:null})}>Abbrechen</button></span>}</td></tr>)}</tbody></table>
   {data.entries.length===0&&<p>Keine Termine vorhanden.</p>}{data.entries.length>25&&<div><button disabled={page===0} onClick={()=>this.setState({page:page-1})}>Zurück</button>Seite {page+1} von {Math.ceil(data.entries.length/25)}<button disabled={(page+1)*25>=data.entries.length} onClick={()=>this.setState({page:page+1})}>Weiter</button></div>}
  </>);
 }
}
export default {ImportPanel,CalendarPanel};
