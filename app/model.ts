import raw from './mock-catalog.json';
export type EvidenceStatus='admissible'|'missing'|'expired'|'review';
export type Person={id:string;name:string;team:string;roleId:string;formalStars:number;targetStars:number;resultStatus:string;standardVersion:string;capabilities:Record<string,{level:number|null;evidenceStatus:EvidenceStatus;evidenceIds:string[]}>;growthFocus:{type:string;capabilityId:string;targetLevel:number;reason:string;nextAction:string;resourceIds:string[]}};
export type Role={id:string;name:string;domainId:string;teamNames:string[];personCount:number;capabilityIds:string[];responsibilityIds:string[];scenarioIds:string[];taskIds:string[]};
export type Capability={id:string;name:string;category:string;definition:string;levels:{level:number;name:string;behavior:string}[];roleIds:string[]};
export type Scenario={id:string;name:string;domainId:string;roleIds:string[];taskIds:string[];trigger:string;riskLevel:string};
export type Task={id:string;name:string;scenarioIds:string[];capabilityIds:string[];sequence:number;input:string;action:string;output:string};
export type TargetRequirement={id:string;roleId:string;star:number;capabilityId:string;targetLevel:number;required:boolean;thresholdType:string;scenarioIds:string[];standardVersion:string;behavior?:string};
type PersonRecord=Omit<(typeof raw.people)[number],'capabilities'> & Person;
type TaskRecord=Omit<(typeof raw.tasks)[number],'roleCapabilityMap'> & {roleCapabilityMap:Record<string,string[]>};
export const db=raw as unknown as Omit<typeof raw,'people'|'tasks'> & {people:PersonRecord[];tasks:TaskRecord[]};
export const roles=raw.roles as Role[];
export const people=raw.people as unknown as Person[];
export const capabilities=raw.capabilities as Capability[];
export const scenarios=raw.scenarios as Scenario[];
export const tasks=raw.tasks as Task[];
export const requirements=raw.capabilityTargets as TargetRequirement[];
export const roleById=(id:string)=>roles.find(r=>r.id===id)!;
const historicalCapabilities=structuredClone(raw.capabilities) as Capability[];
export const capById=(id:string)=>capabilities.find(c=>c.id===id)||historicalCapabilities.find(c=>c.id===id)!;
export const personById=(id:string)=>people.find(p=>p.id===id)!;
export const targetsFor=(roleId:string,star=3)=>requirements.filter(t=>t.roleId===roleId&&t.star===star);
export let roleMemberships:Record<string,string[]>|null=null;
export function setRoleMemberships(value:Record<string,string[]>){roleMemberships=value;}
export const peopleFor=(roleId:string)=>people.filter(p=>roleMemberships?roleMemberships[roleId]?.includes(p.id):p.roleId===roleId);
export const statusLabel:Record<EvidenceStatus,string>={admissible:'可采信',missing:'待补证',expired:'证据过期',review:'待复核'};
export const statusTone:Record<EvidenceStatus,string>={admissible:'green',missing:'gray',expired:'amber',review:'blue'};
export function personMetrics(p:Person,roleId=p.roleId,star=p.targetStars){
 const targets=targetsFor(roleId,star);let known=0,achieved=0;
 targets.forEach(t=>{const value=p.capabilities[t.capabilityId];if(value?.evidenceStatus==='admissible'&&value.level!==null){known++;if(value.level>=t.targetLevel)achieved++}});
 const grouped=(ai:boolean)=>{const ts=targets.filter(t=>t.required&&(capById(t.capabilityId)?.category==='AI应用与协作')===ai);if(!ts.length)return '不适用';const values=ts.map(t=>{const v=p.capabilities[t.capabilityId];return !v||v.level===null||v.evidenceStatus!=='admissible'?'unknown':v.level<t.targetLevel?'gap':'passed'});return values.includes('gap')?'需提升':values.includes('unknown')?'待验证':'已满足'};
 const businessGate=grouped(false),aiGate=grouped(true);
 const mandatory=targets.filter(t=>t.required);
 const gates=mandatory.map(t=>{const v=p.capabilities[t.capabilityId];return !v||v.level===null||v.evidenceStatus!=='admissible'?'unknown':v.level>=t.targetLevel?'passed':'gap'});
 return {businessGate,aiGate,total:targets.length,known,unknown:targets.length-known,achieved,unmet:known-achieved,mandatory:mandatory.length,gate:gates.includes('gap')?'存在门槛差距':gates.includes('unknown')?'门槛依据不足':'必选项已达标',score:known?Math.round(achieved/targets.length*1000)/10:null,coverage:targets.length?Math.round(known/targets.length*1000)/10:0};
}
export function roleMetrics(id:string){const records=peopleFor(id);const metrics=records.map(p=>personMetrics(p,id,3));const known=metrics.reduce((s,m)=>s+m.known,0),total=metrics.reduce((s,m)=>s+m.total,0),achieved=metrics.reduce((s,m)=>s+m.achieved,0);return {count:records.length,known,total,achieved,score:total?Math.round(achieved/total*1000)/10:0,coverage:total?Math.round(known/total*1000)/10:0,unknown:total-known,gaps:metrics.filter(m=>m.unmet>0).length}}
export function globalMetrics(){const values=people.flatMap(p=>Object.values(p.capabilities));const valid=values.filter(v=>v.evidenceStatus==='admissible'&&v.level!==null).length;return {coverage:Math.round(valid/values.length*1000)/10,valid,total:values.length,needsEvidence:people.filter(p=>Object.values(p.capabilities).some(v=>v.evidenceStatus!=='admissible')).length}}
export function gapFor(p:Person,capId:string,targetLevel:number){const v=p.capabilities[capId];if(!v||v.evidenceStatus==='missing')return {label:'证据缺口',tone:'gray',description:'补齐有效证据后再判断能力'};if(v.evidenceStatus==='expired')return {label:'需更新证据',tone:'amber',description:'保留原记录，更新实践与复测依据'};if(v.evidenceStatus==='review')return {label:'待复核',tone:'blue',description:'复核完成前不形成新的结论'};if(v.level!==null&&v.level>=targetLevel)return {label:'已达目标',tone:'green',description:'本项已有符合目标的可采信证据'};return {label:'能力差距',tone:'amber',description:`当前 L${v.level}，目标 L${targetLevel}`}}
export function exportCsv(name:string,headers:string[],rows:(string|number)[][]){const safe=(v:string|number)=>'"'+String(v).replace(/"/g,'""')+'"';const csv='\ufeff'+[headers,...rows].map(r=>r.map(safe).join(',')).join('\r\n');const url=URL.createObjectURL(new Blob([csv],{type:'text/csv;charset=utf-8'}));const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),500)}
