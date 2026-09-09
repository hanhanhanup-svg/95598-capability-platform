import {activeAssignments,authorizationStatus,base,nameOf,prepareAllocation,supply,type Assignment,type State} from './management-model';

export type SupplyRosterPerson={
  personId:string;
  name:string;
  roleId:string;
  roleName:string;
  memberships:{positionId:string;team:string;type:Assignment['type']}[];
  qualification:ReturnType<typeof authorizationStatus>['q'];
  authorization:ReturnType<typeof authorizationStatus>;
  available:boolean;
  assignedHere:boolean;
  free:boolean;
  arrangementLabel:string;
  arrangementDetail:string;
};

/** Scenario membership follows the active appointment for this policy's role and team. */
export function supplyRoster(s:State,policyId:string,slotId:string,team='all'):SupplyRosterPerson[]{
  const policy=s.policies.find(p=>p.id===policyId);
  if(!policy||!s.slots.some(slot=>slot.id===slotId))return [];
  const assignments=activeAssignments(s).filter(a=>{
    const position=s.positions.find(p=>p.id===a.positionId);
    return position?.roleId===policy.roleId&&(team==='all'||nameOf(s,position.orgId)===team);
  });
  const personIds=new Set(assignments.map(a=>a.personId));
  const currentSupply=supply(s,policyId,slotId,s.allocations,team);
  const assignedIds=new Set(currentSupply.assigned.map(p=>p.id));
  const freeIds=new Set(currentSupply.free.map(p=>p.id));
  return base.people.filter(p=>personIds.has(p.id)).map(p=>{
    const memberships=assignments.filter(a=>a.personId===p.id).filter((a,i,list)=>list.findIndex(other=>other.positionId===a.positionId&&other.type===a.type)===i).map(a=>({positionId:a.positionId,team:nameOf(s,s.positions.find(pos=>pos.id===a.positionId)!.orgId),type:a.type}));
    const authorization=authorizationStatus(s,p.id,policyId);
    const available=!s.unavailable.includes(`${slotId}:${p.id}`);
    const allocations=s.allocations.filter(a=>a.personId===p.id&&a.slotId===slotId).map(a=>prepareAllocation(s,a));
    const assignedHere=assignedIds.has(p.id);
    const free=freeIds.has(p.id);
    const arrangementDetail=[...new Set(allocations.map(a=>{
      const assignedPolicy=s.policies.find(item=>item.id===a.policyId);
      const position=s.positions.find(pos=>pos.id===a.positionId);
      return `${assignedPolicy?.name||'场景待确认'}${position?` · ${nameOf(s,position.orgId)}`:''}`;
    }))].join('；');
    const otherScene=allocations.some(a=>a.policyId!==policyId);
    const otherTeam=team!=='all'&&allocations.some(a=>a.policyId===policyId&&s.positions.some(pos=>pos.id===a.positionId&&nameOf(s,pos.orgId)!==team));
    const arrangementLabel=!available?'本时段不可用':assignedHere?'本场景已安排':otherScene?'已安排其他场景':otherTeam?'已在其他班组安排':allocations.length?'安排待核验':free?'可安排此场景':'未安排';
    return {personId:p.id,name:p.name,roleId:policy.roleId,roleName:nameOf(s,policy.roleId),memberships,qualification:authorization.q,authorization,available,assignedHere,free,arrangementLabel,arrangementDetail};
  });
}
