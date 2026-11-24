'use strict';
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');const {createRequire}=require('node:module');const {buildSync}=require('esbuild');
const widgetRequire=createRequire(path.resolve(__dirname,'../src-widgets-jsvite/package.json'));
const compiled=buildSync({entryPoints:[path.resolve(__dirname,'../src-widgets-jsvite/src/WasteBinWidget.jsx')],bundle:true,format:'cjs',platform:'node',external:['react'],loader:{'.png':'dataurl','.svg':'dataurl'},write:false,logLevel:'silent'}).outputFiles[0].text;
const tick=()=>new Promise(r=>setImmediate(r));
function widget({data={},getState=async()=>({val:'[]'}),subscribe}={}){
 const calls={subscribe:[],unsubscribe:[]};const socket={getState,subscribeState:(id,cb)=>{calls.subscribe.push({id,cb});return subscribe?subscribe(id,cb):Promise.resolve();},unsubscribeState:(id,cb)=>calls.unsubscribe.push({id,cb})};
 class Base{constructor(props){this.props=props;const fields=this.constructor.getWidgetInfo().visAttrs.flatMap(g=>g.fields);this.state={rxData:{...Object.fromEntries(fields.map(f=>[f.name,f.default])),...data}};}setState(value){this.state={...this.state,...value};}componentDidMount(){}componentWillUnmount(){}renderWidgetBody(){} }
 const context={require:widgetRequire,module:{exports:{}},exports:{},window:{visRxWidget:Base},setInterval:()=>1,clearInterval:()=>{},console};context.exports=context.module.exports;vm.runInNewContext(compiled,context);const Class=context.module.exports.default;const item=new Class({context:{socket},editMode:false});item.componentDidMount();return {item,calls,Class,socket};
}
const future=[{date:'2027-01-01',type:'rest'},{date:'2027-01-01',type:'gelb'},{date:'2027-01-01',type:'bio'},{date:'2027-01-01',type:'papier'}];
test('VIS-Registrierung: ESM pro Collection, Federation-Namen und Exposes stimmen überein',()=>{const io=require('../io-package.json');const c=io.common.visWidgets.vis2WastemanagerWidgets;assert.equal(c.bundlerType,'module');assert.ok(io.common.restartAdapters.includes('vis-2'));const mf=require('../widgets/wastemanager/mf-manifest.json');assert.equal(mf.name,c.name);assert.deepEqual(mf.exposes.map(e=>e.name).sort(),['WasteBinWidget','translations']);assert.ok(mf.shared.some(e=>e.name==='react/jsx-runtime'&&e.singleton));assert.ok(!fs.existsSync(path.resolve(__dirname,'../widgets/wastemanager/index.html')));});
test('Editor-Schema enthält alle Eigenschaften und echten Instanzselektor',()=>{const {item,Class}=widget();const info=Class.getWidgetInfo();const fields=info.visAttrs.flatMap(g=>g.fields);assert.equal(fields.find(f=>f.name==='instance').type,'instance');assert.equal(fields.find(f=>f.name==='instance').adapter,'wastemanager');for(const name of ['binWidth','binHeight','binGap','showShadow','shadowStrength','showText','textSize','textColor','emptyMode'])assert.ok(fields.some(f=>f.name===name),name);item.componentWillUnmount();});
test('Widget liest und rendert vier gleichzeitig fällige Tonnen',async()=>{const {item}=widget({getState:async()=>({val:JSON.stringify(future)})});await tick();assert.equal(item.state.collections.length,4);const html=widgetRequire('react-dom/server').renderToStaticMarkup(item.renderWidgetBody({}));assert.equal((html.match(/class="wastemanager-bin"/g)||[]).length,4);assert.ok(html.includes('background:transparent'));assert.ok(!html.includes('<iframe'));item.componentWillUnmount();});
test('Live-Updates tauschen die Tonnen ohne Neuladen aus',async()=>{const {item,calls}=widget();await tick();calls.subscribe[0].cb('wastemanager.0.display.json',{val:JSON.stringify(future.slice(0,2))});assert.equal(item.state.collections.length,2);calls.subscribe[0].cb('wastemanager.0.display.json',{val:'[]'});assert.equal(item.renderWidgetBody({}),null);item.componentWillUnmount();});
test('Instanzwechsel meldet alte Subscription ab und ignoriert verspätete Antworten',async()=>{let release;const pending=new Promise(r=>release=r);const {item,calls}=widget({getState:id=>id.startsWith('wastemanager.0')?pending:Promise.resolve({val:JSON.stringify(future.slice(2))})});await tick();item.state.rxData.instance='system.adapter.wastemanager.1';item.onRxDataChanged();await tick();assert.equal(calls.unsubscribe[0].id,'wastemanager.0.display.json');assert.equal(calls.subscribe[1].id,'wastemanager.1.display.json');release({val:JSON.stringify(future.slice(0,1))});await tick();assert.equal(item.state.collections[0].type,'bio');assert.equal(item.state.collections.length,2);item.componentWillUnmount();assert.equal(calls.unsubscribe.at(-1).id,'wastemanager.1.display.json');});
test('Unmount während Subscription erzeugt keine nachträglichen Updates',async()=>{let release;const pending=new Promise(r=>release=r);const {item,calls}=widget({subscribe:()=>pending});item.componentWillUnmount();release();await tick();assert.equal(item.state.collectionLoaded,false);calls.subscribe[0].cb('wastemanager.0.display.json',{val:JSON.stringify(future)});assert.equal(item.state.collections.length,0);assert.ok(calls.unsubscribe.length>=1);});
test('Fehlende Termine: unsichtbar, Hinweis oder Platzhalter; Editorvorschau',async()=>{const {item}=widget();await tick();assert.equal(item.renderWidgetBody({}),null);item.state.rxData.emptyMode='message';assert.equal(item.renderWidgetBody({}).props.role,'status');item.state.rxData.emptyMode='bins';assert.equal(item.renderWidgetBody({}).props['data-preview'],'true');item.state.rxData.emptyMode='hide';item.props.editMode=true;assert.equal(item.renderWidgetBody({}).props['data-preview'],'true');item.componentWillUnmount();});
test('Fehlerhafte Daten führen zu leerem Widget statt Browserabsturz',async()=>{const {item,calls}=widget();await tick();calls.subscribe[0].cb('',{val:'kein JSON'});assert.equal(item.state.collections.length,0);assert.ok(item.state.collectionError);assert.equal(item.renderWidgetBody({}),null);item.componentWillUnmount();});
test('Größe, Abstand, Schatten und Text werden berücksichtigt',async()=>{const {item}=widget({getState:async()=>({val:JSON.stringify(future.slice(0,2))}),data:{binWidth:100,binHeight:160,binGap:20,showShadow:false,showText:true,textSize:20,textColor:'#123456'}});await tick();const html=widgetRequire('react-dom/server').renderToStaticMarkup(item.renderWidgetBody({}));assert.ok(html.includes('<svg'));assert.ok(html.includes('width="100"'));assert.ok(html.includes('height="160"'));assert.ok(html.includes('fill="#123456"'));assert.ok(html.includes('font-size="20"'));assert.ok(html.includes('filter:none'));assert.ok(html.includes('Restabfall'));assert.ok(html.includes('01.01.2027'));item.componentWillUnmount();});
test('Duplikate, ungültige Tonnen und ungültige Datumswerte werden nicht angezeigt',async()=>{const {item}=widget({getState:async()=>({val:JSON.stringify([...future,future[0],{type:'evil',date:'2027-01-01'},{type:'rest',date:'2027-02-30'}])})});await tick();assert.equal(item.state.collections.length,4);item.componentWillUnmount();});
test('Bestehendes Zeitfenster: zwei Tage vorher und Ausblenden ab 18 Uhr',()=>{const {calculate}=require('../lib/schedule');const bins=require('../lib/default-bins.json').map(b=>({...b,enabled:true}));const rows=future.map(e=>({...e,title:e.type}));assert.equal(calculate(rows,bins,2,18,new Date(2026,11,29)).visible.length,0);assert.equal(calculate(rows,bins,2,18,new Date(2026,11,30)).visible.length,4);assert.equal(calculate(rows,bins,2,18,new Date(2027,0,1,17,59)).visible.length,4);assert.equal(calculate(rows,bins,2,18,new Date(2027,0,1,18,0)).visible.length,0);});

