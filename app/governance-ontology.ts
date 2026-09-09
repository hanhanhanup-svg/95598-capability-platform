import {base,currentVersion,type State} from './management-model';
import {foundation} from './foundation';

type NeedDefinition={purpose:string;description:string;objects:string[];grain:string;keyFields:string[];useRule:string;extraFields:{name:string;label:string;type:string;source:string}[]};
const definitions:Record<string,NeedDefinition>={
 'ASSET-01':{purpose:'先确认“这个人在哪个岗位”',description:'按任职时点确认人员、岗位、班组与独立登记的职级，为能力墙选择适用标准。',objects:['人员','岗位','班组','任职记录'],grain:'一名人员在一个岗位上的一段有效任职；可区分主岗、兼岗和支援。',keyFields:['employee_code','role_code','effective_from'],useRule:'职级取自登记；能力达标比例不能替代登记职级。',extraFields:[{name:'effective_to',label:'任职结束时间',type:'date',source:'State.assignments.end'},{name:'assignment_type',label:'任职类型',type:'string',source:'State.assignments.type'}]},
 'ASSET-02':{purpose:'了解“做过什么业务、怎么处理”',description:'保留员工在业务事件中的处理过程，关联实际场景、任务及能力观察。',objects:['人员','业务事件','业务场景','任务','能力观察'],grain:'一名人员在一次独立业务事件中的一项能力观察；同一事件的重复记录不能重复计样本。',keyFields:['employee_code','independent_event_code','capability_code'],useRule:'按独立事件、用途、质量和有效期核验后，才可作为评价依据。',extraFields:[{name:'independent_event_code',label:'独立业务事件编码',type:'string',source:'State.facts.eventId'},{name:'task_code',label:'业务任务编码',type:'string',source:'State.catalog scenarioTask / taskCapability'},{name:'capability_code',label:'观察能力编码',type:'string',source:'State.facts.capabilityId'},{name:'observed_level',label:'观察支持等级',type:'integer',source:'State.facts.level'},{name:'valid_until',label:'证据有效期限',type:'date',source:'State.facts.expires'}]},
 'ASSET-03':{purpose:'核对“行为是否达到要求”',description:'记录服务质量观察及对应行为标准，用于核对能力表现和需要补充的证据。',objects:['人员','质检观察','业务事件','行为标准'],grain:'一次质检记录中，针对一名人员、一项能力和具体场景的行为观察。',keyFields:['review_id','employee_code','behavior_code'],useRule:'保留业务事件关联；质量检查通过与能力评价采信是两个判断。',extraFields:[{name:'scenario_code',label:'观察场景编码',type:'string',source:'State.facts.scenarioId'},{name:'independent_event_code',label:'独立业务事件编码',type:'string',source:'State.facts.eventId'},{name:'observed_level',label:'观察支持等级',type:'integer',source:'State.facts.level'},{name:'valid_until',label:'证据有效期限',type:'date',source:'State.facts.expires'}]},
 'ASSET-04':{purpose:'补充“考试和实操能证明什么”',description:'将考试、情景实操与单项能力、场景和观察等级对应，供人工复核。',objects:['人员','测评记录','业务场景','能力观察'],grain:'一次测评中，一名人员在一个场景下的一项能力观察；独立事件口径待确认。',keyFields:['assessment_id','employee_code','capability_code'],useRule:'目标等级与实际观察等级分开保留，不能用培训完成直接认定达标。',extraFields:[{name:'scenario_code',label:'测评场景编码',type:'string',source:'State.assessments.scenarioId'},{name:'independent_event_code',label:'独立业务事件编码',type:'string',source:'State.facts.eventId'},{name:'observed_level',label:'观察支持等级',type:'integer',source:'State.facts.level'},{name:'valid_until',label:'证据有效期限',type:'date',source:'State.facts.expires'}]},
 'ASSET-05':{purpose:'安排“下一步学什么、练什么”',description:'对照目标能力安排学习、训练和实践，记录实际产出以及后续复测需求。',objects:['人员','训练任务','培养资源','实践产出'],grain:'一名人员完成一项训练任务或实践活动的记录；训练任务与业务任务分别编码。',keyFields:['employee_code','task_id','resource_code'],useRule:'训练记录证明活动已发生；能力达标仍需独立评价与复核。',extraFields:[{name:'scenario_code',label:'训练适用场景',type:'string',source:'base.growthResources.scenarioIds'},{name:'capability_code',label:'训练对应能力',type:'string',source:'base.growthResources.capabilityIds'},{name:'practice_output',label:'实践产出说明',type:'string',source:'State.development.milestones.evidence'},{name:'completion_status',label:'训练完成状态',type:'boolean',source:'State.development.resources.trained'}]},
 'ASSET-06':{purpose:'说清“依据哪份知识和标准”',description:'提供岗位、场景、任务相关的知识与标准版本，便于追溯服务当时使用的依据。',objects:['知识条目','知识版本','业务场景','任务','能力标准'],grain:'一条知识在一个版本及适用时段内的记录，关联岗位、场景、任务和能力。',keyFields:['knowledge_code','version'],useRule:'发布版本、适用时间与实际使用渠道版本分别保留，具体对应关系需确认。',extraFields:[{name:'role_code',label:'适用岗位编码',type:'string',source:'foundation.knowledge.roleIds'},{name:'task_code',label:'关联业务任务编码',type:'string',source:'foundation.knowledge.taskIds'},{name:'capability_code',label:'关联能力编码',type:'string',source:'foundation.knowledge.capabilityIds'}]},
};
const unique=(values:string[])=>[...new Set(values)];
const finiteLevel=(value:unknown):value is number=>typeof value==='number'&&Number.isInteger(value)&&value>=1&&value<=5;

