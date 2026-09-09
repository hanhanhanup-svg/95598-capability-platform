'use client';

import {useEffect, useId, useRef, useState, type KeyboardEvent} from 'react';
import {ArrowLeft, MousePointer2} from 'lucide-react';
import {targetsFor, personMetrics, capById, type Person, type TargetRequirement} from './model';

type Axis = {id:string;name:string;current:number|null;target:number;detail:string;count?:string};
type Family = {name:string;targets:TargetRequirement[];achieved:number;known:number;total:number;percent:number};

function acceptedLevel(person:Person, capabilityId:string):number|null {
 const value=person.capabilities[capabilityId];
 return value?.evidenceStatus==='admissible'&&value.level!==null&&Number.isFinite(value.level)&&value.level>=1&&value.level<=5?value.level:null;
}

export function personCapabilityRadarData(person:Person,targetStars?:number|null):Family[] {
 const target=targetStars===undefined?person.targetStars:targetStars;
 if(target===null)return [];
 const grouped=new Map<string,TargetRequirement[]>();
 for(const requirement of targetsFor(person.roleId,target)){
  const family=capById(requirement.capabilityId)?.category||'未分类';
  grouped.set(family,[...(grouped.get(family)||[]),requirement]);
 }
 return [...grouped].map(([name,targets])=>{
  const known=targets.filter(target=>acceptedLevel(person,target.capabilityId)!==null).length;
  const achieved=targets.filter(target=>{const level=acceptedLevel(person,target.capabilityId);return level!==null&&level>=target.targetLevel}).length;
  return {name,targets,known,achieved,total:targets.length,percent:achieved/targets.length*100};
 });
}

const percentLabel=(value:number)=>`${Math.round(value*10)/10}%`;
const wrapName=(name:string)=>name.length>7?[name.slice(0,6),name.slice(6)]:[name];
const position=(index:number,count:number,value:number,maximum:number,radius=109):[number,number]=>{
 const angle=index/count*Math.PI*2-Math.PI/2;
 return [220+Math.cos(angle)*radius*Math.min(maximum,Math.max(0,value))/maximum,174+Math.sin(angle)*radius*Math.min(maximum,Math.max(0,value))/maximum];
};
const pathPoints=(axes:Axis[],maximum:number,value:(axis:Axis)=>number)=>axes.map((axis,index)=>position(index,axes.length,value(axis),maximum).join(',')).join(' ');

function activate(event:KeyboardEvent<SVGGElement>,action:()=>void){
 if(event.key==='Enter'||event.key===' '){event.preventDefault();action()}
}

