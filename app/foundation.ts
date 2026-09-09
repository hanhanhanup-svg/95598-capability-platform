import reference from './foundation-reference.json';
export const foundation=reference;
export const registeredRank=(personId:string,roleId?:string)=>reference.ranks.find(r=>r.personId===personId&&(!roleId||r.jobId===jobFor(roleId)?.id));
export const rankLabel=(personId:string,roleId?:string)=>{const rank=registeredRank(personId,roleId);return rank?rank.label:roleId?'本岗位职级待登记':'待登记'};
export const registeredRankContext=(personId:string,roleId?:string)=>{const rank=registeredRank(personId,roleId);return rank?`${reference.jobs.find(j=>j.id===rank.jobId)?.name||rank.jobId} · ${rank.label}`:'尚无职级登记'};
export const profileFor=(roleId:string)=>reference.profiles.find(p=>p.roleId===roleId);
export const jobFor=(roleId:string)=>reference.jobs.find(j=>j.id===profileFor(roleId)?.jobId);
export const referenceBehavior=(roleId:string,star:number,capabilityId:string)=>reference.behaviorExamples.find(x=>x.roleId===roleId&&x.star===star&&x.capabilityId===capabilityId);
