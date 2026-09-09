'use client';
import {useState} from 'react';
import {ArrowLeft,ArrowRight,Check,Plus} from 'lucide-react';
import {useManagement} from './management-context';
import {nameOf,evidenceCheck,submitAssessment,reviewAssessment,type State} from './management-model';
import {dayAfter} from './workflow-model';
import {matrixImprovementPlan,matrixEvidenceCheck,prepareMatrixAssessment,addImprovementEvidence,setImprovementEvidenceExcluded} from './matrix-improvement-model';
import {Picker,Badge} from './ui-parts';
import {Field,TextField,Actions} from './management-ui';

export function MatrixImprovementView({personId,roleId,star,initialCapabilityId,onBack}:{personId:string;roleId:string;star:number;initialCapabilityId:string;onBack:()=>void}){
 const {state:s,mutate}=useManagement();
 const [capabilityId,setCapabilityId]=useState(initialCapabilityId),[scenario,setScenario]=useState(''),[lastId,setLastId]=useState(''),[processingOriginal,setProcessingOriginal]=useState(false);
 const [eventId,setEventId]=useState(''),[source,setSource]=useState(''),[observedLevel,setObservedLevel]=useState('');
 const [observed,setObserved]=useState(s.date),[expires,setExpires]=useState(dayAfter(s.date,90)),[confirmed,setConfirmed]=useState(false);
 const [reviewer,setReviewer]=useState('专业复核员（模拟）'),[reason,setReason]=useState(''),[feedback,setFeedback]=useState('');
 const plan=matrixImprovementPlan(s,personId,roleId,star),row=plan.find(r=>r.capabilityId===capabilityId)||plan[0];
 if(!row)return <p>当前岗位暂无可办理的能力要求。</p>;
 const policy=row.policies.find(p=>p.scenarioId===scenario)||row.policies[0];const scenarioId=policy?.scenarioId||'';
 const context={personId,roleId,star,capabilityId:row.capabilityId,scenarioId};
 const assessment=s.assessments.find(a=>a.id===lastId&&a.personId===personId&&a.capabilityId===row.capabilityId&&a.scenarioId===scenarioId)||s.assessments.find(a=>a.personId===personId&&a.capabilityId===row.capabilityId&&a.scenarioId===scenarioId&&['草稿','待复核','已退回'].includes(a.status));
 const minSamples=s.policies.find(p=>p.scenarioId===scenarioId)?.minSamples||2;const check=assessment?.status==='待复核'?evidenceCheck(s,personId,row.capabilityId,scenarioId,minSamples,assessment.factIds):matrixEvidenceCheck(s,personId,row.capabilityId,scenarioId);
 const editable=!assessment||['草稿','已退回'].includes(assessment.status);const pending=assessment?.status==='待复核';
 const completed=plan.filter(r=>r.status==='achieved').length;
 const displayed=plan.filter(r=>r.status!=='achieved'||r.capabilityId===row.capabilityId);
 const facts=s.facts.filter(f=>f.personId===personId&&f.capabilityId===row.capabilityId&&f.scenarioId===scenarioId&&(!pending||assessment.factIds.includes(f.id)));
 const run=(fn:(state:State)=>void,success:string)=>{let detail='';const ok=mutate(st=>{try{fn(st)}catch(error){detail=error instanceof Error?error.message:'操作未完成';throw error}});setFeedback(ok?success:detail||'当前观察日期不支持办理，请切换到最新日期。');return ok};
 const differentTarget=!!assessment&&(assessment.targetLevel!==row.level||!!assessment.targetRoleId&&assessment.targetRoleId!==roleId||!!assessment.targetStar&&assessment.targetStar!==star||assessment.status==='待复核'&&!!row.behavior&&assessment.roleBehaviorSnapshot!==row.behavior);
 const originalTarget=!!assessment&&differentTarget&&processingOriginal;
 const workLevel=originalTarget?assessment.targetLevel:row.level;
 const originalBehavior=assessment?.roleBehaviorSnapshot||policy?.requirements.find(r=>r.capabilityId===row.capabilityId&&r.level===assessment?.targetLevel)?.behavior||s.catalog.nodes.find(n=>n.active&&n.level===assessment?.targetLevel&&s.catalog.edges.some(e=>e.type==='capabilityBehavior'&&e.from===row.capabilityId&&e.to===n.id))?.description||'';
 const workingId=(st:State)=>assessment&&differentTarget?assessment.id:prepareMatrixAssessment(st,context);
 const resetForm=()=>{setProcessingOriginal(false);setLastId('');setEventId('');setSource('');setObservedLevel('');setConfirmed(false);setReason('');setFeedback('')};
 return <div className="matrix-improvement">
  <div className="improvement-topline"><button className="text-button" onClick={onBack}><ArrowLeft size={14}/>返回人员列表</button><span>目标 {star} 星 · 已满足 <b>{completed}/{plan.length}</b> 项</span></div>
  <div className="improvement-steps"><span><b>1</b>看清差距</span><ArrowRight size={14}/><span><b>2</b>补充材料</span><ArrowRight size={14}/><span><b>3</b>确认结果</span></div>
  <div className="improvement-layout">
   <aside className="improvement-capabilities" aria-label="能力提升清单"><h3>待提升能力 <span>{plan.length-completed} 项</span></h3>{displayed.map(item=><button key={item.capabilityId} className={item.capabilityId===row.capabilityId?'selected':''} onClick={()=>{setCapabilityId(item.capabilityId);setScenario('');resetForm()}}><b>{item.name}</b><span>{item.currentLevel===null?'当前待确认':`当前 L${item.currentLevel}`} → L{item.level??'—'}</span><small>{item.status==='achieved'?'已满足要求':item.status==='unknown'?'需补充或确认材料':'需要提升表现'}</small></button>)}</aside>
   <div className="improvement-workspace">
    <div className="improvement-target"><div><h3>{row.name}</h3><span>当前 {row.currentLevel===null?'待确认':`L${row.currentLevel}`} <ArrowRight size={14}/>目标 L{row.level??'—'}</span></div><Badge tone={row.status==='achieved'?'green':'amber'}>{row.status==='achieved'?'已达标':row.currentLevel===null?'当前水平待确认':`还差 ${Math.max(0,(row.level||0)-row.currentLevel)} 级`}</Badge></div>
    <div className="improvement-requirement"><b>需要做到</b><p>{row.behavior||'该能力的等级要求尚未完善，请先维护业务标准。'}</p></div>
    {completed===plan.length&&<div className="improvement-complete"><Check size={18}/><span>已满足 {star} 星能力要求，可作为星级提升的依据。</span></div>}
    {row.status==='achieved'&&!assessment?<p className="improvement-guidance">本项已满足目标要求。可从左侧选择尚未达标的能力继续办理。</p>:!policy||row.level===null?<p className="improvement-guidance">该岗位能力尚未配置适用的评价场景，请先完善业务标准中的场景关联。</p>:<>
     {row.policies.length>1?<label className="mg-field"><span>材料对应的业务场景</span><Picker label="提升材料业务场景" value={scenarioId} onChange={value=>{setScenario(value);resetForm()}} options={row.policies.map(p=>({value:p.scenarioId,label:p.name}))}/></label>:<div className="improvement-scene">业务场景：{nameOf(s,scenarioId)}</div>}
     {assessment&&differentTarget&&!processingOriginal?<div className="improvement-feedback" role="status"><p>该能力已有一份不同目标的评价正在办理。先完成原评价，再按本次目标补充材料。</p><p>原评价目标：L{assessment.targetLevel}{assessment.targetRoleId?` · ${nameOf(s,assessment.targetRoleId)}`:''}{assessment.targetStar?` · ${assessment.targetStar} 星要求`:''}</p><button className="button outline" onClick={()=>setProcessingOriginal(true)}>办理原评价</button></div>:<>
     {originalTarget&&<div className="improvement-original"><b>正在办理原评价 · 目标 L{assessment.targetLevel}</b><p>{assessment.targetRoleId?nameOf(s,assessment.targetRoleId):nameOf(s,assessment.scenarioId)}{assessment.targetStar?` · ${assessment.targetStar} 星要求`:''}</p><p>原评价要求：{originalBehavior||'原记录未保存具体行为要求，请核实原评价依据。'}</p><small>完成后，能力清单仍按当前选择的 {star} 星要求判断差距。</small></div>}
     <section className="improvement-materials"><h4>准备这些材料</h4><ul><li>{row.material}，附本人处理过程、结果和可查找的位置。</li><li>至少 {minSamples} 个不同业务事件；当前可用 {check.events} 个{check.events<minSamples?`，还需 ${minSamples-check.events} 个`:'，数量已满足'}。</li><li>材料应在有效期内、归属清楚，并能体现{originalTarget?'本次原评价':'上方'}目标 L{workLevel} 要求。</li></ul></section>
     {check.reasons.length>0&&<div className="improvement-checks"><b>当前还需处理</b><ul>{check.reasons.map(item=><li key={item}>{item}</li>)}</ul></div>}
     {check.ok&&check.level!==null&&<p className="improvement-guidance">现有材料一致支持 L{check.level}{check.level<(workLevel||0)?`，仍需练习并提交能够体现 L${workLevel} 的新业务表现。`:'，可以提交验证。'}</p>}
     {facts.length>0&&<details className="improvement-evidence"><summary>已记录材料 · {facts.length} 条</summary>{facts.map(f=><div key={f.id} className="improvement-evidence-item"><div><b>{f.eventId} · L{f.level}</b><small>{f.observed} · {f.excluded?'本次不采用':f.expires<s.date?'已过期':'有效至 '+f.expires}</small><p>{f.source}</p></div>{editable&&<button className="text-button" onClick={()=>{let id='';if(run(st=>{id=workingId(st);setImprovementEvidenceExcluded(st,id,f.id,!f.excluded,reason)},'材料范围已更新。'))setLastId(id)}}>{f.excluded?'恢复采用':'本次不采用'}</button>}</div>)}{editable&&<TextField label="调整材料范围的原因" value={reason} onChange={setReason}/>}</details>}
     {editable&&<details className="improvement-add-material"><summary><Plus size={15}/>补充材料</summary><form className="improvement-evidence-form" onSubmit={event=>{event.preventDefault();let id='';if(run(st=>{id=workingId(st);addImprovementEvidence(st,id,{eventId,source,level:Number(observedLevel),observed,expires,confirmed})},'材料已保存，可继续添加其他业务事件。')){setLastId(id);setEventId('');setSource('');setConfirmed(false)}}}>
      <h4>补充一条材料</h4><div className="mg-form-grid"><Field label="业务事件编号" placeholder="工单号或案例编号" value={eventId} onChange={e=>setEventId(e.target.value)}/><label className="mg-field"><span>实际表现等级</span><Picker label="材料实际体现的等级" value={observedLevel} onChange={setObservedLevel} options={[{value:'',label:'请选择实际等级'},...[1,2,3,4,5].map(value=>({value:String(value),label:`L${value}`}))]}/></label><Field label="业务发生日期" type="date" max={s.date} value={observed} onChange={e=>setObserved(e.target.value)}/><Field label="材料有效至" type="date" min={s.date} value={expires} onChange={e=>setExpires(e.target.value)}/></div>
      <TextField label="处理过程、结果与材料位置" value={source} onChange={setSource}/><label className="improvement-confirm"><input type="checkbox" checked={confirmed} onChange={e=>setConfirmed(e.target.checked)}/>已核对材料归属、内容质量及评价用途</label>
      <button className="button outline" type="submit"><Plus size={14}/>保存这条材料</button>
     </form></details>}
     {pending&&<section className="improvement-review"><h4>确认本次结果</h4><p>材料支持 L{assessment.resultLevel}，本次目标为 L{assessment.targetLevel}。</p><Field label="复核人" value={reviewer} onChange={e=>setReviewer(e.target.value)}/><TextField label="确认或退回依据" value={reason} onChange={setReason}/><Actions><button className="button primary" onClick={()=>{if(run(st=>reviewAssessment(st,assessment.id,true,reason,reviewer),'结果已生效，左侧能力差距和组织矩阵已同步更新。'))setLastId(assessment.id)}}>确认结果并更新</button><button className="button outline" onClick={()=>{if(run(st=>reviewAssessment(st,assessment.id,false,reason,reviewer),'已退回，可继续完善材料。'))setLastId(assessment.id)}}>退回完善材料</button></Actions></section>}
     {editable&&<Actions><button className="button primary" disabled={!check.ok} onClick={()=>{let id='';if(run(st=>{id=workingId(st);submitAssessment(st,id)},'材料已提交，请在下方确认本次结果。')){setLastId(id);setReason('')}}}>提交材料验证<ArrowRight size={14}/></button></Actions>}
     {assessment?.status==='已生效'&&<div className="improvement-result"><b>本次结果已生效 · L{assessment.resultLevel}</b><p>{row.status==='achieved'?'本项已满足目标要求，可继续办理其他能力。':'尚未满足目标要求，请按差距继续练习。'}</p>{row.status!=='achieved'&&<button className="button outline" onClick={()=>{setLastId('');setReason('');setFeedback('')}}>继续补充新的实践材料</button>}</div>}
     </>}
    </>}
    {feedback&&<p className="improvement-feedback" role="status">{feedback}</p>}
   </div>
  </div>
 </div>;
}