export function buildGovernanceOntology(s:State,roleId='all'){
 const active=s.catalog.nodes.filter(n=>n.active);
 const byId=new Map(active.map(n=>[n.id,n]));
 const edges=s.catalog.edges.filter(e=>byId.has(e.from)&&byId.has(e.to));
 const availableRoles=active.filter(n=>n.kind==='role').map(n=>({id:n.id,name:n.name}));
 const roleIds=availableRoles.filter(r=>roleId==='all'||r.id===roleId).map(r=>r.id);
 const outgoing=(id:string,type:string)=>edges.filter(e=>e.type===type&&e.from===id).map(e=>e.to);
 const bindings=roleIds.flatMap(id=>{
  const roleCaps=outgoing(id,'roleCapability');
  const taskIds=outgoing(id,'roleTask');
  return outgoing(id,'roleScenario').flatMap(scenarioId=>outgoing(scenarioId,'scenarioTask').filter(taskId=>taskIds.includes(taskId)||!base.tasks.some(t=>t.id===taskId)).map(taskId=>{
   const original=base.tasks.find(t=>t.id===taskId);
   const capabilityIds=outgoing(taskId,'taskCapability').filter(capId=>roleCaps.includes(capId)&&(!original||!original.capabilityIds.includes(capId)||(original.roleCapabilityMap[id]||[]).includes(capId)));
   return {roleId:id,scenarioId,taskId,capabilityIds,relationBasis:taskIds.includes(taskId)?'explicit_role_task':'scenario_inherited_new_task',source:'state.catalog relations + base.tasks.roleCapabilityMap'};
  }));
 });
 const scenarioIds=unique(roleIds.flatMap(id=>outgoing(id,'roleScenario')));
 const taskIds=unique(bindings.map(b=>b.taskId));
 const capabilityIds=unique(roleIds.flatMap(id=>outgoing(id,'roleCapability')));
 const behaviorIds=unique(capabilityIds.flatMap(id=>outgoing(id,'capabilityBehavior')));
 const ids=new Set([...roleIds,...scenarioIds,...taskIds,...capabilityIds,...behaviorIds]);
 const businessRelations=edges.filter(e=>ids.has(e.from)&&ids.has(e.to)&&['roleScenario','roleTask','scenarioTask','taskCapability','roleCapability','capabilityBehavior'].includes(e.type)).map(e=>({id:e.id,from:e.from,to:e.to,type:e.type,roleIds:e.type.startsWith('role')?[e.from]:e.type==='scenarioTask'?unique(bindings.filter(b=>b.scenarioId===e.from&&b.taskId===e.to).map(b=>b.roleId)):e.type==='taskCapability'?unique(bindings.filter(b=>b.taskId===e.from&&b.capabilityIds.includes(e.to)).map(b=>b.roleId)):roleIds.filter(id=>outgoing(id,'roleCapability').includes(e.from))})).filter(e=>e.roleIds.length>0);
 const nodes=active.filter(n=>ids.has(n.id)).map(n=>({id:n.id,kind:n.kind,name:n.name,description:n.description,...(finiteLevel(n.level)?{level:n.level}:{}),...(n.kind==='capability'?{category:base.capabilities.find(c=>c.id===n.id)?.category||null,categorySource:base.capabilities.some(c=>c.id===n.id)?'base.capabilities.category':'not_defined'}:{})}));
 const targets=roleIds.flatMap(id=>outgoing(id,'roleCapability').flatMap(capabilityId=>[1,2,3,4,5].map(star=>{
  const edge=edges.find(e=>e.type==='roleCapability'&&e.from===id&&e.to===capabilityId)!;
  const original=base.capabilityTargets.find(t=>t.roleId===id&&t.capabilityId===capabilityId&&t.star===star);
  const level=edge.targetLevels?.[star-1]??original?.targetLevel;
  const behavior=edge.behaviors?.[star-1]??original?.behavior??'';
  return {roleId:id,star,capabilityId,targetLevel:finiteLevel(level)?level:null,required:edge.requirements?.[star-1]?.required??original?.required??null,thresholdType:edge.requirements?.[star-1]?.thresholdType??original?.thresholdType??'',roleBehavior:behavior,definitionStatus:finiteLevel(level)?'defined':'not_defined',source:'state.catalog.roleCapability overrides; base.capabilityTargets fallback'};
 })));
 const label=(id:string)=>byId.get(id)?.name||id;
 const dataNeeds=roleIds.length?base.dataAssets.map(asset=>{
  const d=definitions[asset.id];
  const examples=base.evidence.filter(e=>e.assetId===asset.id);
  const references=bindings;
  const demoBindings=bindings.filter(b=>examples.some(e=>e.scenarioIds.includes(b.scenarioId)&&b.capabilityIds.some(id=>e.capabilityIds.includes(id))));
  const existingFields=asset.fields.map(f=>({name:f.name,label:f.label,type:f.type,required:f.required,sensitive:f.sensitive as boolean|null,description:f.qualityRule,standard:{...f.standard},origin:'existing_demo_catalog',namespace:`demo_catalog.${asset.id}`,source:`mock-catalog.json:dataAssets[${asset.id}].fields.${f.name}`,mappingStatus:'unconfirmed'}));
  const extraFields=(d?.extraFields||[]).filter(f=>!asset.fields.some(known=>known.name===f.name)).map(f=>({name:f.name,label:f.label,type:f.type,required:true,sensitive:null,description:`为本业务用途提出的需求字段；依据 ${f.source}，具体上游字段及敏感性待确认。`,standard:null,origin:'proposed_requirement',namespace:'business_requirement',source:f.source,mappingStatus:'unconfirmed'}));
  return {
   id:`NEED-${asset.id}`,name:asset.name,purpose:d?.purpose||asset.evidencePurpose,description:d?.description||asset.evidencePurpose,
   semanticStatus:'proposed_business_requirement',semanticStatusLabel:'需求定义，待业务确认',objects:d?.objects||['业务记录'],grain:d?.grain||'记录粒度待确认',suggestedKeyFields:d?.keyFields||[],useRule:d?.useRule||asset.evidencePurpose,
   tags:[...asset.tags.map(t=>({label:t.name,category:t.category,origin:'existing_demo_catalog'})),...roleIds.map(id=>({label:label(id),category:'适用岗位',origin:'current_business_scope'})),...scenarioIds.map(id=>({label:label(id),category:'业务场景',origin:'current_business_scope'})),...unique(capabilityIds.flatMap(id=>base.capabilities.find(c=>c.id===id)?.category||[])).map(category=>({label:category,category:'能力分类',origin:'base.capabilities.category'}))],
   businessRefs:{roleIds:[...roleIds],scenarioIds:unique(references.map(b=>b.scenarioId)),taskIds:unique(references.map(b=>b.taskId)),capabilityIds:unique(references.flatMap(b=>b.capabilityIds))},
   relationBasis:'拟议数据用途引用当前岗位业务链；具体数据适配关系待平台匹配与业务确认。',
   demoReferences:{exampleOnly:true,scenarioIds:unique(demoBindings.map(b=>b.scenarioId)),capabilityIds:unique(demoBindings.flatMap(b=>b.capabilityIds)),source:'base.evidence 仅作为合成关联示例，不决定业务需求范围'},
   requestedFields:[...existingFields,...extraFields],additionalFieldCount:extraFields.length,
   suggestedRelations:asset.fields.filter(f=>['employee_code','role_code','scenario_code','behavior_code','capability_code','knowledge_code','resource_code'].includes(f.name)).map(f=>({field:f.name,object:f.label,meaning:'用于统一编码关联',status:'to_confirm'})),
   catalogExampleId:asset.id as string|null,
  };
 }):[];
 if(roleIds.length){
  const core=[
   {id:'NEED-CAPABILITY-RESULT',name:'人员能力结果',purpose:'形成“当前能力达到哪里”的画像',description:'能力墙需要可采信的单项能力等级、证据状态和生效版本，区分未知、待复核与已确认结果。',objects:['人员','能力结果','评价记录','证据状态'],grain:'一名人员在一个业务场景中的一项能力结果，按评价版本与生效时间保留历史；岗位适用性另行确认。',keys:['employee_code','scenario_code','capability_code','result_id'],rule:'只用可采信结果判断是否达标；缺证、过期、冲突和待复核不能记作零分，也不能按等级比例求能力分数。',fields:[['employee_code','员工统一编码','string','State.assessments.personId'],['capability_code','能力编码','string','State.assessments.capabilityId'],['scenario_code','评价场景编码','string','State.assessments.scenarioId'],['applicable_role_code','岗位适用范围','string','State.assessments.targetRoleId / State.policies.roleId'],['accepted_level','可采信能力等级','integer','personAt().capabilities.level + evidenceStatus'],['evidence_status','证据采信状态','string','personAt().capabilities.evidenceStatus'],['result_status','评价结果状态','string','State.assessments.status'],['result_id','评价结果版本记录','string','State.assessments.id'],['standard_version','行为标准版本','string','State.assessments.version'],['evaluated_at','评价复核时间','datetime','State.assessments.reviewedAt'],['effective_from','结果生效日期','date','State.assessments.effective'],['evidence_valid_until','证据有效期限','date','State.assessments.evidenceSnapshot.expires'],['fact_cutoff_at','事实采集截止时间','datetime','base.people.factCutoffAt（当前展示口径；真实截止时间待提供）'],['evidence_refs','证据关联编码','string[]','State.assessments.factIds'],['supersedes','前序结果记录','string','State.assessments.supersedes']]},
   {id:'NEED-PERSONAL-TARGET',name:'个人目标与任职口径',purpose:'说明“这个人按哪个岗位和目标对标”',description:'按当前有效任职确定岗位目标，区分主岗、兼岗及各岗独立目标；职级登记与能力目标分开。',objects:['人员','岗位任职','岗位成长目标','职级登记'],grain:'一名人员在一个岗位上的一段有效任职及该岗位确认的成长目标；同一人员不同岗位分别记录。',keys:['employee_code','role_code','assignment_id'],rule:'岗位目标必须来自有效任职记录。登记职级、目标星级、能力L等级是不同字段，禁止直接互换。',fields:[['employee_code','员工统一编码','string','State.assignments.personId'],['assignment_id','岗位任职记录','string','State.assignments.id'],['role_code','适用岗位编码','string','State.positions.roleId'],['assignment_type','主岗/兼岗/支援','string','State.assignments.type'],['effective_from','任职生效日期','date','State.assignments.start'],['effective_to','任职结束日期','date','State.assignments.end'],['target_star','本岗位确认的目标星级','integer','roleGrowthTarget：当前任职targetStars优先；主岗样本回退base.people.targetStars'],['job_reference_code','制度岗位目录编码','string','foundation.ranks.jobId'],['rank_scheme','登记职级制度','string','foundation.ranks.scheme'],['registered_rank','独立登记职级','string','foundation.ranks.value']]},
   {id:'NEED-ROLE-STANDARD',name:'岗位能力标准',purpose:'确定“每个岗位各级要达到什么要求”',description:'为岗位能力墙提供分岗位、分星级的单项能力目标、必选门槛与行为要求。',objects:['岗位','能力','能力分类','行为标准','岗位目标'],grain:'一个岗位在一个目标星级下，对一项能力的要求及其标准版本。',keys:['role_code','target_star','capability_code','standard_version'],rule:'逐项核对目标等级与必选门槛；岗位星级与能力等级分别定义，不允许用平均数抵消差距。',fields:[['role_code','岗位编码','string','State.catalog roleCapability.from'],['target_star','岗位目标星级','integer','roleCapability逐档目标数组索引'],['capability_code','能力编码','string','State.catalog roleCapability.to'],['capability_category','能力分类','string','base.capabilities.category；新能力分类待维护'],['target_level','单项能力目标等级','integer','roleCapability.targetLevels / base.capabilityTargets.targetLevel'],['required','是否必选能力','boolean','roleCapability.requirements.required / base.capabilityTargets.required'],['threshold_type','门槛属性','string','roleCapability.requirements.thresholdType / base.capabilityTargets.thresholdType'],['role_behavior','该岗位目标行为要求','string','roleCapability.behaviors / base.capabilityTargets.behavior'],['scenario_codes','适用业务场景','string[]','State.catalog roleScenario'],['standard_version','业务标准版本','string','currentVersion(State)'],['effective_from','标准生效时间','date','State.versions.date']]},
  ];
  dataNeeds.unshift(...core.map(c=>({id:c.id,name:c.name,purpose:c.purpose,description:c.description,semanticStatus:'proposed_business_requirement',semanticStatusLabel:'墙面用数需求，待对接确认',objects:c.objects,grain:c.grain,suggestedKeyFields:c.keys,useRule:c.rule,tags:[...roleIds.map(id=>({label:label(id),category:'适用岗位',origin:'current_business_scope'})),...unique(capabilityIds.flatMap(id=>base.capabilities.find(cap=>cap.id===id)?.category||[])).map(category=>({label:category,category:'能力分类',origin:'base.capabilities.category'}))],businessRefs:{roleIds:[...roleIds],scenarioIds:[...scenarioIds],taskIds:[...taskIds],capabilityIds:[...capabilityIds]},relationBasis:'来自岗位能力墙当前使用的结果与对标逻辑；尚未指定外部目录或库表。',demoReferences:{exampleOnly:true,scenarioIds:[] as string[],capabilityIds:[] as string[],source:'无目录关联示例'},requestedFields:c.fields.map(([name,label,type,source])=>({name,label,type,required:true,sensitive:null,description:`业务需求字段，依据 ${source}；外部字段与用途待确认。`,standard:null,origin:'proposed_requirement',namespace:'capability_wall',source,mappingStatus:'unconfirmed'})),additionalFieldCount:c.fields.length,suggestedRelations:[] as {field:string;object:string;meaning:string;status:string}[],catalogExampleId:null})));
 }
 const catalogReferences=dataNeeds.map(need=>{const asset=base.dataAssets.find(a=>a.id===need.catalogExampleId);return {needId:need.id,catalogId:null,catalogVersion:null,databaseId:null,databaseSchema:null,tableName:null,fieldMappings:[],matchStatus:'not_received',confirmationStatus:'unconfirmed',connectionStatus:'not_connected',exampleReference:asset?{assetId:asset.id,name:asset.name,sourceSystem:asset.system,interfaceName:asset.interfaceName,tableName:asset.tableName,directoryPath:[...asset.directoryPath],owner:asset.owner,exampleOnly:true,source:'mock-catalog.json:dataAssets'}:null}});
 return {
  schemaVersion:'95598-data-demand/1.0',requestId:`95598-${currentVersion(s)}-${roleIds.join('_')||'empty'}`,ontologyRevision:'1.0',standardVersion:currentVersion(s),referenceDate:s.date,
  scope:{roleId,roleIds,roleNames:roleIds.map(label)},availableRoles,
  syncStatus:'not_sent',syncStatusLabel:'未同步，仅供导出准备',dataNature:'synthetic_prototype_metadata',
  businessOntology:{nodes,relations:businessRelations,roleTaskBindings:bindings,roleCapabilityTargets:targets},
  dataNeeds,catalogReferences,matchResults:[] as {needId:string;catalogId:string;databaseId:string}[],
  platformHandoff:{direction:'business_requirements_to_governance_catalog',status:'not_connected',requestContents:['业务对象与关系','按岗位的能力目标','数据需求语义与字段','现有模拟目录参考'],expectedResponseFields:['requestId','needId','sourceStandardVersion','ontologyRevision','catalogId','catalogVersion','fieldMappings','grain','keyFields','timeScope','accessConditions','qualityConditions','matchExplanation','confirmationStatus','databaseReference'],note:'这是建议的对接格式，需与数据治理平台确认；本页面未调用接口或运行目录匹配。平台匹配、人工确认、用途授权及评价采信分别判断。'},
 };
}

export function ontologyExportJson(s:State,roleId='all'){
 const {availableRoles,...payload}=buildGovernanceOntology(s,roleId);
 return JSON.stringify(payload,null,2);
}

export const ontologySourceNotes={business:'当前已发布 catalog 节点与关系；按岗位的任务能力范围结合原始 roleCapabilityMap。',targets:'当前关系中的逐档目标优先，未覆盖项回退内置能力目标；未定义值保留为空。',metadata:'现有模拟数据资产目录及其字段、标签；建议对象、粒度和新增需求字段单独标注待确认。',knowledge:`本地有 ${foundation.knowledge.length} 条知识示例，用于说明知识与任务、场景和能力的关系。`};
