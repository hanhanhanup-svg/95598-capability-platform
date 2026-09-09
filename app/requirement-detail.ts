import {db, capabilities, roles, requirements, scenarios, peopleFor, type Scenario, type Task} from './model';

export type RequirementDetailInput = {
 capabilityId:string;
 roleId?:string;
 level?:number;
 star?:number;
};

export type RequirementTaskDetail = Pick<Task,'id'|'name'|'action'|'output'> & {
 completionCriteria:string;
 scenarioNames:string[];
};

export type RequirementSourceDetail = {
 id:string;
 name:string;
 system:string;
 purpose:string;
};

export type RequirementDetail = {
 scenarios:Pick<Scenario,'id'|'name'|'trigger'>[];
 tasks:RequirementTaskDetail[];
 totalTasks:number;
 evidenceTypes:string[];
 sources:RequirementSourceDetail[];
 notes:string[];
};

const unique = (values:string[]) => [...new Set(values.filter(Boolean))];
const emptyDetail = (note:string):RequirementDetail => ({scenarios:[],tasks:[],totalTasks:0,evidenceTypes:[],sources:[],notes:[note]});

/** Read-only context for understanding a requirement; the original level wording stays in the caller. */
export function getRequirementDetail({capabilityId,roleId,level,star}:RequirementDetailInput):RequirementDetail {
 if(!capabilities.some(capability=>capability.id===capabilityId))return emptyDetail('当前资料未登记这项能力的关联场景、任务或参考资料。');
 const role=roleId?roles.find(item=>item.id===roleId):undefined;
 if(roleId&&!role)return emptyDetail('当前资料未登记所选岗位，暂无法确认其关联任务。');

 const notes:string[]=[];
 const target=roleId&&star!==undefined?requirements.find(item=>item.roleId===roleId&&item.capabilityId===capabilityId&&item.star===star):undefined;
 if(roleId&&star!==undefined&&!target)notes.push('当前资料未登记所选星档的这项能力要求，以下仅展示已有的岗位任务关联。');
 if(target&&level!==undefined&&target.targetLevel!==level)notes.push(`所选 L${level} 与该岗位 ${star} 星的登记目标 L${target.targetLevel} 不同，以下任务用于说明这项能力的业务应用。`);

 const linkedTasks=db.tasks.filter(task=>{
  const mapping=task.roleCapabilityMap;
  // A published role mapping is authoritative, including an absent or empty entry for this role.
  const mapped=!!mapping;
  const matches=roleId
   ? mapped?(mapping[roleId]||[]).includes(capabilityId):!!role?.taskIds.includes(task.id)&&task.capabilityIds.includes(capabilityId)
   : mapped?Object.values(mapping).some(ids=>ids.includes(capabilityId)):task.capabilityIds.includes(capabilityId);
  if(!matches)return false;
  if(target?.scenarioIds.length&&!task.scenarioIds.some(id=>target.scenarioIds.includes(id)))return false;
  return true;
 }).sort((a,b)=>a.sequence-b.sequence||a.id.localeCompare(b.id));

 if(!linkedTasks.length)return emptyDetail(roleId?'当前资料尚未明确登记这项能力在所选岗位中的任务关联，暂不列出场景、任务及参考证据。':'当前资料尚未明确登记这项能力的任务关联，暂不列出场景、任务及参考证据。');

 const taskScenarioIds=new Set(linkedTasks.flatMap(task=>task.scenarioIds));
 const linkedScenarios=scenarios.filter(scenario=>taskScenarioIds.has(scenario.id)&&(!roleId||scenario.roleIds.includes(roleId))&&(!target?.scenarioIds.length||target.scenarioIds.includes(scenario.id)));
 const scenarioIds=new Set(linkedScenarios.map(scenario=>scenario.id));
 const rolePeople=roleId?new Set(peopleFor(roleId).map(person=>person.id)):undefined;
 // Only aggregate reference types and source catalog metadata; never return employee or evidence instances.
 const linkedEvidence=db.evidence.filter(evidence=>evidence.capabilityIds.includes(capabilityId)&&evidence.scenarioIds.some(id=>scenarioIds.has(id))&&(!rolePeople||rolePeople.has(evidence.employeeId)));
 const sourceIds=new Set(linkedEvidence.map(evidence=>evidence.assetId));
 const evidenceTypes=unique(linkedEvidence.map(evidence=>evidence.type));
 const sources=db.dataAssets.filter(asset=>sourceIds.has(asset.id)).map(asset=>({id:asset.id,name:asset.name,system:asset.system,purpose:asset.evidencePurpose}));

 if(!linkedScenarios.length)notes.push('已登记相关任务，但当前资料尚未明确其适用场景。');
 if(!evidenceTypes.length&&!sources.length)notes.push('当前资料尚未登记匹配的参考证据类型或数据来源。');
 notes.push('任务动作、输出与完成口径引用现有演示资料；等级要求以上方原文为准。');

 return {
  scenarios:linkedScenarios.map(({id,name,trigger})=>({id,name,trigger})),
  tasks:linkedTasks.slice(0,3).map(task=>({id:task.id,name:task.name,action:task.action,output:task.output,completionCriteria:task.completionCriteria||'',scenarioNames:linkedScenarios.filter(scenario=>task.scenarioIds.includes(scenario.id)).map(scenario=>scenario.name)})),
  totalTasks:linkedTasks.length,
  evidenceTypes,
  sources,
  notes,
 };
}