function RadarPlot({axes,overview,onSelect,id}:{axes:Axis[];overview:boolean;onSelect:(name:string)=>void;id:string}){
 const maximum=overview?100:5;
 const ticks=overview?[20,40,60,80,100]:[1,2,3,4,5];
 const compact=axes.length<3;
 const title=overview?'各能力分类的已确认达标项占比':'分类内能力的可采信等级与目标等级';
 const plotHeight=compact?axes.length===1?168:248:356;
 const allKnown=axes.every(axis=>axis.current!==null);
 const description=overview?'每轴按已确认达标项数除以适用要求项数计算，目标为百分之百。点击分类名称或轴端分类圆点查看该分类；数值点仅展示数据。':'实线或实心点为可采信当前等级，虚线或空心点为目标等级。待核验能力不画当前点。';
 const interactive=(axis:Axis)=>overview?{role:'button' as const,tabIndex:0,'aria-label':`${axis.name}，${axis.detail}，查看分类能力`,onClick:()=>onSelect(axis.name),onKeyDown:(event:KeyboardEvent<SVGGElement>)=>activate(event,()=>onSelect(axis.name))}:{};
 return <svg className="pcr-plot" viewBox={`0 0 440 ${plotHeight}`} role="group" aria-labelledby={`${id}-plot-title ${id}-plot-description`}>
  <title id={`${id}-plot-title`}>{title}</title><desc id={`${id}-plot-description`}>{description}</desc>
  {compact?axes.map((axis,index)=>{
   const y=72+index*84;
   const x=(value:number)=>90+value/maximum*275;
   return <g key={axis.id}>
    <g className={overview?'pcr-axis-link':''} {...interactive(axis)}><rect className="pcr-label-focus" x="84" y={y-42} width="287" height="31" rx="6"/><text x="90" y={y-23} className="pcr-axis-name" textAnchor="start">{axis.name}</text><text x="365" y={y-23} className="pcr-axis-value" textAnchor="end">{axis.current===null?'待核验':overview?percentLabel(axis.current):`L${axis.current}`}{overview&&axis.count?` · ${axis.count}`:''}</text></g>
    <line x1="90" y1={y} x2="365" y2={y} className="pcr-spoke"/>
    {ticks.map(tick=><g key={tick}><line x1={x(tick)} y1={y-5} x2={x(tick)} y2={y+5} className="pcr-spoke"/><text x={x(tick)} y={y+22} textAnchor="middle" className="pcr-scale">{overview?`${tick}%`:`L${tick}`}</text></g>)}
    <circle cx={x(axis.target)} cy={y} r="7" className="pcr-target-dot"/>
    {axis.current!==null&&<circle cx={x(axis.current)} cy={y} r="4.5" className="pcr-current-dot"><title>{axis.detail}</title></circle>}
    {overview&&<g className="pcr-point-link" {...interactive(axis)}><circle cx="365" cy={y} r="12" className="pcr-hit"/><circle cx="365" cy={y} r="6" className="pcr-category-dot"/><title>{`查看${axis.name}`}</title></g>}
    {!overview&&<text x="90" y={y+43} className="pcr-scale">目标 L{axis.target}{axis.current===null?' · 暂无可采信当前等级':''}</text>}
   </g>;
  }):<>
   {ticks.map(tick=><polygon key={tick} points={pathPoints(axes,maximum,()=>tick)} className="pcr-grid"/>)}
   {axes.map((axis,index)=>{const [x,y]=position(index,axes.length,maximum,maximum);return <line key={axis.id} x1="220" y1="174" x2={x} y2={y} className="pcr-spoke"/>})}
   {ticks.map(tick=><text key={tick} x="225" y={174-109*tick/maximum-3} className="pcr-scale">{overview?`${tick}%`:`L${tick}`}</text>)}
   <polygon points={pathPoints(axes,maximum,axis=>axis.target)} className="pcr-target"/>
   {allKnown&&<polygon points={pathPoints(axes,maximum,axis=>axis.current!)} className="pcr-current"/>}
   {!allKnown&&axes.map((axis,index)=>{const next=axes[(index+1)%axes.length];if(axis.current===null||next.current===null)return null;const [x1,y1]=position(index,axes.length,axis.current,maximum);const [x2,y2]=position((index+1)%axes.length,axes.length,next.current,maximum);return <line key={axis.id} x1={x1} y1={y1} x2={x2} y2={y2} className="pcr-current-segment"/>})}
   {axes.map((axis,index)=>{
    const [x,y]=position(index,axes.length,maximum,maximum,151);
    const lines=wrapName(axis.name);
    const point=axis.current===null?null:position(index,axes.length,axis.current,maximum);
    return <g key={axis.id}>
     <g className={overview?'pcr-axis-link':''} {...interactive(axis)}><rect x={x-64} y={y-15} width="128" height={lines.length*15+24} rx="6" className="pcr-label-focus"/><text x={x} y={y} textAnchor="middle" className="pcr-axis-name">{lines.map((line,i)=><tspan key={i} x={x} dy={i?15:0}>{line}</tspan>)}</text><text x={x} y={y+lines.length*15} textAnchor="middle" className="pcr-axis-value">{overview?`${percentLabel(axis.current||0)} · ${axis.count}`:axis.current===null?`待核验 / 目标 L${axis.target}`:`L${axis.current} / 目标 L${axis.target}`}</text></g>
     {point&&<circle cx={point[0]} cy={point[1]} r="4" className="pcr-current-dot"><title>{axis.detail}</title></circle>}
     {overview&&(()=>{const [cx,cy]=position(index,axes.length,maximum,maximum);return <g className="pcr-point-link" {...interactive(axis)}><circle cx={cx} cy={cy} r="11" className="pcr-hit"/><circle cx={cx} cy={cy} r="6" className="pcr-category-dot"/><title>{`查看${axis.name}`}</title></g>})()}
    </g>;
   })}
  </>}
 </svg>;
}

