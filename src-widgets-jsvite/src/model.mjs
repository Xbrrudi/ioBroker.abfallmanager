export const TYPES=['rest','gelb','bio','papier'];
export const NAMES={rest:'Restabfall',gelb:'Wertstoff',bio:'Bio',papier:'Papier'};
export function instanceId(value){const id=String(value||'abfallmanager.0').replace(/^system\.adapter\./,'');return /^abfallmanager\.\d+$/.test(id)?id:'abfallmanager.0';}
export function readDisplay(value){
 if(value===null||value===undefined||value==='')return {entries:[],error:''};
 try{
  const rows=typeof value==='string'?JSON.parse(value):value;
  if(!Array.isArray(rows))throw Error();
  const seen=new Set();const entries=rows.filter(e=>{
   if(!e||!TYPES.includes(e.type)||typeof e.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(e.date)||seen.has(e.type))return false;
   const [y,m,d]=e.date.split('-').map(Number);const date=new Date(y,m-1,d);if(date.getFullYear()!==y||date.getMonth()!==m-1||date.getDate()!==d)return false;
   seen.add(e.type);return true;
  }).map(e=>({type:e.type,date:e.date,title:String(e.title||NAMES[e.type])}));
  return {entries:entries.sort((a,b)=>TYPES.indexOf(a.type)-TYPES.indexOf(b.type)),error:''};
 }catch{return {entries:[],error:'Termindaten sind ungültig.'};}
}
export function daysLeft(date,now=new Date()){
 const [y,m,d]=date.split('-').map(Number);return Math.round((Date.UTC(y,m-1,d)-Date.UTC(now.getFullYear(),now.getMonth(),now.getDate()))/86400000);
}
export function bounded(value,defaultValue,min,max){const num=Number(value??defaultValue);return Number.isFinite(num)?Math.max(min,Math.min(max,num)):defaultValue;}
export function layout(data,count){
 const width=bounded(data.binWidth,120,20,1000),height=bounded(data.binHeight,185,30,1500),gap=bounded(data.binGap,12,0,200);
 return {width,height,gap,totalWidth:Math.max(1,count)*width+Math.max(0,count-1)*gap,fontSize:bounded(data.textSize,14,8,100),shadow:bounded(data.shadowStrength,35,0,100)/100};
}