test('Fester Anker und skalierbare SVG-Geometrie bleiben bei wechselnden Tonnen stabil',async()=>{
  const {item,calls}=widget();await tick();
  let reference;
  for(const type of ['gelb','rest','bio','papier']){
    calls.subscribe[0].cb('',{val:JSON.stringify([{type,date:'2027-01-01'}])});
    const svg=item.renderWidgetBody({}).props.children[0];
    const image=svg.props.children[0].props.children[0];
    assert.equal(svg.props.style.inset,0);
    assert.equal(svg.props.width,'100%');
    assert.equal(svg.props.height,'100%');
    assert.equal(svg.props.preserveAspectRatio,'xMinYMax meet');
    assert.equal(image.props.x,0);
    const geometry=[svg.props.viewBox,image.props.width,image.props.height];
    if(reference)assert.deepEqual(geometry,reference);
    else reference=geometry;
  }
  calls.subscribe[0].cb('',{val:JSON.stringify([{type:'papier',date:'2027-01-01'},{type:'gelb',date:'2027-01-01'}])});
  const svg=item.renderWidgetBody({}).props.children[0];
  const groups=svg.props.children;
  assert.equal(svg.props.style.inset,0);
  assert.equal(svg.props.preserveAspectRatio,'xMinYMax meet');
  assert.equal(groups[0].props['data-type'],'gelb');
  assert.equal(groups[1].props['data-type'],'papier');
  const first=groups[0].props.children[0].props;
  const second=groups[1].props.children[0].props;
  assert.equal(first.x,0);
  assert.equal(first.y,'0');
  assert.equal(second.y,'0');
  assert.ok(second.x>=first.width);
  item.componentWillUnmount();
});
test('Nur neue Widgets erhalten Prozent-Defaults; vorhandene Styles werden beim Rendern nicht umgeschrieben',()=>{
 const {item,Class}=widget();const defaults=Class.getWidgetInfo().visDefaultStyle;for(const name of ['left','top','width','height'])assert.match(defaults[name],/%$/);
 item.state.style={left:'42px',top:'81px',width:'350px',height:'150px'};const before=JSON.stringify(item.state.style);const props={style:{left:'42px',top:'81px',width:'350px',height:'150px'}};item.renderWidgetBody(props);assert.equal(JSON.stringify(item.state.style),before);assert.equal(props.style.top,'81px');item.componentWillUnmount();
});

