'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,Check,ChevronDown,ClipboardCheck,FileText,History,MessageSquare,Plus} from 'lucide-react';
import {useManagement} from './management-context';
import {base,nameOf,currentVersion,personAt,submitAssessment,reviewAssessment,uid,addAudit,type Assessment} from './management-model';
import type {WorkContext} from './workflow-model';
import type {DetailRef} from './graph-view';
import {Picker,Segments,Badge,PanelTitle} from './ui-parts';
import {Field,TextField,Modal,Actions} from './management-ui';
import {assessmentSummary} from './evaluation-summary';
import {PersonSearchPicker} from './person-search-picker';
export {AuthorizationView} from './authorization-view';

const editable=(a:Assessment)=>a.status==='草稿'||a.status==='已退回';
const stateLabel=(a:Assessment)=>({'草稿':'待提交','已退回':'待补充','待复核':'待确认','已生效':'已完成'}[a.status]);

export function EvaluationView({personId,onPerson,onDetail,context={}}:{personId:string;onPerson:(id:string)=>void;onDetail:(d:DetailRef)=>void;context?:WorkContext}){
 const {state:s,mutate}=useManagement();
 const initialPolicy=s.policies.find(p=>p.id===context.policyId)||s.policies.find(p=>p.roleId===personAt(s,personId).roleId&&(!context.capabilityId||p.requirements.some(c=>c.capabilityId===context.capabilityId)));
 const initialRecord=s.assessments.find(a=>a.id===context.recordId&&a.personId===personId);
 const [tab,setTab]=useState(initialRecord?.status==='已生效'?'history':'queue');
 const [selected,setSelected]=useState(initialRecord?.id||'');
 const [modal,setModal]=useState(context.tab==='new'?'assessment':context.tab==='appeals'?'appeals':'');
 const [capabilityId,setCapabilityId]=useState(context.capabilityId||initialPolicy?.requirements[0]?.capabilityId||'CAP-04');
 const [scenarioId,setScenarioId]=useState(context.scenarioId||initialPolicy?.scenarioId||'SCN-04');
 const [targetLevel,setTargetLevel]=useState(String(initialPolicy?.requirements.find(c=>c.capabilityId===(context.capabilityId||initialPolicy.requirements[0]?.capabilityId))?.level||3));
 const [reason,setReason]=useState('');
 const [eventId,setEventId]=useState('');const [level,setLevel]=useState('3');
 const [observed,setObserved]=useState(s.date);const [expires,setExpires]=useState('2026-12-31');const [source,setSource]=useState('');
 const [factId,setFactId]=useState('');const [appealId,setAppealId]=useState(context.tab==='appeals'?context.recordId||'':'');
 const [appealResult,setAppealResult]=useState('维持原结论');
 const assessments=s.assessments.filter(a=>a.personId===personId);
 const open=assessments.filter(a=>a.status!=='已生效');const completed=assessments.filter(a=>a.status==='已生效').slice().reverse();
 const a=assessments.find(a=>a.id===selected&&(tab==='history'?a.status==='已生效':a.status!=='已生效'))||(tab==='history'?completed[0]:open.at(-1));
 const summary=a?assessmentSummary(s,a):null;
 const appeals=s.appeals.filter(ap=>ap.personId===personId);
 const pendingAppeals=appeals.filter(ap=>ap.status!=='已答复').length;
 const currentAppeal=appeals.find(ap=>ap.id===appealId);
 useEffect(()=>{setReason('')},[personId,a?.id,a?.status]);
 const changePerson=(id:string)=>{
  onPerson(id);setSelected('');setReason('');setAppealId('');setTab('queue');
  const policy=s.policies.find(p=>p.roleId===personAt(s,id).roleId);
  if(policy){setScenarioId(policy.scenarioId);setCapabilityId(policy.requirements[0]?.capabilityId||'CAP-04');setTargetLevel(String(policy.requirements[0]?.level||3))}
 };
 const changeTab=(next:string)=>{setTab(next);setSelected('');setReason('')};
 const createAssessment=()=>{
  const id=uid('ASSESS');
  if(mutate(st=>{
   if(!st.catalog.nodes.some(n=>n.id===capabilityId&&n.kind==='capability'&&n.active)||!st.catalog.nodes.some(n=>n.id===scenarioId&&n.kind==='scenario'&&n.active))throw new Error('请选择有效的能力与场景');
   if(st.assessments.some(a=>a.personId===personId&&a.capabilityId===capabilityId&&a.scenarioId===scenarioId&&a.status!=='已生效'))throw new Error('此项能力已有待办，请继续办理');
   st.assessments.push({id,personId,capabilityId,scenarioId,targetLevel:Number(targetLevel),status:'草稿',submitter:'班组评价员（模拟）',reviewer:'',reason:'',factIds:[],version:currentVersion(st),previousLevel:personAt(st,personId).capabilities[capabilityId]?.level??null,resultLevel:null,created:st.date,effective:''});
   addAudit(st,'创建评价',`${nameOf(st,personId)} / ${nameOf(st,capabilityId)}`);
  })){setSelected(id);setTab('queue');setModal('')}
 };
 const addFact=()=>{
  if(mutate(st=>{
   const record=st.assessments.find(x=>x.id===a?.id);if(!record||!editable(record))throw new Error('当前评价不可补充材料');
   if(!eventId.trim()||!source.trim()||!observed||!expires||observed>st.date||expires<observed)throw new Error('请填写事件、来源和有效日期，观察日期不能晚于当前时点');
   if(st.facts.some(f=>f.personId===record.personId&&f.capabilityId===record.capabilityId&&f.scenarioId===record.scenarioId&&f.eventId===eventId.trim()))throw new Error('该事件已记录，请勿重复添加');
   st.facts.push({id:uid('FACT'),personId:record.personId,capabilityId:record.capabilityId,scenarioId:record.scenarioId,eventId:eventId.trim(),source,level:Number(level),observed,expires,quality:true,identity:true,permitted:true,conflict:false});
   addAudit(st,'补充证据',`${nameOf(st,record.personId)} / ${eventId}`);
  }))setModal('');
 };
 const decide=(approve:boolean)=>{
  if(!a||!summary)return;
  if(mutate(st=>reviewAssessment(st,a.id,approve,reason,summary.reviewer))){setReason('');if(approve){setSelected(a.id);setTab('history')}}
 };
 const replyAppeal=()=>{
  if(mutate(st=>{
   const ap=st.appeals.find(x=>x.id===appealId&&x.personId===personId);
   if(!ap||ap.status==='已答复'||!reason.trim())throw new Error('请填写处理说明');
   if(ap.status==='待受理')addAudit(st,'受理员工异议',ap.id);
   ap.status='已答复';ap.reply=reason;ap.outcome=appealResult;
   if(appealResult==='重新评价'){
    const old=st.assessments.find(x=>x.id===ap.assessmentId);if(!old)throw new Error('未找到对应评价');
    if(st.assessments.some(x=>x.personId===old.personId&&x.capabilityId===old.capabilityId&&x.scenarioId===old.scenarioId&&x.status!=='已生效'))throw new Error('此场景能力已有待办评价，请先继续办理');
    st.assessments.push({...old,id:uid('ASSESS'),status:'草稿',previousLevel:old.resultLevel,resultLevel:null,reviewer:'',reason:'',factIds:[],evidenceSnapshot:undefined,standardSnapshot:undefined,roleBehaviorSnapshot:undefined,effective:'',created:st.date,version:currentVersion(st),supersedes:old.id});
   }
   addAudit(st,'异议复核答复',`${ap.id} / ${appealResult} / ${reason}`);
  })){setModal('appeals');setReason('')}
 };

 return <section className="panel evaluation-simple">
  <PanelTitle title="能力评价" sub="提交材料，复核人一次确认后生效。" icon={<ClipboardCheck size={18}/>}><Actions><PersonSearchPicker label="评价人员" value={personId} onChange={changePerson}/><button className="button primary" onClick={()=>setModal('assessment')}><Plus size={15}/>新增评价</button></Actions></PanelTitle>
  <div className="es-toolbar"><Segments value={tab} onChange={changeTab} options={[{value:'queue',label:`当前办理 ${open.length}`},{value:'history',label:`评价记录 ${completed.length}`} ]}/><button className="text-button es-secondary-link" onClick={()=>setModal('appeals')}><MessageSquare size={14}/>异议与答复{pendingAppeals>0&&<span className="es-count">{pendingAppeals}</span>}</button></div>
  {a&&summary?<>
   <div className="es-record-selector">{(tab==='queue'?open:completed).length>1?<Picker label="选择评价事项" value={a.id} onChange={id=>{setSelected(id);setReason('')}} options={(tab==='queue'?open:completed).map(record=>({value:record.id,label:`${nameOf(s,record.capabilityId)} · ${nameOf(s,record.scenarioId)} · ${stateLabel(record)}`}))}/>:<span>{tab==='queue'?'当前办理':'评价记录'} · {nameOf(s,a.scenarioId)}</span>}{tab==='history'&&<small>{a.effective} 确认</small>}</div>
   <div className="es-content" key={a.id}>
    <div className="es-record-heading"><div><h3>{nameOf(s,a.personId)}<span>·</span>{nameOf(s,a.capabilityId)}</h3><p>{nameOf(s,a.scenarioId)}</p></div><Badge tone={a.status==='已生效'?'green':a.status==='待复核'?'blue':'amber'}>{stateLabel(a)}</Badge></div>
    <ol className="es-steps" aria-label="评价办理进度">{['准备材料','一次复核','结果生效'].map((label,index)=><li key={label} className={index<summary.stage?'complete':index===summary.stage?'current':''} aria-current={index===summary.stage?'step':undefined}><span>{index<summary.stage?<Check size={13}/>:index+1}</span>{label}</li>)}</ol>
    <div className="es-result-strip"><div><small>目标等级</small><b>L{a.targetLevel}</b></div><ArrowRight size={17}/><div><small>{a.status==='已生效'?'已确认等级':'材料支持等级'}</small><b>{(a.status==='已生效'?a.resultLevel:summary.check.level)===null?'待核验':`L${a.status==='已生效'?a.resultLevel:summary.check.level}`}</b></div><p>{a.status==='已生效'?a.resultLevel!>=a.targetLevel?'本次评价达到目标要求':'本次结果已确认，仍需继续提升':summary.check.ok?`${summary.check.events} 个独立事件，材料核验通过`:'材料尚未满足提交条件'}</p></div>
    <div className="es-target"><span>本次目标要求</span><p>{summary.targetBehavior||'请查看对应能力的行为标准。'}</p></div>
    <div className={`es-next ${!summary.check.ok&&a.status!=='已生效'?'attention':''}`}>
     <div className="es-next-title"><ClipboardCheck size={17}/><h4>{a.status==='已生效'?'评价已完成':a.status==='待复核'?'复核人确认本次结果':summary.check.ok?'材料已齐，可以提交复核':'补齐材料后再提交'}</h4></div>
     {a.status==='已生效'?<><p>{a.reason}</p><small>{a.reviewer} · {a.effective}</small><Actions><button className="button primary" onClick={()=>onDetail({type:'person',id:a.personId})}>查看能力结果<ArrowRight size={15}/></button><button className="text-button" onClick={()=>{setReason('');setModal('appeal')}}>对结果有异议</button></Actions></>:a.status==='待复核'?<><p>确认材料与实际表现相符后，提交一次复核结论。</p><small>本次复核人：{summary.reviewer}</small>{!summary.canApprove&&<p className="es-error">{a.version!==currentVersion(s)?'标准已更新，请退回后重新提交。':'提交后的材料已发生变化，请退回重新核验。'}</p>}<TextField label="复核说明" value={reason} onChange={setReason}/><Actions><button className="button primary" disabled={!summary.canApprove} onClick={()=>decide(true)}>确认结果并生效</button><button className="button outline" onClick={()=>decide(false)}>退回补充</button></Actions></>:<>{a.status==='已退回'&&<p className="es-error">上次退回：{a.reason}</p>}{summary.check.ok?<p>{summary.check.level!==null&&summary.check.level<a.targetLevel?`现有材料支持 L${summary.check.level}，目标为 L${a.targetLevel}。可以如实提交本次评价，或补充新材料。`:'提交后由复核人确认，当前能力结果在确认前保留。'}</p>:<ul>{summary.check.reasons.map(reason=><li key={reason}>{reason}</li>)}</ul>}<Actions><button className="button primary" disabled={!summary.canSubmit} onClick={()=>mutate(st=>submitAssessment(st,a.id))}>提交复核<ArrowRight size={15}/></button><button className="button outline" onClick={()=>{setEventId('');setSource('');setLevel(String(a.targetLevel));setObserved(s.date);setModal('fact')}}><Plus size={15}/>补充材料</button></Actions></>}
    </div>
    <details className="es-details"><summary><span><FileText size={16}/>材料与核验明细<small>{summary.facts.length} 条记录</small></span><ChevronDown size={16}/></summary><div className="es-details-body"><p className="es-muted">{a.status==='已生效'?'以下保留本次评价确认时的材料。':'同一事件只计一次；材料冲突或过期时，需要补充或说明。'}</p>{summary.facts.length?summary.facts.map(f=><article className="es-fact" key={f.id}><div><b>{f.source||f.eventId}</b><small>{f.observed} 观察 · 有效至 {f.expires}</small><small>事件：{f.eventId}</small></div><div><Badge tone={f.excluded?'gray':f.conflict||!f.quality||!f.identity||!f.permitted||f.expires<(a.effective||s.date)?'amber':'green'}>{f.excluded?'已排除':f.conflict?'有冲突':!f.quality||!f.identity||!f.permitted?'待核验':f.expires<(a.effective||s.date)?'已过期':`观察 L${f.level}`}</Badge>{editable(a)&&<button className="text-button" onClick={()=>{setFactId(f.id);setReason('');setModal('exclude')}}>{f.excluded?'恢复使用':'不采用此材料'}</button>}</div></article>):<p className="es-muted">暂无材料，请先补充独立业务事件。</p>}{summary.observedBehavior&&<div className="es-target"><span>材料支持等级的行为要求</span><p>{summary.observedBehavior}</p></div>}</div></details>
    <details className="es-details"><summary><span><History size={16}/>办理记录与标准</span><ChevronDown size={16}/></summary><div className="es-details-body"><div className="es-record-meta"><span>评价编号<b>{a.id}</b></span><span>标准版本<b>{a.version}</b></span><span>提交人<b>{a.submitter}</b></span><span>原有等级<b>{a.previousLevel===null?'待确认':`L${a.previousLevel}`}</b></span>{a.supersedes&&<span>前序评价<b>{a.supersedes}</b></span>}</div>{s.audit.filter(log=>log.detail.includes(a.id)||summary.facts.some(f=>log.detail.includes(f.id))).slice(0,12).map(log=><div className="es-audit" key={log.id}><span>{log.action}</span><small>{new Date(log.at).toLocaleString('zh-CN')}</small><p>{log.detail}</p></div>)}<p className="es-muted">评价只确认单项能力；登记职级与上岗授权分别办理。</p></div></details>
   </div>
  </>:<div className="es-empty"><ClipboardCheck size={28}/><h3>{tab==='queue'?'暂无待办评价':'暂无已完成评价'}</h3><p>{tab==='queue'?'选择人员后，可以新建一项能力评价。':'完成一次复核确认后，结果会保存在这里。'}</p>{tab==='queue'&&<button className="button outline" onClick={()=>setModal('assessment')}><Plus size={15}/>新增评价</button>}</div>}

  <Modal open={modal==='assessment'} onClose={()=>setModal('')} title={`为${nameOf(s,personId)}新增评价`} sub="确认评价内容后，系统会自动关联已有材料。"><div className="mg-form-grid"><label className="mg-field"><span>评价能力</span><Picker label="新增评价能力" value={capabilityId} onChange={setCapabilityId} options={s.catalog.nodes.filter(n=>n.kind==='capability'&&n.active).map(n=>({value:n.id,label:n.name}))}/></label><label className="mg-field"><span>业务场景</span><Picker label="新增评价场景" value={scenarioId} onChange={setScenarioId} options={s.catalog.nodes.filter(n=>n.kind==='scenario'&&n.active).map(n=>({value:n.id,label:n.name}))}/></label><label className="mg-field"><span>目标等级</span><Picker label="新增评价目标等级" value={targetLevel} onChange={setTargetLevel} options={[1,2,3,4,5].map(v=>({value:String(v),label:`L${v}`}))}/></label></div><Actions><button className="button primary" onClick={createAssessment}>开始评价</button></Actions></Modal>
  <Modal open={modal==='fact'} onClose={()=>setModal('')} title="补充评价材料" sub="记录一个实际业务事件及可核验的表现。本原型使用模拟材料。"><div className="mg-form-grid"><Field label="业务事件编号" placeholder="例如 DEMO-CASE-0907-01" value={eventId} onChange={e=>setEventId(e.target.value)}/><label className="mg-field"><span>观察等级</span><Picker label="证据观察等级" value={level} onChange={setLevel} options={[1,2,3,4,5].map(v=>({value:String(v),label:`L${v}`}))}/></label><Field label="观察日期" type="date" value={observed} onChange={e=>setObserved(e.target.value)}/><Field label="材料有效期至" type="date" value={expires} onChange={e=>setExpires(e.target.value)}/></div><TextField label="材料来源与具体表现" value={source} onChange={setSource}/><Actions><button className="button primary" onClick={addFact}>保存材料</button></Actions></Modal>
  <Modal open={modal==='exclude'} onClose={()=>setModal('')} title={s.facts.find(f=>f.id===factId)?.excluded?'恢复使用材料':'不采用此材料'} sub="说明原因后保存，原始记录会继续保留。"><TextField label="材料处理说明" value={reason} onChange={setReason}/><Actions><button className="button primary" onClick={()=>{if(mutate(st=>{const record=st.assessments.find(x=>x.id===a?.id);const fact=st.facts.find(f=>f.id===factId);if(!record||!editable(record)||!fact||fact.personId!==record.personId||fact.capabilityId!==record.capabilityId||fact.scenarioId!==record.scenarioId)throw new Error('当前材料不可调整');if(!reason.trim())throw new Error('请填写处理说明');fact.excluded=!fact.excluded;addAudit(st,fact.excluded?'排除证据观察':'恢复证据观察',`${fact.id} / ${reason}`)})){setModal('');setReason('')}}}>保存处理</button></Actions></Modal>
  <Modal open={modal==='appeals'} onClose={()=>setModal('')} title={`${nameOf(s,personId)} · 异议与答复`} sub="有异议时记录问题，由复核人一次给出处理结论。"><div className="es-appeals">{appeals.length?appeals.map(ap=><article key={ap.id} className={ap.id===appealId?'selected':''}><div><h3>{nameOf(s,s.assessments.find(x=>x.id===ap.assessmentId)?.capabilityId||'')}</h3><Badge tone={ap.status==='已答复'?'green':'amber'}>{ap.status==='已答复'?'已答复':'待处理'}</Badge></div><p>{ap.reason}</p>{ap.status==='已答复'?<><small>{ap.outcome}</small><p>{ap.reply}</p></>:<button className="button outline" onClick={()=>{setAppealId(ap.id);setReason('');setAppealResult('维持原结论');setModal('appealReply')}}>处理异议</button>}</article>):<p className="es-muted">当前人员暂无异议记录。</p>}</div></Modal>
  <Modal open={modal==='appeal'} onClose={()=>setModal('')} title="提出评价异议" sub="写清有异议的内容。处理期间保留原评价结果。"><TextField label="异议内容与依据" value={reason} onChange={setReason}/><Actions><button className="button primary" onClick={()=>{if(mutate(st=>{if(!a||a.status!=='已生效'||!reason.trim())throw new Error('请填写针对当前评价的异议内容');if(st.appeals.some(ap=>ap.assessmentId===a.id&&ap.status!=='已答复'))throw new Error('此结果已有处理中异议');st.appeals.push({id:uid('APPEAL'),assessmentId:a.id,personId:a.personId,reason,status:'待受理',reply:'',outcome:''});addAudit(st,'提交员工异议',a.id)})){setModal('appeals');setReason('')}}}>提交异议</button></Actions></Modal>
  <Modal open={modal==='appealReply'} onClose={()=>setModal('appeals')} title="答复评价异议" sub="确认需要修正时，建立新的评价，保留原记录。">{currentAppeal&&<p className="es-muted">异议内容：{currentAppeal.reason}</p>}<label className="mg-field"><span>处理结论</span><Picker label="异议处理结果" value={appealResult} onChange={setAppealResult} options={[{value:'维持原结论',label:'维持原结论'},{value:'重新评价',label:'补充材料，重新评价'}]}/></label><TextField label="异议复核说明" value={reason} onChange={setReason}/><Actions><button className="button primary" onClick={replyAppeal}>确认答复</button></Actions></Modal>
 </section>;
}