export type PersonCapabilityRadarProps = {
 person:Person;
 targetStars?:number|null;
 activeFamily?:string|null;
 onFamilyChange?:(family:string|null)=>void;
};

export function PersonCapabilityRadar({person,targetStars,activeFamily,onFamilyChange}:PersonCapabilityRadarProps){
 const id=useId();
 const target=targetStars===undefined?person.targetStars:targetStars;
 const identity=`${person.id}:${person.roleId}:${target}`;
 const [selection,setSelection]=useState<{identity:string;family:string}|null>(null);
 const headingRef=useRef<HTMLHeadingElement>(null);
 const moved=useRef(false);
 const families=personCapabilityRadarData(person,target);
 const familyName=activeFamily!==undefined?activeFamily:selection?.identity===identity?selection.family:null;
 const selected=families.find(family=>family.name===familyName);
 const active=selected?.name||null;
 const metrics=target===null?null:personMetrics(person,person.roleId,target);
 useEffect(()=>{setSelection(null)},[identity]);
 useEffect(()=>{if(moved.current){headingRef.current?.focus({preventScroll:true});moved.current=false}},[active]);
 const choose=(family:string)=>{moved.current=true;setSelection({identity,family});onFamilyChange?.(family)};
 const back=()=>{moved.current=true;setSelection(null);onFamilyChange?.(null)};
 const axes:Axis[]=selected?selected.targets.map(target=>{
  const current=acceptedLevel(person,target.capabilityId);const name=capById(target.capabilityId)?.name||target.capabilityId;
  return {id:target.id,name,current,target:target.targetLevel,detail:`${name}，${current===null?'待核验':`可采信当前 L${current}`}，目标 L${target.targetLevel}`};
 }):families.map(family=>({id:family.name,name:family.name,current:family.percent,target:100,count:`${family.achieved}/${family.total} 项`,detail:`已确认达标 ${family.achieved} / ${family.total} 项，占比 ${percentLabel(family.percent)}；可判断 ${family.known} 项，待核验 ${family.total-family.known} 项`}));

 return <section className="pcr" aria-labelledby={`${id}-heading`}>
  <div className="pcr-heading"><div><h4 id={`${id}-heading`} ref={headingRef} tabIndex={-1}>{selected?selected.name:'能力总览'}</h4><p>{selected?`可采信当前等级与目标等级 · ${selected.total} 项能力`:'已确认达标项占比'}</p></div>{selected?<button type="button" className="pcr-back" onClick={back}><ArrowLeft size={13}/>返回总览</button>:<span className="pcr-data-label">模拟数据</span>}</div>
  {!axes.length?<div className="pcr-empty" role="status"><p>{target===null?'本岗目标待确认':'当前岗位与目标星档尚无适用能力要求。'}</p><span>{target===null?'确认目标星档后，再展示该岗位的分类要求与差距。':'登记能力要求后展示分类总览。'}</span></div>:<>
   {!selected&&<div className="pcr-hint"><MousePointer2 size={13}/><span>点击图上的分类，查看具体能力</span></div>}
   <RadarPlot axes={axes} overview={!selected} onSelect={choose} id={id}/>
   <div className="pcr-legend"><span><i className="pcr-legend-current"/>{selected?'可采信当前等级':'已确认达标项占比'}</span><span><i className="pcr-legend-target"/>{selected?'目标等级':'目标 100%'}</span></div>
   <p className="pcr-summary">{selected?`可判断 ${selected.known} / ${selected.total} 项${selected.known<selected.total?` · ${selected.total-selected.known} 项待核验`:''}`:`已确认达标 ${metrics?.achieved||0} / ${metrics?.total||0} 项 · 可判断 ${metrics?.known||0} 项`}</p>
   {axes.length<3&&<p className="pcr-footnote">当前仅 {axes.length} {selected?'项能力':'个分类'}，以点线刻度展示，不补设维度。</p>}
   <p className="pcr-footnote">{selected?'待核验、缺失或过期证据不绘制为零级；当前等级仅展示可采信结果。':'分类占比 = 已确认达标项数 / 适用要求项数；待核验项保留在分母中，不代表能力零级。'}</p>
   <ul className="pcr-accessible-data">{axes.map(axis=><li key={axis.id}>{axis.detail}</li>)}</ul>
  </>}
 </section>;
}
