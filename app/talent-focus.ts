import {base,nameOf,qualification,type Development,type State} from './management-model';

export type TalentFocusItem={
  capabilityId:string;name:string;currentLevel:number|null;targetLevel:number;
  state:'gap'|'evidence'|'met';reason:string;targetBehavior:string;
  resources:{id:string;name:string;type:string;minutes:number;planned:boolean;trained:boolean}[];
  tasks:{id:string;name:string;output:string}[];
};
export function talentFocus(s:State,d:Development){
  const policy=s.policies.find(p=>p.id===d.targetPolicyId&&p.roleId===d.targetRoleId);
  const ready=!!d.targetConfirmed&&!!policy&&s.catalog.nodes.some(n=>n.id===d.targetRoleId&&n.active);
  if(!ready||!policy)return {ready:false,items:[] as TalentFocusItem[],minSamples:0,roleName:'',scenarioName:'',practice:[] as Development['milestones'],mentorName:d.mentorId?nameOf(s,d.mentorId):'导师待确认'};
  const scenarioTaskIds=s.catalog.edges.filter(e=>e.type==='scenarioTask'&&e.from===policy.scenarioId).map(e=>e.to);
  const items:TalentFocusItem[]=qualification(s,d.personId,policy.id).checks.map(check=>{
    const behaviorId=s.catalog.edges.filter(e=>e.type==='capabilityBehavior'&&e.from===check.capabilityId).map(e=>e.to);
    const targetBehavior=check.behavior||s.catalog.nodes.find(n=>n.active&&behaviorId.includes(n.id)&&n.level===check.level)?.description||'目标行为要求待补充';
    const tasks=s.catalog.nodes.filter(n=>n.kind==='task'&&n.active&&scenarioTaskIds.includes(n.id)&&s.catalog.edges.some(e=>e.type==='taskCapability'&&e.from===n.id&&e.to===check.capabilityId)).filter(n=>{
      const original=base.tasks.find(t=>t.id===n.id);
      return !original||!original.capabilityIds.includes(check.capabilityId)||(original.roleCapabilityMap[policy.roleId]||[]).includes(check.capabilityId);
    }).map(n=>({id:n.id,name:n.name,output:base.tasks.find(t=>t.id===n.id)?.output||''}));
    const resources=base.growthResources.filter(r=>r.capabilityIds.includes(check.capabilityId)&&r.roleIds.includes(policy.roleId)&&r.scenarioIds.includes(policy.scenarioId)).map(r=>{
      const planned=d.resources?.find(item=>item.resourceId===r.id);
      return {id:r.id,name:r.name,type:r.type,minutes:r.durationMinutes,planned:!!planned,trained:!!planned?.trained};
    });
    return {capabilityId:check.capabilityId,name:nameOf(s,check.capabilityId),currentLevel:check.levelNow,targetLevel:check.level,state:check.passed?'met':check.known?'gap':'evidence',reason:check.reason,targetBehavior,resources,tasks};
  });
  return {ready:true,items,minSamples:policy.minSamples,roleName:nameOf(s,d.targetRoleId),scenarioName:policy.name,practice:d.milestones.filter(m=>!m.systemReview),mentorName:d.mentorId?nameOf(s,d.mentorId):'导师待确认'};
}
