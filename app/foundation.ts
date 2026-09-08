import reference from './foundation-reference.json';
export const foundation=reference;
export const registeredRank=(personId:string)=>reference.ranks.find(r=>r.personId===personId);
export const rankLabel=(personId:string,roleId?:string)=>{const rank=registeredRank(personId);return !rank?'待登记':roleId&&jobFor(roleId)?.id!==rank.jobId?'本岗位职级待登记':rank.label};
export const registeredRankContext=(personId:string)=>{const rank=registeredRank(personId);return rank?`${reference.jobs.find(j=>j.id===rank.jobId)?.name||rank.jobId} · ${rank.label}`:'尚无职级登记'};
export const profileFor=(roleId:string)=>reference.profiles.find(p=>p.roleId===roleId);
export const jobFor=(roleId:string)=>reference.jobs.find(j=>j.id===profileFor(roleId)?.jobId);
export const referenceBehavior=(roleId:string,star:number,capabilityId:string)=>reference.behaviorExamples.find(x=>x.roleId===roleId&&x.star===star&&x.capabilityId===capabilityId);
