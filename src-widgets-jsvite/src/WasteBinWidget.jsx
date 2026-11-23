import React from 'react';
import rest from './assets/rest.png';
import gelb from './assets/gelb.png';
import bio from './assets/bio.png';
import papier from './assets/papier.png';
import icon from './assets/abfallmanager.svg';
import {TYPES,NAMES,instanceId,readDisplay,daysLeft,layout} from './model.mjs';
const IMAGES={rest,gelb,bio,papier};
export default class WasteBinWidget extends window.visRxWidget {
 static getI18nPrefix(){return 'abfallmanager_';}
 static getWidgetInfo(){return {
  id:'tplAbfallmanagerBin',visSet:'abfallmanager',visSetLabel:'Abfallmanager',visSetColor:'#65873b',visSetIcon:icon,visName:'Mülltonnen',visPrev:gelb,
  visDefaultStyle:{left:'0%',top:'0%',width:'60%',height:'35%',position:'absolute',background:'transparent'},
  visAttrs:[
   {name:'source',label:'Datenquelle',fields:[{name:'instance',label:'Abfallmanager-Instanz',type:'instance',adapter:'abfallmanager',default:'abfallmanager.0'}]},
   {name:'appearance',label:'Mülltonnen',fields:[
    {name:'binWidth',label:'Tonnenbreite (Verhältnis)',type:'number',min:20,max:1000,default:120},
    {name:'binHeight',label:'Tonnenhöhe (Verhältnis)',type:'number',min:30,max:1500,default:185},
    {name:'binGap',label:'Abstand (Verhältnis)',type:'number',min:0,max:200,default:12},
    {name:'showShadow',label:'Schatten anzeigen',type:'checkbox',default:true},
    {name:'shadowStrength',label:'Schattenstärke (%)',type:'slider',min:0,max:100,default:35},
   ]},
   {name:'text',label:'Beschriftung',fields:[
    {name:'showText',label:'Text anzeigen',type:'checkbox',default:false},
    {name:'textSize',label:'Textgröße (px)',type:'number',min:8,max:100,default:14},
    {name:'textColor',label:'Textfarbe',type:'color',default:'#ffffff'},
    {name:'emptyMode',label:'Ohne fällige Termine',type:'select',default:'hide',options:[{value:'hide',label:'Unsichtbar'},{value:'message',label:'Hinweistext'},{value:'bins',label:'Platzhalter-Tonnen'}]},
    {name:'emptyText',label:'Hinweistext ohne Termine',default:'Keine Abholung im Anzeigezeitraum'},
   ]},
  ],
 };}
 getWidgetInfo(){return WasteBinWidget.getWidgetInfo();}
 constructor(props){super(props);this.state={...this.state,collections:[],collectionError:'',collectionLoaded:false};this.subscriptionGeneration=0;this.mounted=false;}
 componentDidMount(){this.mounted=true;super.componentDidMount();this.attach();this.clock=setInterval(()=>{if(this.mounted)this.setState({collectionClock:Date.now()});},60000);}
 onRxDataChanged(){if(this.mounted)this.attach();}
 componentWillUnmount(){this.mounted=false;clearInterval(this.clock);this.detach();super.componentWillUnmount();}
 detach(){
  this.subscriptionGeneration++;
  if(this.subscription){const {socket,id,callback}=this.subscription;socket.unsubscribeState(id,callback);this.subscription=null;}
 }
 attach(){
  const socket=this.props.context.socket;const id=instanceId(this.state.rxData.instance)+'.display.json';
  if(this.subscription?.id===id&&this.subscription.socket===socket)return;
  this.detach();const generation=this.subscriptionGeneration;
  this.setState({collections:[],collectionError:'',collectionLoaded:false});
  let liveReceived=false;
  const accept=state=>{if(!this.mounted||generation!==this.subscriptionGeneration)return;const parsed=readDisplay(state?.val);this.setState({collections:parsed.entries,collectionError:parsed.error,collectionLoaded:true});};
  const callback=(_id,state)=>{liveReceived=true;accept(state);};
  this.subscription={socket,id,callback};
  Promise.resolve(socket.subscribeState(id,callback)).then(()=>{
   if(!this.mounted||generation!==this.subscriptionGeneration){socket.unsubscribeState(id,callback);return;}
   return socket.getState(id).then(state=>{if(!liveReceived)accept(state);});
  }).catch(()=>{if(this.mounted&&generation===this.subscriptionGeneration)this.setState({collectionError:'Termindaten nicht erreichbar.',collectionLoaded:true});});
 }
 renderWidgetBody(props){
  super.renderWidgetBody(props);
  const data=this.state.rxData;const edit=!!this.props.editMode;
  const preview=(!this.state.collections.length)&&(edit||data.emptyMode==='bins');
  const rows=preview?TYPES.map(type=>({type,date:'',title:NAMES[type]})):this.state.collections;
  const geometry=layout(data,rows.length);
  const color=data.textColor||'#ffffff';
  if(!rows.length){
   if(data.emptyMode==='message')return <div className="vis-widget-body abfallmanager-empty" role="status" style={{background:'transparent',color,fontSize:geometry.fontSize}}>{data.emptyText||'Keine Abholung im Anzeigezeitraum'}</div>;
   return null;
  }
  const textHeight=data.showText?geometry.fontSize*4.5:0;
  const canvasWidth=geometry.totalWidth+12;
  const canvasHeight=geometry.height+textHeight+12;
  // VIS owns the outer position and size. The SVG uses the complete widget body as its
  // viewport and scales its internal coordinates uniformly, keeping the bins bottom-left.
  // Existing bin dimensions are retained as relative proportions for saved projects.
  return <div className="vis-widget-body abfallmanager-widget" data-instance={instanceId(data.instance)} data-preview={preview?'true':'false'} style={{position:'relative',background:'transparent',overflow:'hidden',pointerEvents:'none'}}>
   <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox={'0 0 '+canvasWidth+' '+canvasHeight} preserveAspectRatio="xMinYMax meet" style={{position:'absolute',inset:0,display:'block',width:'100%',height:'100%',overflow:'hidden',background:'transparent',fontFamily:'inherit'}} role="img" aria-label={preview?'Vorschau Mülltonnen':rows.map(e=>NAMES[e.type]).join(', ')}>
    {rows.map((e,index)=>{
     const x=index*(geometry.width+geometry.gap);const left=e.date?daysLeft(e.date):null;
     return <g key={e.type} className="abfallmanager-bin" data-type={e.type} data-date={e.date}>
      <image href={IMAGES[e.type]} x={x} y="0" width={geometry.width} height={geometry.height} preserveAspectRatio="xMidYMid meet" style={{filter:data.showShadow===false?'none':`drop-shadow(2px 5px 3px rgba(0,0,0,${geometry.shadow}))`}}/>
      <title>{NAMES[e.type]+(e.date?' – '+e.date:'')}</title>
      {data.showText&&<text x={x+geometry.width/2} y={geometry.height+geometry.fontSize+4} textAnchor="middle" fill={color} fontSize={geometry.fontSize}>
       <tspan x={x+geometry.width/2} dy="0">{NAMES[e.type]}</tspan>
       <tspan x={x+geometry.width/2} dy="1.3em">{e.date?e.date.split('-').reverse().join('.'):'Vorschau'}</tspan>
       <tspan x={x+geometry.width/2} dy="1.3em">{left===null?'':left===0?'Heute':left===1?'In 1 Tag':left>0?`In ${left} Tagen`:`Vor ${Math.abs(left)} Tagen`}</tspan>
      </text>}
     </g>;
    })}
   </svg>
   {edit&&(preview||this.state.collectionError)&&<span className="abfallmanager-editor-hint" style={{position:'absolute',top:0,left:0,fontSize:11,color:'#666',pointerEvents:'none'}}>{this.state.collectionError||'Vorschau – aktuell keine fälligen Termine'}</span>}
  </div>;
 }
}
