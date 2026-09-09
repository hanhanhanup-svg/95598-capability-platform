'use client';
import {useEffect,useState} from 'react';
import {ArrowRight,CheckCircle2,ChevronDown,ShieldCheck,Users} from 'lucide-react';
import type {WorkContext} from './workflow-model';
import {useManagement} from './management-context';
import {activeAssignments,authorizationStatus,base,nameOf,personAt,type Authorization} from './management-model';
import {authorizationReadiness,confirmAuthorization,pauseAuthorization,returnAuthorization,validateAuthorization} from './authorization-actions';
import {Badge,DataTable,Picker} from './ui-parts';
import {Actions,Field,TextField} from './management-ui';
import {PersonSearchPicker} from './person-search-picker';

export function AuthorizationView({personId,onNavigate,onPerson,context={},onOpen}:{personId:string;onNavigate:(p:string)=>void;onPerson:(id:string)=>void;context?:WorkContext;onOpen?:(page:string,context?:WorkContext)=>void}){
 const {state:s,mutate}=useManagement();
 const initialPolicy=s.policies.find(p=>p.id===context.policyId)||s.policies.find(p=>p.scenarioId===context.scenarioId&&p.roleId===personAt(s,personId).roleId)||s.policies.find(p=>p.roleId===personAt(s,personId).roleId)||s.policies[0];
 const [policyId,setPolicyId]=useState(initialPolicy.id);
 const [showAll,setShowAll]=useState(false);
 const [mode,setMode]=useState<Authorization['mode']>('独立');
 const [mentor,setMentor]=useState('');
 const [start,setStart]=useState(s.date);
 const [end,setEnd]=useState(`${s.date.slice(0,4)}-12-31`);
 const [reason,setReason]=useState('');
 const [editing,setEditing]=useState(false);
 const [pausing,setPausing]=useState(false);
 const policy=s.policies.find(p=>p.id===policyId)||s.policies[0];
 const status=authorizationStatus(s,personId,policy.id);
 const readiness=authorizationReadiness(s,personId,policy.id);
 const pending=status.pending;
 const current=status.auth;
 const usableCurrent=current?.status==='有效'&&current.end>=s.date&&current.version===policy.version&&(status.independent||status.label==='需指导承担');
 useEffect(()=>{setReason('');setEditing(false);setPausing(false);setStart(s.date);setEnd(`${s.date.slice(0,4)}-12-31`);setMode('独立');setMentor('')},[personId,policy.id,s.date]);
 const selectedMode=pending?.mode||mode;
 const selectedMentor=pending?.mentorId||mentor;
 const selectedStart=pending?.start||start;
 const selectedEnd=pending?.end||end;
 const input={personId,policyId:policy.id,mode:selectedMode,mentorId:selectedMentor,start:selectedStart,end:selectedEnd,reason,expectedVersion:policy.version,requestId:pending?.id};
 let approvalIssue='';
 try{validateAuthorization(s,{...input,reason:reason.trim()||'待填写确认依据'})}catch(error){approvalIssue=error instanceof Error?error.message:'请先完善授权条件'}
 const rows=base.people.filter(p=>showAll||activeAssignments(s).some(a=>a.personId===p.id&&s.positions.some(pos=>pos.id===a.positionId&&pos.roleId===policy.roleId)));
 const openEvaluation=()=>{const capabilityId=readiness.q.checks.find(c=>!c.passed)?.capabilityId;const next={personId,policyId:policy.id,scenarioId:policy.scenarioId,...(capabilityId?{capabilityId}:{})};if(onOpen)onOpen('evaluation',next);else onNavigate('evaluation')};
 const confirm=()=>{if(mutate(st=>{confirmAuthorization(st,input)})){setReason('');setEditing(false)}};
 const history=s.authorizations.filter(a=>a.personId===personId&&a.policyId===policy.id).slice().reverse();
 return <section className="authorization-simple">
  <div className="panel auth-simple-toolbar">
   <div><h2><ShieldCheck size={19}/>场景上岗授权</h2><p>选定人员与场景，核对条件后由主管一次确认。</p></div>
   <div className="auth-simple-selectors">
    <label><span>人员</span><PersonSearchPicker label="授权人员" value={personId} onChange={onPerson}/></label>
    <label><span>上岗场景</span><Picker label="上岗业务场景" value={policy.id} onChange={setPolicyId} options={s.policies.map(p=>({value:p.id,label:p.name}))}/></label>
   </div>
  </div>
  <div className="auth-simple-workspace">
   <aside className="panel auth-simple-roster" aria-label="场景人员状态">
    <div className="auth-roster-heading"><b><Users size={16}/>人员状态</b><span>{rows.length} 人</span></div>
    <p className="auth-roster-scope">{showAll?'全中心人员':nameOf(s,policy.roleId)}</p>
    <div className="auth-roster-list">{rows.length?rows.map(p=>{const item=authorizationStatus(s,p.id,policy.id);return <button type="button" key={p.id} className={`auth-person-row${p.id===personId?' is-selected':''}`} aria-pressed={p.id===personId} onClick={()=>onPerson(p.id)}><span className="auth-person-avatar" aria-hidden="true">{p.name.slice(-2)}</span><span><b>{p.name}</b><small>{personAt(s,p.id).team}</small></span><Badge tone={item.tone}>{item.label}</Badge></button>}):<p className="auth-roster-empty">该场景暂无适用岗位任职人员。</p>}</div>
    <details className="auth-roster-more"><summary>更多人员范围<ChevronDown size={14}/></summary><label><input type="checkbox" checked={showAll} onChange={e=>setShowAll(e.target.checked)}/>包含跨岗候选人员</label></details>
   </aside>
   <div className="panel auth-simple-card">
    <div className="auth-card-heading"><div><span className="auth-card-kicker">当前办理</span><h3>{nameOf(s,personId)}<span>· {policy.name}</span></h3></div><Badge tone={status.tone}>{status.label}</Badge></div>
    <div className={`auth-readiness${readiness.independent?' is-ready':''}`}>
     <div className="auth-readiness-title"><ShieldCheck size={20}/><b>{pending?'申请待确认':status.independent?'已取得独立上岗授权':status.label==='需指导承担'?'已取得指导下上岗授权':readiness.independent?'已满足独立授权条件':readiness.guided?'可在指导下承担':'请先补齐上岗条件'}</b></div>
     <p>{readiness.missing.length?readiness.missing.join('；'):pending?'核对申请内容，确认后授权生效。':status.reason}</p>
     <div className="auth-condition-line"><span className={readiness.assigned?'is-passed':''}>{readiness.assigned&&<CheckCircle2 size={13}/>}岗位任职{readiness.assigned?'已满足':'待补齐'}</span><span className={readiness.q.status==='达标'?'is-passed':''}>{readiness.q.status==='达标'&&<CheckCircle2 size={13}/>}能力与证据 {readiness.q.checks.filter(c=>c.passed).length}/{readiness.q.checks.length} 项通过</span></div>
    </div>
    {usableCurrent&&!pending&&!editing&&<div className="auth-current-summary"><dl><div><dt>承担方式</dt><dd>{current.mode==='独立'?'独立承担':`指导下承担 · ${nameOf(s,current.mentorId)}`}</dd></div><div><dt>授权期限</dt><dd>{current.start} 至 {current.end}</dd></div></dl><Actions><button type="button" className="button outline" onClick={()=>{setEditing(true);setMode(current.mode);setMentor(current.mentorId);setStart(s.date);setEnd(current.end);setReason('')}}>调整授权</button><button type="button" className="text-button" onClick={()=>{setPausing(v=>!v);setReason('')}}>{pausing?'取消暂停':'暂停授权'}</button></Actions>{pausing&&<div className="auth-pause-form"><TextField label="暂停原因" value={reason} onChange={setReason}/><button type="button" className="button outline" disabled={!reason.trim()} onClick={()=>{if(mutate(st=>pauseAuthorization(st,current.id,personId,policy.id,reason))){setPausing(false);setReason('')}}}>确认暂停</button></div>}</div>}
    {(!usableCurrent||pending||editing)&&<div className="auth-confirm-form">
     <div className="auth-form-title"><h4>{pending?'确认申请':editing?'调整授权':'确认授权'}</h4><span>场景主管确认 · 模拟</span></div>
     {pending?<div className="auth-pending-summary"><b>{pending.mode==='独立'?'独立承担':`指导下承担 · ${nameOf(s,pending.mentorId)}`}</b><span>{pending.start} 至 {pending.end}</span>{pending.reason&&<p>申请说明：{pending.reason}</p>}</div>:<div className="auth-form-fields">
      <label className="mg-field"><span>承担方式</span><Picker label="授权承担方式" value={mode} onChange={v=>setMode(v as Authorization['mode'])} options={[{value:'独立',label:'独立承担'},...(policy.allowGuided?[{value:'指导',label:'指导下承担'}]:[])]}/></label>
      {mode==='指导'&&<label className="mg-field"><span>指导人</span><Picker label="场景指导人" value={mentor} onChange={setMentor} options={[{value:'',label:readiness.mentors.length?'请选择指导人':'暂无有效指导人'},...readiness.mentors.map(p=>({value:p.id,label:p.name}))]}/></label>}
      <Field label="开始日期" type="date" value={start} onChange={e=>setStart(e.target.value)}/><Field label="截止日期" type="date" value={end} onChange={e=>setEnd(e.target.value)}/>
     </div>}
     {approvalIssue&&<p className="auth-action-hint">{approvalIssue}</p>}
     <TextField label={pending?'确认依据或退回原因':'确认依据'} value={reason} onChange={setReason}/>
     <Actions><button type="button" className="button primary" disabled={!!approvalIssue||!reason.trim()} onClick={confirm}>确认授权</button>{pending&&<button type="button" className="button outline" disabled={!reason.trim()} onClick={()=>{if(mutate(st=>returnAuthorization(st,pending.id,personId,policy.id,reason)))setReason('')}}>退回补充</button>}{editing&&<button type="button" className="text-button" onClick={()=>{setEditing(false);setReason('')}}>取消</button>}{(!readiness.independent||approvalIssue)&&<button type="button" className="text-button" onClick={openEvaluation}>去能力评价<ArrowRight size={14}/></button>}</Actions>
     {current?.status==='有效'&&!usableCurrent&&!pending&&<details className="auth-pause-expander"><summary>暂停原授权</summary><p>填写上方依据后，可暂停当前仍标记为有效的授权。</p><button type="button" className="button outline" disabled={!reason.trim()} onClick={()=>{if(mutate(st=>pauseAuthorization(st,current.id,personId,policy.id,reason)))setReason('')}}>确认暂停原授权</button></details>}
    </div>}
    <details className="auth-simple-detail"><summary><span>查看逐项核验</span><small>{readiness.q.checks.length} 项能力</small><ChevronDown size={16}/></summary><div className="auth-detail-body"><p className="auth-detail-caption">{policy.version} · 每项至少 {policy.minSamples} 个独立事件</p><DataTable headers={['能力要求','当前情况','核验结果']} rows={readiness.q.checks.map(c=>[<div><b>{nameOf(s,c.capabilityId)} · L{c.level}</b>{c.critical&&<Badge tone="amber">关键能力</Badge>}{c.behavior&&<small className="cell-note">{c.behavior}</small>}</div>,<div>{c.levelNow===null?'等级待确认':`当前 L${c.levelNow}`}<small className="cell-note">{c.samples}/{policy.minSamples} 个独立事件</small></div>,<Badge tone={c.passed?'green':c.known?'amber':'gray'}>{c.passed?'已满足':c.reason}</Badge>])}/></div></details>
    <details className="auth-simple-detail"><summary><span>授权记录</span><small>{history.length} 条</small><ChevronDown size={16}/></summary><div className="auth-history-list">{history.length?history.map(a=><article key={a.id}><div><b>{a.mode==='独立'?'独立承担':`指导下承担 · ${nameOf(s,a.mentorId)}`}</b><Badge tone={a.status==='有效'?'green':a.status==='待审批'?'blue':'gray'}>{a.status==='待审批'?'待确认':a.status}</Badge></div><p>{a.start} 至 {a.end}</p><p>{a.reason}</p><small>{a.reviewer||'待主管确认'} · {a.version} · {a.id}</small></article>):<p className="auth-detail-caption">暂无授权记录。</p>}</div></details>
   </div>
  </div>
 </section>;
}
