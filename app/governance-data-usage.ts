import {db} from './model';
import {foundation} from './foundation';
import {activeAssignments,currentVersion,type State} from './management-model';
import {foundationStorageKey} from './foundation-storage';

type UsageSpec={purpose:string;pages:string[];currentReading:string;locations:{source:string;fields:string[]}[];currentSummary:(s:State)=>string};

/** These are display mappings, not database connections or ingestion rules. */
const usageByAsset:Record<string,UsageSpec>={
 'ASSET-01':{
  purpose:'确认人员属于哪个岗位、班组，以及岗位登记与任职情况。',
  pages:['人员能力分析','组织能力分析','业务保障'],
  currentReading:'人员样本、岗位登记与工作区任职记录；尚未读取人资系统的真实任职表。',
  locations:[{source:'mock-catalog.json',fields:['people']},{source:'foundation-reference.json',fields:['jobs','profiles','ranks']},{source:'当前管理状态',fields:['orgs','positions','assignments']}],
  currentSummary:s=>`${db.people.length} 个人员样本 · ${activeAssignments(s).length} 条当前任职记录`,
 },
 'ASSET-02':{
  purpose:'查看业务情景观察的来源，以及它关联了哪些场景和能力。',
  pages:['岗位图谱','人员能力详情','证据详情'],
  currentReading:'本地标记为“工单”的合成观察摘要；未读取真实工单明细。能力评价另使用工作区的独立事件记录核验。',
  locations:[{source:'mock-catalog.json',fields:['dataAssets','evidence（assetId = ASSET-02）']}],
  currentSummary:()=>`${db.evidence.filter(e=>e.assetId==='ASSET-02').length} 条工单观察摘要（合成）`,
 },
 'ASSET-03':{
  purpose:'查看服务行为观察、对应能力和证据来源。',
  pages:['岗位图谱','人员能力详情','证据详情'],
  currentReading:'本地标记为“质检”的合成观察摘要；未连接质检系统或读取真实录音。',
  locations:[{source:'mock-catalog.json',fields:['dataAssets','evidence（assetId = ASSET-03）']}],
  currentSummary:()=>`${db.evidence.filter(e=>e.assetId==='ASSET-03').length} 条质检观察摘要（合成）`,
 },
 'ASSET-04':{
  purpose:'查看考试、实操观察与能力证据的对应关系。',
  pages:['岗位图谱','人员能力详情','证据详情'],
  currentReading:'本地标记为“考试”的合成观察摘要；未连接考试系统或导入真实成绩。',
  locations:[{source:'mock-catalog.json',fields:['dataAssets','evidence（assetId = ASSET-04）']}],
  currentSummary:()=>`${db.evidence.filter(e=>e.assetId==='ASSET-04').length} 条考试观察摘要（合成）`,
 },
 'ASSET-05':{
  purpose:'展示建议学习的内容，以及培养计划、训练与实践进度。',
  pages:['成长路径','培养发展','工作台'],
  currentReading:'内置培养资源与本次演示填写的培养进度。训练任务表目前只有目录说明，尚未接入外部训练记录。',
  locations:[{source:'mock-catalog.json',fields:['dataAssets','growthResources']},{source:'当前管理状态',fields:['development','legacyPlans']}],
  currentSummary:s=>`${db.growthResources.length} 项培养资源 · ${s.development.length} 份培养计划`,
 },
 'ASSET-06':{
  purpose:'说明岗位与能力要求，并查阅业务知识、版本及原文出处。',
  pages:['岗位标尺','岗位图谱','知识依据','能力评价'],
  currentReading:'内置参考资料、知识示例及当前标准快照；未连接知识运营系统。知识记录中的渠道版本也是演示值。',
  locations:[{source:'foundation-reference.json',fields:['sources','knowledge','evidenceKnowledge']},{source:'mock-catalog.json',fields:['roles','capabilities','capabilityTargets']},{source:'当前管理状态',fields:['catalog','policies','versions']}],
  currentSummary:s=>`${foundation.knowledge.length} 条知识示例 · 当前标准 ${currentVersion(s)}`,
 },
};

export function dataUsageCatalog(s:State){
 return db.dataAssets.map(asset=>{
  const spec=usageByAsset[asset.id]||{purpose:asset.evidencePurpose,pages:['数据来源详情'],currentReading:'已登记本地来源目录；尚未配置实际业务数据读取。',locations:[{source:'mock-catalog.json',fields:['dataAssets']}],currentSummary:()=>`${asset.fields.length} 个目录字段`};
  const evidence=db.evidence.filter(e=>e.assetId===asset.id);
  const sceneIds=[...new Set(evidence.flatMap(e=>e.scenarioIds))];
  const capabilityIds=[...new Set(evidence.flatMap(e=>e.capabilityIds))];
  return {
   id:asset.id,name:asset.name,system:asset.system,owner:asset.owner,interfaceName:asset.interfaceName,tableName:asset.tableName,
   fields:asset.fields.map(f=>({name:f.name,label:f.label,type:f.type,required:f.required})),
   purpose:spec.purpose,pages:spec.pages,currentReading:spec.currentReading,currentSummary:spec.currentSummary(s),locations:spec.locations,
   status:'待接入真实系统',catalogKind:'模拟来源目录',evidenceCount:evidence.length,
   scenarios:sceneIds.map(id=>({id,name:db.scenarios.find(sc=>sc.id===id)?.name||id})),
   capabilities:capabilityIds.map(id=>({id,name:db.capabilities.find(c=>c.id===id)?.name||id})),
  };
 });
}

export function filterDataUsage(rows:ReturnType<typeof dataUsageCatalog>,query:string){
 const terms=query.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
 return rows.filter(row=>{const text=[row.name,row.system,row.owner,row.tableName,row.interfaceName,row.purpose,...row.pages,...row.fields.flatMap(f=>[f.name,f.label]),...row.scenarios.map(x=>x.name),...row.capabilities.map(x=>x.name)].join(' ').toLocaleLowerCase();return terms.every(term=>text.includes(term))});
}

export function localDataSources(s:State){
 return [
  {id:'business-samples',name:'内置业务资料',path:'app/mock-catalog.json',description:'岗位、场景、能力要求、人员样本、观察摘要和培养资源，载入后随当前演示状态更新。',contents:`${db.roles.length} 个岗位样本、${db.scenarios.length} 个场景、${db.capabilities.length} 项能力、${db.evidence.length} 条合成观察摘要`,fields:['roles','scenarios','tasks','capabilities','capabilityTargets','people','evidence','dataAssets','growthResources']},
  {id:'reference-samples',name:'参考资料与知识',path:'app/foundation-reference.json',description:'参考文件目录、岗位登记、知识示例及版本信息。页面读取本地整理结果。',contents:`${foundation.sources.length} 份参考来源、${foundation.jobs.length} 项岗位目录、${foundation.knowledge.length} 条知识示例`,fields:['sources','jobs','profiles','ranks','rules','knowledge','evidenceKnowledge']},
  {id:'workspace-records',name:'本次演示办理记录',path:`内存工作区 / 浏览器本地记录（${foundationStorageKey}）`,description:'任职、能力评价、授权、业务安排和培养进度保存在当前工作区；浏览器保存情况以下方提示为准。',contents:`${s.assessments.length} 条能力评价、${s.authorizations.length} 条授权记录、${s.facts.length} 条独立事件观察、${s.development.length} 份培养计划`,fields:['orgs','positions','assignments','catalog','policies','versions','facts','assessments','appeals','authorizations','slots','demands','allocations','actions','diagnoses','development','audit','workspace.todoAssignments']},
 ];
}
