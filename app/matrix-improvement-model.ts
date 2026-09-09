import {base,personAt,nameOf,evidenceCheck,currentVersion,uid,addAudit,type State,type Fact} from './management-model';
import {matrixCells,scopePeople} from './workflow-model';

export type ImprovementContext={personId:string;roleId:string;star:number;capabilityId:string;scenarioId:string};
export function matrixImprovementPlan(s:State,personId:string,roleId:string,star:number){
 const person=personAt(s,personId);
 return matrixCells(s,roleId,star,'all',s.date,[personId]).map(row=>{
  const status=row.rows[0]?.status||'unknown';const record=person.capabilities[row.capabilityId];
  const behavior=row.behavior||s.catalog.nodes.find(n=>n.active&&n.level===row.level&&s.catalog.edges.some(e=>e.type==='capabilityBehavior'&&e.from===row.capabilityId&&e.to===n.id))?.description||'';
  const policies=s.policies.filter(p=>p.roleId===roleId&&p.requirements.some(r=>r.capabilityId===row.capabilityId)&&s.catalog.nodes.some(n=>n.id===p.scenarioId&&n.active)).filter((p,i,list)=>list.findIndex(x=>x.scenarioId===p.scenarioId)===i);
  const category=base.capabilities.find(c=>c.id===row.capabilityId)?.category;
  const material=category==='AI应用与协作'?'AI 工具的输入、生成结果及人工校验或接管记录':category==='服务沟通'?'通话录音、沟通记录或书面答复':category==='学习改进'?'案例复盘、知识编审或辅导实践记录':'业务工单、案例处理过程及结果记录';
  return {...row,status,name:nameOf(s,row.capabilityId),currentLevel:status==='unknown'?null:record?.level??null,behavior,policies,material};
 });
}
export function matrixEvidenceCheck(s:State,personId:string,capabilityId:string,scenarioId:string){
 return evidenceCheck(s,personId,capabilityId,scenarioId,s.policies.find(p=>p.scenarioId===scenarioId)?.minSamples||2);
}
export function prepareMatrixAssessment(s:State,context:ImprovementContext){
 const {personId,roleId,star,capabilityId,scenarioId}=context;
 if(!Number.isInteger(star)||star<1||star>5||!scopePeople(s,roleId,'all').includes(personId))throw new Error('当前人员没有该岗位的有效任职，请重新选择');
 const row=matrixImprovementPlan(s,personId,roleId,star).find(r=>r.capabilityId===capabilityId);
 if(!row||row.level===null||!row.policies.some(p=>p.scenarioId===scenarioId))throw new Error('请先选择该岗位能力适用的业务场景');
 const existing=s.assessments.find(a=>a.personId===personId&&a.capabilityId===capabilityId&&a.scenarioId===scenarioId&&['草稿','待复核','已退回'].includes(a.status));
 if(existing){
  if(existing.targetLevel!==row.level||(existing.targetRoleId&&existing.targetRoleId!==roleId)||(existing.targetStar&&existing.targetStar!==star))throw new Error(`已有目标 L${existing.targetLevel} 的评价正在办理，请先处理原评价`);
  if(existing.status==='待复核'&&row.behavior&&row.behavior!==existing.roleBehaviorSnapshot)throw new Error('在途评价的岗位要求不同，请先处理原评价');
  if(existing.status!=='待复核'){existing.targetRoleId=roleId;existing.targetStar=star;}
  return existing.id;
 }
 const id=uid('ASSESS');
 s.assessments.push({id,personId,capabilityId,scenarioId,targetLevel:row.level,targetRoleId:roleId,targetStar:star,status:'草稿',submitter:'班组评价员（模拟）',reviewer:'',reason:'',factIds:[],version:currentVersion(s),previousLevel:personAt(s,personId).capabilities[capabilityId]?.level??null,resultLevel:null,created:s.date,effective:''});
 addAudit(s,'建立星级能力提升评价',`${nameOf(s,personId)} / ${nameOf(s,roleId)} / ${star} 星要求 / ${row.name} L${row.level}`);
 return id;
}
export type ImprovementEvidence={eventId:string;source:string;level:number;observed:string;expires:string;confirmed:boolean};
export function addImprovementEvidence(s:State,assessmentId:string,input:ImprovementEvidence){
 const a=s.assessments.find(a=>a.id===assessmentId);
 if(!a||!['草稿','已退回'].includes(a.status))throw new Error('当前评价已提交，请先处理验证结果');
 if(!input.eventId.trim()||!input.source.trim()||!input.confirmed)throw new Error('请填写事件编号、材料说明，并确认材料可用于本次评价');
 if(!Number.isInteger(input.level)||input.level<1||input.level>5)throw new Error('请选择材料实际体现的能力等级');
 const validDate=(date:string)=>/^\d{4}-\d{2}-\d{2}$/.test(date)&&Number.isFinite(Date.parse(date))&&new Date(date).toISOString().slice(0,10)===date;
 if(!validDate(input.observed)||!validDate(input.expires)||input.observed>s.date||input.expires<s.date||input.expires<input.observed)throw new Error('请填写有效日期，观察日期不能晚于当前时点，材料不能已经过期');
 if(s.facts.some(f=>f.personId===a.personId&&f.capabilityId===a.capabilityId&&f.scenarioId===a.scenarioId&&f.eventId===input.eventId.trim()))throw new Error('该业务事件已记录，不能重复计入样本');
 const fact:Fact={id:uid('FACT'),personId:a.personId,capabilityId:a.capabilityId,scenarioId:a.scenarioId,eventId:input.eventId.trim(),source:input.source.trim(),level:input.level,observed:input.observed,expires:input.expires,quality:true,identity:true,permitted:true,conflict:false};
 s.facts.push(fact);addAudit(s,'补充提升材料',`${nameOf(s,a.personId)} / ${fact.eventId}`);
}
export function setImprovementEvidenceExcluded(s:State,assessmentId:string,factId:string,excluded:boolean,reason:string){
 const a=s.assessments.find(a=>a.id===assessmentId),fact=s.facts.find(f=>f.id===factId);
 if(!a||!['草稿','已退回'].includes(a.status)||!fact||fact.personId!==a.personId||fact.capabilityId!==a.capabilityId||fact.scenarioId!==a.scenarioId)throw new Error('当前材料不能调整');
 if(!reason.trim())throw new Error('请填写材料调整原因');
 fact.excluded=excluded;addAudit(s,excluded?'排除本次提升材料':'恢复本次提升材料',`${fact.eventId} / ${reason.trim()}`);
}
