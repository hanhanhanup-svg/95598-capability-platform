'use client';
import {useState} from 'react';
import {ArrowRight,Check,ChevronDown,GraduationCap,Target,UserRound} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {useManagement} from './management-context';
import {nameOf,personAt,type Development} from './management-model';
import {configureDevelopment} from './workflow-model';
import {PersonSearchPicker} from './person-search-picker';
import {buildPlanForm,changePlanPerson,planFormInfo} from './talent-plan-form';

export function TalentPlanDialog({editing,initialPersonId,initialRoleId,initialPolicyId,onClose,onSaved,onExisting}:{editing?:Development;initialPersonId?:string;initialRoleId?:string;initialPolicyId?:string;onClose:()=>void;onSaved:(id:string,personId:string)=>void;onExisting:(id:string,personId:string)=>void}){
 const {state:s,mutate}=useManagement();
 const [values,setValues]=useState(()=>buildPlanForm(s,{editing,personId:initialPersonId,roleId:initialRoleId,policyId:initialPolicyId}));
 const [error,setError]=useState('');
 const info=planFormInfo(s,values,editing?.id);
 const person=values.personId?personAt(s,values.personId):null;
 const roles=s.catalog.nodes.filter(n=>n.kind==='role'&&n.active);
 const policies=s.policies.filter(p=>p.roleId===values.targetRoleId);
 const followups=info.checks.filter(check=>!check.passed);
 const preview=followups.length?followups:info.checks;
 const set=(patch:Partial<typeof values>)=>{setValues(v=>({...v,...patch}));setError('')};
 const choosePerson=(id:string)=>{setValues(v=>changePlanPerson(s,v,id));setError('')};
 const save=()=>{
  if(info.missing.length){setError(info.missing[0]);return}
  let savedId='',failure='';
  const ok=mutate(st=>{try{savedId=configureDevelopment(st,editing?.id||'',values)}catch(e){failure=e instanceof Error?e.message:'保存未完成，请核对填写内容。';throw e}});
  if(ok)onSaved(savedId,values.personId);else setError(failure||'当前记录暂时无法保存，请确认观察日期不是历史时点后重试。');
 };
 const goalItem=(check:typeof info.checks[number])=><li key={check.capabilityId}><div><b>{check.name}</b><span>{check.currentLevel===null?'待核验':`当前 L${check.currentLevel}`}<ArrowRight size={12}/>目标 L{check.targetLevel}</span></div><p>{check.behavior}</p><small className={check.passed?'is-met':''}>{check.passed?'已满足，可在实践中巩固':check.known?'重点练习并提交实践记录':'先补充可核验材料，再确认能力差距'}</small></li>;
 return <Dialog open onOpenChange={open=>{if(!open)onClose()}}><DialogContent className="talent-create-dialog">
  <DialogHeader className="talent-create-header"><span className="talent-create-eyebrow"><GraduationCap size={16}/>培养发展</span><DialogTitle>{editing?'完善培养目标':'建立培养计划'}</DialogTitle><DialogDescription>选好人员和目标，再安排导师与时间。</DialogDescription></DialogHeader>
  <div className="talent-create-body">
   <div className="talent-create-fields">
    <section aria-labelledby="talent-create-person"><h3 id="talent-create-person"><span>1</span>培养谁</h3><div className="talent-create-person"><UserRound size={23}/><div><b>{person?nameOf(s,values.personId):'选择一位培养人员'}</b><p>{person?`${person.team} · ${values.personId}`:'支持按姓名或工号搜索'}</p></div>{!editing&&<PersonSearchPicker label="选择培养人员" value={values.personId} onChange={choosePerson}/>}</div>{editing&&<p className="talent-create-help">保留此人的历史学习和实践记录。</p>}</section>
    <section aria-labelledby="talent-create-goal"><h3 id="talent-create-goal"><span>2</span>培养什么</h3><div className="talent-create-pair"><label>目标岗位<select aria-label="目标岗位" value={values.targetRoleId} onChange={e=>set({targetRoleId:e.target.value,targetPolicyId:s.policies.find(p=>p.roleId===e.target.value)?.id||'',mentorId:''})}><option value="">选择岗位</option>{roles.map(role=><option key={role.id} value={role.id}>{role.name}</option>)}</select></label><label>想胜任的业务<select aria-label="想胜任的业务" value={values.targetPolicyId} disabled={!values.targetRoleId} onChange={e=>set({targetPolicyId:e.target.value,mentorId:''})}><option value="">选择业务目标</option>{policies.map(policy=><option key={policy.id} value={policy.id}>{policy.name}</option>)}</select></label></div><p className="talent-create-help">能力要求随业务目标带出，无需逐项填写。</p>{info.duplicateId&&<div className="talent-create-warning"><p>此人已有相同目标的培养计划，可以直接继续。</p><button type="button" onClick={()=>onExisting(info.duplicateId,values.personId)}>查看已有计划<ArrowRight size={14}/></button></div>}</section>
    <section aria-labelledby="talent-create-arrange"><h3 id="talent-create-arrange"><span>3</span>怎么安排</h3><div className="talent-create-pair"><label>带教导师<select aria-label="带教导师" value={values.mentorId} disabled={!values.personId||!info.policy||!info.mentors.length} onChange={e=>set({mentorId:e.target.value})}><option value="">{!values.personId?'先选择培养人员':!info.policy?'先选择业务目标':!info.mentors.length?'暂没有符合条件的导师':'选择带教导师'}</option>{info.mentors.map(mentor=><option key={mentor.id} value={mentor.id}>{mentor.name} · {mentor.team}</option>)}</select></label><label>培养多久<div className="talent-create-months"><input type="number" aria-label="培养周期（月）" min={1} max={24} value={Number.isNaN(values.months)?'':values.months} onChange={e=>set({months:e.target.value===''?NaN:Number(e.target.value)})}/><span>个月</span></div></label></div>{values.personId&&info.policy&&!info.mentors.length?<p className="talent-create-help is-warning">暂没有满足该目标能力与证据要求的导师，请调整目标或待导师条件补齐后再建立。</p>:<p className="talent-create-help">导师名单已按目标要求筛选；培养周期可填 1–24 个月。</p>}<label className="talent-create-wish">本人的培养意愿<span>简单记录沟通结果</span><textarea aria-label="本人的培养意愿" value={values.wish} onChange={e=>set({wish:e.target.value})} placeholder="例如：已与本人沟通，希望提升复杂故障判断能力，愿意参加跟班实践。" rows={2}/></label></section>
    <details className="talent-create-more"><summary>更多设置<span>{values.purpose} · {values.track}</span><ChevronDown size={14}/></summary><div className="talent-create-pair"><label>计划用途<select aria-label="计划用途" value={values.purpose} onChange={e=>set({purpose:e.target.value as typeof values.purpose})}><option value="岗位成长">岗位成长 · 提升履职能力</option><option value="后备培养">后备培养 · 储备后备人员</option></select></label><label>发展方向<select aria-label="发展方向" value={values.track} onChange={e=>set({track:e.target.value as typeof values.track})}><option value="专业发展">专业发展</option><option value="管理发展">管理发展</option></select></label></div></details>
   </div>
   <aside className="talent-create-preview" aria-label="培养内容预览" aria-live="polite"><div className="talent-create-preview-title"><Target size={18}/><h3>将要培养的内容</h3></div>{!person||!info.policy?<div className="talent-create-empty"><p>选好人员和业务目标后，这里会展示需要提升的能力。</p><small>目标等级、具体要求自动对应。</small></div>:<><p className="talent-create-preview-person">{nameOf(s,values.personId)} · {info.policy.name}</p><div className="talent-create-preview-count"><strong>{followups.length}</strong><span>{followups.length?'项需要跟进':'项待提升，当前要求均已满足'}</span><small>共 {info.checks.length} 项目标要求</small></div><ul>{preview.slice(0,3).map(goalItem)}</ul>{preview.length>3&&<details className="talent-create-extra"><summary>查看其余 {preview.length-3} 项要求<ChevronDown size={14}/></summary><ul>{preview.slice(3).map(goalItem)}</ul></details>}<div className="talent-create-practice"><Check size={15}/><p>计划建立后，记录跟班实践、案例复盘和导师反馈，再按目标要求验证。</p></div></>}</aside>
  </div>
  <div className="talent-create-footer"><div>{error?<p role="alert" className="talent-create-error">{error}</p>:<p>{info.missing[0]||`将为${nameOf(s,values.personId)}建立 ${values.months} 个月的培养计划。`}</p>}<small>保存后可记录学习与实践；不自动变更星级或上岗授权。</small></div><div><button type="button" className="button outline" onClick={onClose}>取消</button><button type="button" className="button primary" disabled={!!info.missing.length} onClick={save}>{editing?'保存目标':'建立计划'}</button></div></div>
 </DialogContent></Dialog>;
}
