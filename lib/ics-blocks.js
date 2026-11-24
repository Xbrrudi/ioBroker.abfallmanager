'use strict';
function blocks(text){const out=[];let b=null;for(const line of String(text||'').replace(/\r\n?/g,'\n').replace(/\n[ \t]/g,'').split('\n')){if(line==='BEGIN:VEVENT')b=[line];else if(b){b.push(line);if(line==='END:VEVENT'){out.push(b.join('\n'));b=null;}}}return out;}
function wrap(b,original=''){
 if(original.includes('BEGIN:VCALENDAR')){
  const metadata=String(original).replace(/\r\n?/g,'\n').replace(/BEGIN:VEVENT\n[\s\S]*?END:VEVENT\n?/g,'');
  return metadata.replace('END:VCALENDAR',b.join('\n')+'\nEND:VCALENDAR');
 }
 return 'BEGIN:VCALENDAR\nVERSION:2.0\nPRODID:-//ioBroker//Waste Manager//DE\n'+b.join('\n')+'\nEND:VCALENDAR';
}
module.exports={blocks,wrap};
