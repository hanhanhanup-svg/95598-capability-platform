import {base,personAt,qualification,type State,type Development,type Policy} from './management-model';
import type {configureDevelopment} from './workflow-model';

export type PlanFormValues=Parameters<typeof configureDevelopment>[2];
export type PlanFormContext={editing?:Development;personId?:string;roleId?:string;policyId?:string};
export type PlanFormCheck={capabilityId:string;name:string;currentLevel:number|null;targetLevel:number;behavior:string;passed:boolean;known:boolean;reason:string};
export type PlanFormInfo={policy:Policy|undefined;mentors:{id:string;name:string;team:string}[];checks:PlanFormCheck[];duplicateId:string;missing:string[]};

const hasPerson=(id:string)=>base.people.some(person=>person.id===id);
const mainRole=(state:State,personId:string)=>hasPerson(personId)?personAt(state,personId).roleId:'';

/** Preserve an existing plan exactly; explicit policy context wins for a new plan. */
export function buildPlanForm(state:State,{editing,personId='',roleId='',policyId=''}:PlanFormContext={}):PlanFormValues{
 if(editing)return {
  personId:editing.personId,targetRoleId:editing.targetRoleId,targetPolicyId:editing.targetPolicyId,
  mentorId:editing.mentorId,months:editing.months,wish:editing.wish,
  purpose:editing.purpose??'岗位成长',track:editing.track,
 };
 const requestedPolicy=policyId?state.policies.find(policy=>policy.id===policyId):undefined;
 const targetRoleId=requestedPolicy?.roleId||roleId||mainRole(state,personId);
 const targetPolicyId=policyId||state.policies.find(policy=>policy.roleId===targetRoleId)?.id||'';
 return {personId,targetRoleId,targetPolicyId,mentorId:'',months:3,wish:'',purpose:'岗位成长',track:'专业发展'};
}

/** A new person's wishes and mentor must be confirmed independently. */
export function changePlanPerson(state:State,values:PlanFormValues,newPerson:string):PlanFormValues{
 if(newPerson===values.personId)return {...values};
 const firstSelection=!values.personId;
 const chosenPolicy=firstSelection?state.policies.find(policy=>policy.id===values.targetPolicyId&&state.catalog.nodes.some(node=>node.id===policy.roleId&&node.kind==='role'&&node.active)):undefined;
 const chosenRole=firstSelection?state.catalog.nodes.find(node=>node.id===values.targetRoleId&&node.kind==='role'&&node.active):undefined;
 const targetRoleId=chosenPolicy?.roleId||chosenRole?.id||mainRole(state,newPerson);
 const targetPolicyId=chosenPolicy?.id||state.policies.find(policy=>policy.roleId===targetRoleId)?.id||'';
 return {...values,personId:newPerson,targetRoleId,targetPolicyId,mentorId:'',wish:''};
}

/** Read-only preview and completion messages, aligned with configureDevelopment. */
export function planFormInfo(state:State,values:PlanFormValues,editId=''):PlanFormInfo{
 const missing:string[]=[];
 const person=base.people.find(person=>person.id===values.personId);
 const role=state.catalog.nodes.find(node=>node.id===values.targetRoleId&&node.kind==='role'&&node.active);
 const requestedPolicy=state.policies.find(policy=>policy.id===values.targetPolicyId);
 const policy=role&&requestedPolicy?.roleId===role.id?requestedPolicy:undefined;
 const editing=editId?state.development.find(plan=>plan.id===editId):undefined;

 if(!person)missing.push(values.personId?'所选培养人员已不存在，请重新选择。':'请选择培养人员。');
 if(!role)missing.push(values.targetRoleId?'所选目标岗位已停用或不存在，请重新选择。':'请选择目标岗位。');
 if(!requestedPolicy)missing.push(values.targetPolicyId?'所选目标场景已不存在，请重新选择。':'请选择目标场景。');
 else if(requestedPolicy.roleId!==values.targetRoleId)missing.push('目标场景与岗位不对应，请重新选择目标场景。');
 if(editId&&!editing)missing.push('原培养计划已不存在，请关闭后重新建立计划。');
 if(editing&&editing.personId!==values.personId)missing.push('已有培养计划不能更换人员，请为新人员另建计划。');
 if(editing?.targetConfirmed)missing.push('这份计划的目标已确认，如需调整目标，请建立新的计划。');

 const mentors=policy?base.people.filter(candidate=>candidate.id!==values.personId&&qualification(state,candidate.id,policy.id).status==='达标').map(candidate=>({id:candidate.id,name:candidate.name,team:personAt(state,candidate.id).team})):[];
 if(!values.mentorId)missing.push(policy&&!mentors.length?'当前没有满足目标场景要求的导师，请先完善导师条件或调整目标。':'请选择培养导师。');
 else if(values.mentorId===values.personId)missing.push('培养导师不能是本人，请选择其他人员。');
 else if(!hasPerson(values.mentorId))missing.push('所选导师已不存在，请重新选择。');
 else if(policy&&!mentors.some(mentor=>mentor.id===values.mentorId))missing.push('所选导师尚未满足此目标场景的能力与证据要求，请重新选择。');
 if(!values.wish.trim())missing.push('请填写本人发展意愿或沟通记录。');
 if(!Number.isInteger(values.months)||values.months<1||values.months>24)missing.push('培养周期请填写 1 至 24 的整数月数。');
 if(!['岗位成长','后备培养'].includes(values.purpose))missing.push('请选择有效的计划类型。');
 if(!['专业发展','管理发展'].includes(values.track))missing.push('请选择有效的发展通道。');

 const duplicate=person&&policy?state.development.find(plan=>plan.id!==editId&&plan.personId===person.id&&plan.targetPolicyId===policy.id&&plan.status!=='后备就绪'):undefined;
 if(duplicate)missing.push('此人员已有相同目标场景的在途计划，请继续办理已有计划。');

 const checks:PlanFormCheck[]=person&&policy?qualification(state,person.id,policy.id).checks.map(check=>{
  const behavior=check.behavior?.trim()||state.catalog.nodes.find(node=>node.kind==='behavior'&&node.active&&node.level===check.level&&state.catalog.edges.some(edge=>edge.type==='capabilityBehavior'&&edge.from===check.capabilityId&&edge.to===node.id))?.description?.trim()||'';
  return {capabilityId:check.capabilityId,name:state.catalog.nodes.find(node=>node.id===check.capabilityId)?.name||check.capabilityId,currentLevel:check.known?check.levelNow:null,targetLevel:check.level,behavior,passed:check.passed,known:check.known,reason:check.reason};
 }):[];
 return {policy,mentors,checks,duplicateId:duplicate?.id||'',missing};
}
