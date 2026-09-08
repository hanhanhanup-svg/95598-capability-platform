import {base,checkHandoffs,checkCatalog,currentVersion,addAudit,type State,type Draft,type Catalog,type Relation,type Handoff} from './management-model';
export {checkHandoffs} from './management-model';
export function parseCsv(text:string){const rows:string[][]=[];let row:string[]=[],value='',quoted=false;for(let i=0;i<text.length;i++){const ch=text[i];if(ch==='"'){if(quoted&&text[i+1]==='"'){value+='"';i++}else quoted=!quoted}else if(ch===','&&!quoted){row.push(value.trim());value=''}else if(ch==='\n'&&!quoted){row.push(value.trim());if(row.some(Boolean))rows.push(row);row=[];value=''}else if(ch!=='\r')value+=ch}if(quoted)throw new Error('CSV 引号未闭合');row.push(value.trim());if(row.some(Boolean))rows.push(row);return rows}
export const batchStamp=(s:State)=>JSON.stringify({version:currentVersion(s),catalog:s.draft?.catalog||s.catalog,policies:s.draft?.policies||s.policies,status:s.draft?.status||''});
export function previewBatch(s:State,text:string){
 const draft:Draft=s.draft?structuredClone(s.draft):{catalog:structuredClone(s.catalog),policies:structuredClone(s.policies),status:'草稿',note:'模板批量扩展',reviewer:'',date:s.date};const c=draft.catalog;const errors:string[]=[],summary:{row:number;name:string;kind:string;added:number;reused:number;policies:number}[]=[];
 let rows:string[][]=[];try{rows=parseCsv(text)}catch(e){errors.push((e as Error).message)}
 if(draft.status!=='草稿')errors.push('当前草稿已进入审核，请先完成审核或退回草稿');
 if(rows[0]?.[0]==='类型')rows.shift();if(!rows.length)errors.push('请至少填写一行新增内容');if(rows.length>50)errors.push('每批最多 50 行，请拆分批次');
 for(const [index,row] of rows.slice(0,50).entries()){
  const [kind,sourceId,newId,name,owner]=row;const rowNum=index+2;const n0=c.nodes.length;const type=kind==='场景'?'scenario':kind==='岗位'?'role':'';
  const template=c.nodes.find(n=>n.id===sourceId&&n.kind===type&&n.active);
  if(row.length!==5||!template||!name||!owner||!newId||!/^[A-Za-z][A-Za-z0-9_-]+$/.test(newId)){errors.push(`第 ${rowNum} 行：检查类型、模板编码、新编码、名称和责任人五列`);continue}
  if(c.nodes.some(n=>n.id===newId||n.kind===type&&n.name===name)){errors.push(`第 ${rowNum} 行：编码或同类名称已存在，请复用已有对象`);continue}
  const oldEdges=structuredClone(c.edges),oldPolicies=structuredClone(draft.policies);const edge=(from:string,to:string,type:string,levels?:number[])=>{const id=`${type}:${from}:${to}`;if(!c.edges.some(e=>e.id===id))c.edges.push({id,from,to,type,...(levels?{targetLevels:levels}:{})})};
  c.nodes.push({...template,id:newId,name,owner,description:`${name}；沿用模板：${template.description}`});let reused=0,pcount=0;
  if(type==='scenario'){
   oldEdges.filter(e=>(e.to===sourceId&&['domainScenario','roleScenario','responsibilityScenario'].includes(e.type))||(e.from===sourceId&&e.type==='scenarioTask')).forEach(e=>{edge(e.from===sourceId?newId:e.from,e.to===sourceId?newId:e.to,e.type);reused++});
   oldPolicies.filter(p=>p.scenarioId===sourceId&&p.id!=='POL-EXPERT').forEach((p,i)=>{draft.policies.push({...p,id:`POL-${newId}-${i}`,name,scenarioId:newId});pcount++});
   for(const h of [...(c.handoffs||[])].filter(h=>h.scenarioId===sourceId)){c.handoffs??=[];c.handoffs.push({...structuredClone(h),id:`HANDOFF-${newId}-${h.taskId}`,scenarioId:newId,owner})}
  }else{
   oldEdges.filter(e=>e.to===sourceId&&['domainRole','sequenceRole'].includes(e.type)).forEach(e=>edge(e.from,newId,e.type));
   oldEdges.filter(e=>e.from===sourceId&&e.type!=='roleResponsibility').forEach(e=>{const levels=e.type==='roleCapability'?(e.targetLevels||[1,2,3,4,5].map(star=>base.capabilityTargets.find(t=>t.roleId===sourceId&&t.capabilityId===e.to&&t.star===star)?.targetLevel||0)):undefined;edge(newId,e.to,e.type,levels);if(e.type==='roleCapability'){const copy=c.edges.find(x=>x.from===newId&&x.to===e.to&&x.type===e.type);if(copy)copy.behaviors=structuredClone(e.behaviors||[1,2,3,4,5].map(star=>base.capabilityTargets.find(t=>t.roleId===sourceId&&t.capabilityId===e.to&&t.star===star)?.behavior||''));if(copy)copy.requirements=[1,2,3,4,5].map(star=>{const old=base.capabilityTargets.find(t=>t.roleId===sourceId&&t.capabilityId===e.to&&t.star===star);return e.requirements?.[star-1]||{required:old?.required??true,thresholdType:old?.thresholdType||'新增能力演示要求'}})}reused++});
   oldEdges.filter(e=>e.from===sourceId&&e.type==='roleResponsibility').forEach((e,i)=>{const original=c.nodes.find(n=>n.id===e.to)!;const id=`${newId}-RESP-${i+1}`;if(c.nodes.some(n=>n.id===id)){errors.push(`第 ${rowNum} 行：职责编码 ${id} 冲突`);return}c.nodes.push({...original,id,name:`${name} · ${original.name}`,owner});edge(newId,id,'roleResponsibility');oldEdges.filter(x=>x.from===original.id&&x.type==='responsibilityScenario').forEach(x=>edge(id,x.to,x.type))});
   oldPolicies.filter(p=>p.roleId===sourceId&&p.id!=='POL-EXPERT').forEach((p,i)=>{draft.policies.push({...p,id:`POL-${newId}-${i}`,name:`${name} · ${p.name}`,roleId:newId});pcount++});
  }
  summary.push({row:rowNum,name,kind,added:c.nodes.length-n0,reused,policies:pcount});
 }
 errors.push(...checkCatalog(c,draft.policies),...checkHandoffs(c));return {draft,errors:[...new Set(errors)],summary,stamp:batchStamp(s)};
}
export function applyBatch(s:State,text:string,stamp:string){if(batchStamp(s)!==stamp)throw new Error('标准或草稿已变化，请重新预览校验');const preview=previewBatch(s,text);if(preview.errors.length)throw new Error(preview.errors[0]);s.draft=preview.draft;addAudit(s,'批量合入体系草稿',`${preview.summary.length} 行；基于 ${currentVersion(s)}；等待审核发布`)}
