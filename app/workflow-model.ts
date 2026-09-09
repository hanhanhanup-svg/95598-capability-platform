import {base,createInitialState,personAt,qualification,activeAssignments,currentVersion,capabilityRevision,nameOf,uid,addAudit,type State,type Development,type Catalog,type Handoff} from './management-model';

export type ViewRole='管理者'|'班组长'|'员工'|'评价人员'|'体系管理员';
export type WorkContext={personId?:string;roleId?:string;policyId?:string;scenarioId?:string;capabilityId?:string;recordId?:string;tab?:string;orgId?:string};
export const dayAfter=(date:string,days:number)=>{const d=new Date(`${date}T12:00:00Z`);d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
const unique=<T,>(a:T[])=>[...new Set(a)];
export function upgradeWorkspace(input:State):State{
 const s=structuredClone(input);if(s.workspace?.version===3)return s;
 s.workspace={version:3,legacyArchive:structuredClone(s.legacyPlans||[]),todoAssignments:{}};
 s.development.forEach(d=>{d.purpose='后备培养';d.targetConfirmed=true;d.milestones.forEach(m=>{if(m.name==='完成目标场景实操评价和复核')m.systemReview=true});d.resources??=[];const policy=s.policies.find(p=>p.id===d.targetPolicyId);d.assessmentIds=unique([...(d.assessmentIds||[]),...s.assessments.filter(a=>policy&&a.personId===d.personId&&a.scenarioId===policy.scenarioId&&policy.requirements.some(r=>r.capabilityId===a.capabilityId&&r.level===a.targetLevel)&&['草稿','待复核','已退回'].includes(a.status)).map(a=>a.id)]);d.targetVersion=currentVersion(s)});
 const persons=unique((s.legacyPlans||[]).map(p=>p.personId));
 persons.forEach(personId=>{const records=s.legacyPlans.filter(p=>p.personId===personId);s.development.push({id:`MIGRATED-${personId}`,personId,targetRoleId:'',targetPolicyId:'',targetConfirmed:false,purpose:'岗位成长',track:'专业发展',mentorId:'',months:3,wish:'',status:'培养中',created:s.date,due:'',resources:records.map(r=>({resourceId:r.resourceId,trained:r.status!=='planned',note:r.status==='review'?'旧页记录为已提交模拟复测；尚未绑定正式评价任务':'从旧成长计划保留的训练进度',legacyStatus:r.status})),assessmentIds:[],milestones:[{name:'完成目标场景实践并提交可核验产出',done:false,evidence:''}]})});
 s.legacyPlans=[];
 // Introduce collaboration examples in a draft only, never rewrite published history.
 return s;
}
export function addMultiRoleSamples(input:State):State{
 const s=structuredClone(input);if(!s.workspace||s.workspace.multiRoleSamples)return s;
 const samples=[{personId:'DEMO-001',roleId:'ROLE-05',type:'兼岗' as const,targetStars:2},{personId:'DEMO-013',roleId:'ROLE-04',type:'支援' as const,targetStars:3}];
 for(const sample of samples){
  const role=s.catalog.nodes.find(n=>n.id===sample.roleId&&n.active),position=s.positions.find(p=>p.roleId===sample.roleId);
  const hasHistory=s.assignments.some(a=>a.personId===sample.personId&&s.positions.find(p=>p.id===a.positionId)?.roleId===sample.roleId);
  if(!role||!position||hasHistory)continue;
  s.assignments.push({id:'ASG-MULTI-'+sample.personId,personId:sample.personId,positionId:position.id,type:sample.type,start:'2026-09-07',end:'2026-12-31',reason:'一人多岗展示案例（模拟）',targetStars:sample.targetStars});
 }
 const existingDemo=s.assignments.find(a=>a.id==='ASG-SUPPORT-018'&&a.personId==='DEMO-018'&&a.reason==='报修与投诉跨岗支援培养（合成）'&&s.positions.find(p=>p.id===a.positionId)?.roleId==='ROLE-03');
 if(existingDemo&&existingDemo.targetStars===undefined)existingDemo.targetStars=3;
 s.workspace.multiRoleSamples=true;return s;
}
export const createWorkspaceState=()=>addMultiRoleSamples(upgradeWorkspace(createInitialState()));
export function decodeWorkspace(text:string):State{
 const s=JSON.parse(text) as State;
 const arrays=['orgs','positions','assignments','versions','facts','assessments','appeals','authorizations','slots','demands','allocations','unavailable','diagnoses','actions','development','audit','legacyPlans'] as const;
 if(s.schema!==2||arrays.some(k=>!Array.isArray(s[k]))||!s.versions.length||!Array.isArray(s.catalog?.nodes)||!Array.isArray(s.catalog?.edges)||!/^\d{4}-\d{2}-\d{2}$/.test(s.date))throw new Error('历史记录格式不完整');
 const people=new Set(base.people.map(p=>p.id)),positions=new Set(s.positions.map(p=>p.id));
 if(s.assignments.some(a=>!people.has(a.personId)||!positions.has(a.positionId))||s.development.some(d=>!people.has(d.personId)||!Array.isArray(d.milestones))||s.assessments.some(a=>!people.has(a.personId))||s.legacyPlans.some(p=>!people.has(p.personId))||s.versions.some(v=>!v.catalog?.nodes||!v.catalog?.edges||!Array.isArray(v.policies)))throw new Error('历史记录引用不完整');
 return addMultiRoleSamples(upgradeWorkspace(s));
}
export function configureDevelopment(s:State,id:string,values:{personId:string;targetRoleId:string;targetPolicyId:string;mentorId:string;months:number;wish:string;purpose:'岗位成长'|'后备培养';track:Development['track']}){
 const p=s.policies.find(p=>p.id===values.targetPolicyId&&p.roleId===values.targetRoleId);
 if(!p||!s.catalog.nodes.some(n=>n.id===values.targetRoleId&&n.active)||!base.people.some(p=>p.id===values.personId))throw new Error('请选择有效人员、岗位与目标场景');
 if(!values.wish.trim()||!Number.isInteger(values.months)||values.months<1||values.months>24)throw new Error('请填写本人意愿及 1—24 个月培养周期');
 if(values.mentorId===values.personId||!base.people.some(p=>p.id===values.mentorId)||qualification(s,values.mentorId,p.id).status!=='达标')throw new Error('导师须满足目标场景能力与证据要求，且不能为本人');
 if(s.development.some(d=>d.id!==id&&d.personId===values.personId&&d.targetPolicyId===p.id&&d.status!=='后备就绪'))throw new Error('已有相同人员和目标场景的在途计划，请继续办理');
 let d=s.development.find(d=>d.id===id);
 if(d?.targetConfirmed)throw new Error('已确认计划的目标不能覆盖修改，请建立新的目标计划');
 if(!d){d={id:id||uid('DEV'),...values,status:'培养中',created:s.date,milestones:[{name:'完成目标场景跟班与案例实践',done:false,evidence:''},{name:'提交案例复盘并由导师确认',done:false,evidence:''}]};s.development.push(d)}
 Object.assign(d,values,{targetConfirmed:true,targetVersion:currentVersion(s),due:dayAfter(d.created,values.months*30)});d.resources??=[];d.assessmentIds??=[];
 addAudit(s,'确认统一培养计划',`${nameOf(s,d.personId)} / ${p.name}`);return d.id;
}
export function requestDevelopmentReview(s:State,id:string){
 const d=s.development.find(d=>d.id===id);if(!d?.targetConfirmed)throw new Error('请先确认目标、导师及本人意愿');
 const p=s.policies.find(p=>p.id===d.targetPolicyId);if(!p)throw new Error('目标场景已停用，请重新安排目标');
 if(d.milestones.some(m=>!m.systemReview&&!m.done)||(d.resources||[]).some(r=>!r.trained))throw new Error('请先完成已安排训练及必需实践，记录导师确认依据');
 const checks=qualification(s,d.personId,p.id).checks.filter(c=>!c.passed);const ids:string[]=[];
 checks.forEach(c=>{let a=s.assessments.find(a=>a.personId===d.personId&&a.scenarioId===p.scenarioId&&a.capabilityId===c.capabilityId&&['草稿','待复核','已退回'].includes(a.status));
  if(a&&a.targetLevel!==c.level)throw new Error('已有在途评价的目标等级不同，请先处理原评价再衔接培养');
  if(!a){a={id:uid('ASSESS'),personId:d.personId,capabilityId:c.capabilityId,scenarioId:p.scenarioId,targetLevel:c.level,status:'草稿',submitter:'班组评价员（模拟）',reviewer:'',reason:'',factIds:[],version:currentVersion(s),previousLevel:c.levelNow,resultLevel:null,created:s.date,effective:''};s.assessments.push(a)}ids.push(a.id)
 });
 d.assessmentIds=unique([...(d.assessmentIds||[]),...ids]);d.status=ids.length?'待复核':'培养中';addAudit(s,'衔接培养与评价',`${d.id} / 关联 ${ids.length} 项评价`);return ids;
}
export function developmentStatus(s:State,d:Development){
 if(!d.targetConfirmed)return '目标待确认';
 if(!s.policies.some(p=>p.id===d.targetPolicyId))return '目标已停用，需处理';
 const q=qualification(s,d.personId,d.targetPolicyId);
 if(d.status==='后备就绪'&&q.status!=='达标')return '标准或证据变化，需重新确认';
 if(d.status==='后备就绪'&&d.confirmations?.at(-1)?.signature===developmentSignature(s,d))return '培养目标已确认';
 const records=s.assessments.filter(a=>(d.assessmentIds||[]).includes(a.id));
 if(records.some(a=>a.status==='已退回'))return '评价退回，需补充';
 if(records.some(a=>a.status==='待复核'))return '评价待复核';
 if(records.some(a=>a.status==='草稿'))return '复测待取证';
 if(d.milestones.every(m=>m.systemReview||m.done)&&(d.resources||[]).every(r=>r.trained)&&q.status==='达标')return '条件满足，待确认';
 return '培养中';
}
export function developmentSignature(s:State,d:Development){const p=s.policies.find(p=>p.id===d.targetPolicyId);if(!p)return '';return JSON.stringify({scenario:p.scenarioId,role:p.roleId,requirements:p.requirements,minSamples:p.minSamples,standards:p.requirements.map(r=>capabilityRevision(s,r.capabilityId)),results:p.requirements.map(r=>s.assessments.filter(a=>a.personId===d.personId&&a.scenarioId===p.scenarioId&&a.capabilityId===r.capabilityId&&a.status==='已生效'&&a.effective<=s.date).sort((a,b)=>a.effective.localeCompare(b.effective)||(a.reviewedAt||'').localeCompare(b.reviewedAt||'')).at(-1)?.id||'初始已生效结果')})}
export function confirmDevelopment(s:State,id:string){const d=s.development.find(d=>d.id===id)!;if(developmentStatus(s,d)!=='条件满足，待确认')throw new Error('实践、训练、有效能力与证据尚未全部满足');d.status='后备就绪';d.confirmations??=[];d.confirmations.push({date:s.date,reviewer:'培养负责人（模拟）',reason:'必需实践、训练记录与目标能力逐项核验通过',signature:developmentSignature(s,d)});d.milestones.filter(m=>m.systemReview).forEach(m=>{m.done=true;m.evidence=`目标能力与有效证据已核验；评价记录 ${(d.assessmentIds||[]).join('、')||'初始已生效结果'}；${s.date}`});addAudit(s,'确认培养目标',`${d.id} / 不自动变更星级、任职或授权`)}
export function completeImprovementAction(s:State,id:string,deliverable:string){
 const action=s.actions.find(a=>a.id===id);
 if(!action)throw new Error('未找到该改善事项');
 if(action.status==='已完成')throw new Error('此事项已完成，请勿重复提交');
 if(!['待办理','待验收'].includes(action.status))throw new Error('当前事项状态不支持办理');
 if(!deliverable.trim())throw new Error('请填写完成情况与验证材料');
 // Legacy pending-acceptance records use the same single verification step.
 action.deliverable=deliverable.trim();
 action.status='已完成';
 addAudit(s,'验证完成改善事项',action.title);
}
export type Todo={id:string;title:string;category:string;actor:ViewRole;ownerId:string;ownerLabel:string;due:string;page:string;context:WorkContext;step:string};
export function todos(s:State):Todo[]{
 const list:Todo[]=[];const push=(t:Todo)=>{const assignment=s.workspace?.todoAssignments[t.id];list.push(assignment&&assignment.stage===`${t.category}|${t.step}`?{...t,ownerId:assignment.ownerId,ownerLabel:nameOf(s,assignment.ownerId),due:assignment.due}:t)};
 s.assessments.filter(a=>a.status!=='已生效').forEach(a=>push({id:`assessment:${a.id}`,title:`${nameOf(s,a.personId)} · ${nameOf(s,a.capabilityId)}`,category:a.status==='待复核'?'评价复核':'补证与复测',actor:'评价人员',ownerId:'',ownerLabel:a.status==='待复核'?'专业复核员':'班组评价员',due:'',page:'evaluation',context:{personId:a.personId,recordId:a.id,scenarioId:a.scenarioId,capabilityId:a.capabilityId},step:a.status==='待复核'?'核验依据并作出复核结论':'补充独立事件证据并提交评价'}));
 s.appeals.filter(a=>a.status!=='已答复').forEach(a=>push({id:`appeal:${a.id}`,title:`${nameOf(s,a.personId)} · 评价异议`,category:'员工异议',actor:'评价人员',ownerId:'',ownerLabel:'质量复核员',due:'',page:'evaluation',context:{personId:a.personId,recordId:a.id,tab:'appeals'},step:a.status==='待受理'?'受理异议':'核查并答复'}));
 s.authorizations.filter(a=>a.status==='待审批').forEach(a=>push({id:`auth:${a.id}`,title:`${nameOf(s,a.personId)} · ${s.policies.find(p=>p.id===a.policyId)?.name}`,category:'场景授权',actor:'班组长',ownerId:'',ownerLabel:'场景授权主管',due:a.start,page:'authorization',context:{personId:a.personId,policyId:a.policyId,recordId:a.id},step:'逐项核验任职、证据及授权条件'}));
 s.actions.filter(a=>a.status!=='已完成').forEach(a=>push({id:`action:${a.id}`,title:a.title,category:a.category,actor:'班组长',ownerId:a.ownerId,ownerLabel:nameOf(s,a.ownerId),due:a.due,page:'diagnosis',context:{recordId:a.id,personId:a.ownerId,tab:'all'},step:'填写验证材料并完成'}));
 s.development.forEach(d=>{const status=developmentStatus(s,d);if(status==='培养目标已确认'||['复测待取证','评价待复核','评价退回，需补充'].includes(status))return;push({id:`development:${d.id}`,title:`${nameOf(s,d.personId)} · ${d.purpose||'岗位成长'}`,category:status,actor:status==='目标待确认'?'班组长':status==='条件满足，待确认'?'管理者':(d.resources||[]).some(r=>!r.trained)?'员工':'班组长',ownerId:status==='培养中'&&(d.resources||[]).some(r=>!r.trained)?d.personId:status==='目标待确认'||status==='条件满足，待确认'?'':d.mentorId,ownerLabel:status==='培养中'&&(d.resources||[]).some(r=>!r.trained)?nameOf(s,d.personId):status==='目标待确认'?'班组培养负责人':status==='条件满足，待确认'?'培养负责人':nameOf(s,d.mentorId),due:d.due||'',page:'talent',context:{personId:d.personId,recordId:d.id,policyId:d.targetPolicyId},step:status==='目标待确认'?'完善目标场景、导师和意愿':status==='条件满足，待确认'?'确认培养目标':'查看计划并继续办理'})});
 if(s.draft)push({id:'standard:draft',title:s.draft.note||'本次体系标准变更',category:`标准${s.draft.status}`,actor:'体系管理员',ownerId:'',ownerLabel:s.draft.status==='草稿'?'业务标准维护人':'标准审核负责人',due:s.draft.date,page:'governance',context:{tab:'release'},step:'查看差异、检查影响并办理审核发布'});
 // Evidence reminders refer to a person-capability pair; an open assessment owns that work if present.
 base.people.forEach(p=>{const at=personAt(s,p.id);Object.entries(at.capabilities).filter(([,v])=>v.evidenceStatus!=='admissible').forEach(([cap,v])=>{if(s.assessments.some(a=>a.personId===p.id&&a.capabilityId===cap&&a.status!=='已生效'))return;const policy=s.policies.find(sc=>sc.roleId===at.roleId&&sc.requirements.some(c=>c.capabilityId===cap));if(!policy)return;push({id:`evidence:${p.id}:${cap}`,title:`${p.name} · ${nameOf(s,cap)}`,category:v.evidenceStatus==='expired'?'证据到期':'证据缺口',actor:'员工',ownerId:p.id,ownerLabel:p.name,due:'',page:'evaluation',context:{personId:p.id,capabilityId:cap,scenarioId:policy.scenarioId,policyId:policy.id,tab:'new'},step:'建立对应能力评价并补证'})})});
 return list.sort((a,b)=>(a.due||'9999').localeCompare(b.due||'9999')||a.id.localeCompare(b.id));
}
export function visibleTodos(s:State,role:ViewRole,viewerId:string){const all=todos(s);if(role==='管理者'||role==='体系管理员')return all;if(role==='员工')return all.filter(t=>t.ownerId===viewerId);if(role==='评价人员')return all.filter(t=>t.actor==='评价人员'||t.ownerId===viewerId);const team=personAt(s,viewerId).team;return all.filter(t=>t.context.personId&&personAt(s,t.context.personId).team===team||t.ownerId===viewerId)}
export function scopePeople(s:State,roleId:string,orgId:string,date=s.date){const orgIds=new Set([orgId]);let n=-1;while(n!==orgIds.size){n=orgIds.size;s.orgs.filter(o=>orgIds.has(o.parentId)).forEach(o=>orgIds.add(o.id))}return unique(activeAssignments(s,date).filter(a=>{const p=s.positions.find(p=>p.id===a.positionId);return p?.roleId===roleId&&(orgId==='all'||orgIds.has(p.orgId))}).map(a=>a.personId))}
export function roleRequirements(c:Catalog,roleId:string,star:number){return c.edges.filter(e=>e.type==='roleCapability'&&e.from===roleId&&c.nodes.some(n=>n.id===e.to&&n.active)).map(e=>{const old=base.capabilityTargets.find(t=>t.roleId===roleId&&t.capabilityId===e.to&&t.star===star);return {capabilityId:e.to,behavior:e.behaviors?.[star-1]??old?.behavior??'',level:e.targetLevels?.[star-1]??old?.targetLevel??null,required:e.requirements?.[star-1]?.required??old?.required??true,thresholdType:e.requirements?.[star-1]?.thresholdType||old?.thresholdType||'新增能力演示要求'}})}
function atDate(s:State,date:string){const v=s.versions.filter(v=>v.date<=date).at(-1);if(!v)throw new Error('该日期没有标准快照');return {...s,date,catalog:v.catalog,policies:v.policies}}
export function matrixCells(s:State,roleId:string,star:number,orgId='all',date=s.date,cohort?:string[]){
 const state=atDate(s,date);const ids=cohort||scopePeople(state,roleId,orgId,date);return roleRequirements(state.catalog,roleId,star).map(req=>{const rows=ids.map(id=>{const p=personAt(state,id),v=p.capabilities[req.capabilityId];const revision=capabilityRevision(state,req.capabilityId);const assessment=state.assessments.filter(a=>a.personId===id&&a.capabilityId===req.capabilityId&&a.status==='已生效'&&a.effective<=date).sort((a,b)=>a.effective.localeCompare(b.effective)||(a.reviewedAt||'').localeCompare(b.reviewedAt||'')).at(-1);const checked=state.versions.findIndex(v=>v.id===(assessment?.version||state.versions[0].id))>=state.versions.findIndex(v=>v.id===revision);const known=req.level!==null&&v?.level!=null&&v.evidenceStatus==='admissible'&&checked;return {id,status:!known?'unknown':v.level!>=req.level!?'achieved':'gap'}});return {...req,total:ids.length,achieved:rows.filter(r=>r.status==='achieved').length,gap:rows.filter(r=>r.status==='gap').length,unknown:rows.filter(r=>r.status==='unknown').length,rows}})
}
export function compareMatrix(s:State,roleId:string,star:number,orgId:string,beforeDate:string){
 const prior=atDate(s,beforeDate),now=atDate(s,s.date);const beforeIds=scopePeople(s,roleId,orgId,beforeDate),nowIds=scopePeople(s,roleId,orgId);const cohort=beforeIds.filter(id=>nowIds.includes(id));
 const signature=(c:Catalog)=>{const req=roleRequirements(c,roleId,star);const capIds=req.map(r=>r.capabilityId);const behaviorIds=c.edges.filter(e=>e.type==='capabilityBehavior'&&capIds.includes(e.from)).map(e=>e.to);return JSON.stringify({req:req.sort((a,b)=>a.capabilityId.localeCompare(b.capabilityId)),definitions:c.nodes.filter(n=>[...capIds,...behaviorIds].includes(n.id)).map(n=>({id:n.id,description:n.description,active:n.active,level:n.level})).sort((a,b)=>a.id.localeCompare(b.id))})};
 const comparable=beforeDate<=s.date&&signature(prior.catalog)===signature(now.catalog);const before=matrixCells(s,roleId,star,orgId,beforeDate,cohort),after=matrixCells(s,roleId,star,orgId,s.date,cohort);
 return {comparable,cohort,before,after,entered:nowIds.filter(id=>!beforeIds.includes(id)),left:beforeIds.filter(id=>!nowIds.includes(id)),beforeVersion:prior.versions.filter(v=>v.date<=beforeDate).at(-1)!.id,afterVersion:currentVersion(s)};
}
export function exampleHandoffs(c:Catalog):Handoff[]{return [{id:'HANDOFF-COMPLAINT',scenarioId:'SCN-05',taskId:'TASK-14',leadRoleId:'ROLE-03',supportRoleIds:['ROLE-02'],reviewRoleId:'ROLE-04',escalateRoleId:'ROLE-06',materials:'诉求摘要、工单记录、专业核查结论、客户承诺事项',acceptance:'材料齐全、责任部门明确、回访口径一致',deadlineHours:2,escalation:'超出约定反馈时限或专业结论冲突时提交运营管理岗协调',owner:'投诉处置专业'},{id:'HANDOFF-REPAIR',scenarioId:'SCN-03',taskId:'TASK-09',leadRoleId:'ROLE-02',supportRoleIds:['ROLE-01'],reviewRoleId:'ROLE-04',escalateRoleId:'ROLE-06',materials:'故障位置、报修信息、专业处理进展、待反馈事项',acceptance:'专业已接收，反馈时间与客户解释口径可核验',deadlineHours:1,escalation:'处理进度超过约定时限或涉及多专业争议时升级',owner:'报修服务专业'}].filter(h=>c.nodes.some(n=>n.id===h.taskId&&n.active))}
