import {activeAssignments,addAudit,authorizationStatus,base,nameOf,qualification,uid,type Authorization,type State} from './management-model';

export type AuthorizationInput={personId:string;policyId:string;mode:Authorization['mode'];mentorId:string;start:string;end:string;reason:string;expectedVersion:string;requestId?:string};
const validDate=(value:string)=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;
const assignedAt=(s:State,personId:string,roleId:string,date=s.date)=>activeAssignments(s,date).some(a=>a.personId===personId&&s.positions.some(p=>p.id===a.positionId&&p.roleId===roleId));

export function authorizationReadiness(s:State,personId:string,policyId:string){
 const policy=s.policies.find(p=>p.id===policyId);
 if(!policy||!base.people.some(p=>p.id===personId))throw new Error('请选择有效的人员与上岗场景');
 const q=qualification(s,personId,policyId);
 const assigned=assignedAt(s,personId,policy.roleId);
 const mentors=base.people.filter(p=>p.id!==personId&&authorizationStatus(s,p.id,policyId).independent);
 const independent=assigned&&q.status==='达标';
 const guided=assigned&&policy.allowGuided&&q.status!=='依据不足'&&!q.criticalGap&&mentors.length>0;
 const missing:string[]=[];
 if(!assigned)missing.push('尚无适用岗位任职');
 if(q.status==='依据不足')missing.push('先补齐或复核未通过的证据');
 if(q.criticalGap)missing.push('关键能力尚未达到场景要求');
 else if(q.status==='存在能力差距')missing.push(guided?'可先在有效指导人带教下承担':'部分能力尚未达到独立承担要求');
 if(!independent&&policy.allowGuided&&q.status!=='依据不足'&&!q.criticalGap&&!mentors.length)missing.push('当前没有具备有效独立授权的指导人');
 return {policy,q,assigned,mentors,independent,guided,missing};
}

/** Shared by the single confirmation action and legacy pending requests. All checks precede writes. */
export function validateAuthorization(s:State,input:AuthorizationInput){
 const {policy,q,assigned}=authorizationReadiness(s,input.personId,input.policyId);
 if(!input.reason.trim())throw new Error('请填写确认依据');
 if(input.expectedVersion!==policy.version)throw new Error('场景要求已更新，请刷新后按当前要求确认');
 let values=input;
 if(input.requestId){
  const pending=s.authorizations.find(a=>a.id===input.requestId&&a.personId===input.personId&&a.policyId===input.policyId);
  if(!pending||pending.status!=='待审批')throw new Error('该申请已处理，请查看最新状态');
  if(pending.version!==policy.version)throw new Error('申请标准已更新，请退回后按当前要求重新确认');
  values={...input,mode:pending.mode,mentorId:pending.mentorId,start:pending.start,end:pending.end};
 }else if(s.authorizations.some(a=>a.personId===input.personId&&a.policyId===input.policyId&&a.status==='待审批'))throw new Error('已有待确认申请，请先办理该申请');
 if(!validDate(values.start)||!validDate(values.end)||values.end<values.start||values.end<s.date)throw new Error('请填写有效的授权期限，截止日期不能早于当前日期');
 if(!assigned||!assignedAt(s,input.personId,policy.roleId,values.start>s.date?values.start:s.date))throw new Error('授权开始时须有适用岗位任职，请先办理任职');
 if(!policy.requirements.length||policy.requirements.some(r=>!s.catalog.nodes.some(n=>n.id===r.capabilityId&&n.active)))throw new Error('场景能力要求不完整，请先核对标准');
 if(values.mode==='独立'){
  if(q.status!=='达标')throw new Error('逐项能力和场景证据尚未满足独立授权条件');
 }else if(values.mode==='指导'){
  if(!policy.allowGuided||q.status==='依据不足'||q.criticalGap)throw new Error('指导承担仍须满足关键能力与证据要求');
  if(!values.mentorId||values.mentorId===input.personId||!base.people.some(p=>p.id===values.mentorId))throw new Error('请选择其他人员担任有效指导人');
  const mentor=authorizationStatus(s,values.mentorId,policy.id);
  if(!mentor.independent||!mentor.auth||mentor.auth.end<values.end||mentor.auth.start>values.start||!assignedAt(s,values.mentorId,policy.roleId,values.start>s.date?values.start:s.date))throw new Error('指导人须具备覆盖本次期限的有效独立授权与任职');
 }else throw new Error('请选择独立承担或指导下承担');
 if(!input.requestId&&s.authorizations.some(a=>a.personId===input.personId&&a.policyId===input.policyId&&a.status==='有效'&&a.version===policy.version&&a.mode===values.mode&&a.start===values.start&&a.end===values.end&&(a.mode==='独立'||a.mentorId===values.mentorId)))throw new Error('已有相同范围的有效授权，无需重复确认');
 return {...values,mentorId:values.mode==='指导'?values.mentorId:'',version:policy.version};
}

export function confirmAuthorization(s:State,input:AuthorizationInput){
 const valid=validateAuthorization(s,input);
 let record=input.requestId?s.authorizations.find(a=>a.id===input.requestId)!:null;
 if(!record){
  record={id:uid('AUTH'),personId:valid.personId,policyId:valid.policyId,mode:valid.mode,mentorId:valid.mentorId,start:valid.start,end:valid.end,version:valid.version,status:'待审批',reviewer:'',reason:valid.reason.trim()};
  s.authorizations.push(record);
  addAudit(s,'提交场景授权申请',`${record.id} / ${nameOf(s,record.personId)} / ${nameOf(s,s.policies.find(p=>p.id===record!.policyId)!.scenarioId)} / ${record.mode} / ${record.start}—${record.end}`);
 }
 record.status='有效';record.version=valid.version;record.reason=valid.reason.trim();record.reviewer='场景授权主管（模拟）';
 addAudit(s,'场景授权确认',`${record.id} / ${record.reviewer} / ${record.reason}`);
 return record.id;
}

export function returnAuthorization(s:State,id:string,personId:string,policyId:string,reason:string){
 if(!reason.trim())throw new Error('请填写退回原因');
 const record=s.authorizations.find(a=>a.id===id&&a.personId===personId&&a.policyId===policyId);
 if(!record||record.status!=='待审批')throw new Error('该申请已处理，请查看最新状态');
 record.status='退回';record.reviewer='场景授权主管（模拟）';record.reason=reason.trim();
 addAudit(s,'场景授权退回',`${record.id} / ${record.reason}`);
}

export function pauseAuthorization(s:State,id:string,personId:string,policyId:string,reason:string){
 if(!reason.trim())throw new Error('请填写暂停原因');
 const record=s.authorizations.find(a=>a.id===id&&a.personId===personId&&a.policyId===policyId);
 if(!record||record.status!=='有效')throw new Error('仅有效授权可以暂停');
 record.status='暂停';record.reason=reason.trim();
 addAudit(s,'暂停场景授权',`${record.id} / ${record.reason}`);
}
