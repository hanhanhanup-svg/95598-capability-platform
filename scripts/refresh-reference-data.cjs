// Reproducible synthetic dataset, isolated from the legacy V3 demonstration.
const fs=require('fs');
const d=JSON.parse(fs.readFileSync('reference/legacy-catalog-v3.json','utf8'));
const meta={standardVersion:'REF-BO-1.0',sourceType:'附件框架下的合成演示标准',status:'演示已发布',effectiveFrom:'2026-09-01'};
const cid=n=>`CAP-${String(n).padStart(2,'0')}`;
const definitions=[
 ['诉求澄清','服务沟通','通过询问、复述和确认识别诉求及业务边界','复述确认一项明确诉求','区分常规诉求与一般异常','澄清多项诉求的主次和关联','识别复杂诉求的真实目标与限制','归纳重大疑难诉求并形成澄清方法'],
 ['依据解释','服务沟通','结合有效资料说明适用依据，回应追问并确认理解','独立说明基础业务依据','解释常规业务及一般异常依据','结合资料说明依据，回应一般复杂追问','解释复杂诉求的适用依据，说明处理方案','对重大疑难问题形成可追溯的依据说明并指导复用'],
 ['情绪回应','服务沟通','识别情绪并通过共情、回应和边界说明推进服务','识别明显情绪并作适当回应','处理一般不满并确认后续安排','回应多轮质疑，保持解释清晰','在复杂冲突中稳定沟通并识别升级节点','复盘重大冲突并完善情绪回应方法'],
 ['疑难处置','复杂问题研判','根据业务事实和风险边界处理疑难问题并及时升级','独立完成基础问题处理，识别需升级情形','处置一般异常并记录依据','处理核心业务的一般复杂问题','综合多源信息处置本专业复杂问题','研判重大疑难事项并组织方案复核'],
 ['规范办理','业务处理','按照适用流程完成业务操作、记录及结果确认','独立完成基础业务规定动作','办理常规事项和一般异常','处理多条件业务并核验关键环节','组织复杂业务办理并保留决策记录','优化重大疑难事项办理方式并复核效果'],
 ['风险识别','风险防控','识别业务、安全及服务风险，明确响应与升级边界','识别基础业务明显风险并提示','判断一般异常风险并按规则响应','识别复杂条件下的关联风险','研判跨专业风险并安排协同处置','形成重大风险研判与防范建议'],
 ['跨专业协同','协同处置','明确责任、交接材料和反馈要求，推动跨专业协作','向对应专业准确提交基础事项','完成常规协同并确认接收','处理一般复杂协作并跟进反馈','组织多专业处置并协调分歧','复盘重大协同问题并完善责任界面'],
 ['案例复盘','学习改进','依据业务记录还原过程，区分知识、流程、系统与人员因素','复述基础案例的过程和结果','识别常见偏差并提出改进','用证据分析复杂案例，不由指标直接推定能力','组织专业复盘并验证改进措施','提炼重大疑难案例方法并指导应用'],
 ['知识沉淀','学习改进','形成有来源、适用范围、版本及审核记录的可复用知识','记录基础业务经验和引用来源','整理常见问答并去除重复','沉淀一般复杂案例并核对版本与适用条件','组织专业知识审核和反馈修订','建立重大疑难知识的持续复核机制'],
 ['原因分析','复杂问题研判','结合多源事实区分问题原因、证据与待验证假设','依据完整记录定位基础问题原因','区分一般异常和信息缺失','比较多种成因并补充验证样本','分析复杂问题的流程、知识和系统等共同因素','组织重大疑难问题的根因验证与持续改进'],
 ['业务辅导','学习改进','围绕行为差距安排实践、观察和反馈','示范基础业务动作并说明要求','辅导常见问题并核对实践结果','按个人差距安排情境练习和复测','组织专业实践并校准导师评价','培养专业骨干并验证辅导体系效果'],
 ['方案比较','复杂问题研判','比较处理方案的依据、约束、风险和后续影响','在规定范围选择基础处理方案','比较常规方案的适用条件','比较一般复杂问题的备选方案','权衡复杂诉求的跨专业影响','组织重大疑难方案论证并记录取舍依据'],
 ['规则理解','业务处理','理解适用规则、业务条件及例外，核对来源与时点','识别基础业务适用规则并独立使用','解释常规规则和一般例外','判断多个条件下的规则适用性','处理复杂规则冲突并提交确认','归纳重大疑难规则适用边界'],
 ['信息核查','业务处理','核对人员、业务、地区、时点与来源资料，识别缺失和矛盾','独立核对基础业务必要信息','核查一般异常信息并补齐缺项','交叉核对多来源记录并说明差异','组织复杂资料核验并确认关键事实','建立重大疑难事项的核验路径'],
 ['信息传递','协同处置','准确传达业务事实、依据、责任和时限','完整传递基础业务信息','传递一般异常及必要附件','提炼复杂信息并确认对方理解','协调多专业口径并控制版本差异','建立重大事项的信息传递规范'],
 ['任务跟进','协同处置','跟踪办理进度、反馈时限及闭环结果','跟进基础事项直至结果确认','识别常规超时并提醒责任方','跟进复杂事项的多个节点','协调本专业复杂事项堵点','完善重大事项督办与复盘机制'],
 ['合规执行','风险防控','按有效流程和授权边界执行，遇到冲突及时报告','依照基础规则独立操作并留痕','识别常规流程的例外和权限边界','校验复杂操作依据并及时升级','复核本专业复杂处置的合规性','组织重大事项合规复盘和规则完善'],
 ['信息保护','风险防控','按照业务用途核验访问范围，控制敏感信息使用与传递','按授权查看和使用必要信息','在常规服务中完成脱敏与身份核验','识别复杂资料中的敏感信息和越权风险','复核跨专业传递的最小必要范围','完善重大事项信息保护措施'],
 ['任务组织','AI应用与协作','划分人工与AI协作任务，明确输入、校验节点和责任','安排基础辅助任务并保留人工确认','拆分常规业务与一般异常辅助任务','组织多步骤任务并设置人工校验点','在复杂协作中界定人工决策与AI辅助边界','设计重大疑难任务协作方式并验证可控性'],
 ['指令表达','AI应用与协作','向AI说明任务、资料范围、约束与输出要求','用明确任务和指定资料形成指令','补充常规任务的范围及约束','针对一般复杂任务指定引用和校验要求','迭代复杂指令并验证歧义和约束','沉淀经过验证的任务指令与适用边界'],
 ['结果校验','AI应用与协作','逐项核验AI结果的事实、来源、规则、适用范围与表达','核对基础回答与指定来源一致','识别常规回答中的过期或无依据内容','核验多来源结果并处理一般复杂追问','复核复杂回答的规则冲突与跨专业影响','组织重大疑难输出的复核并总结失效模式'],
 ['异常接管','AI应用与协作','在AI依据不足、输出异常或越界时接管并留存原因','识别明显异常并转人工处理','接管一般错误并说明正确依据','处理多轮协作异常并保存处置记录','组织复杂异常处置并反馈知识或系统问题','复盘重大异常并完善接管条件与责任机制']
];
const levelNames=['基础业务独立处理','常规业务及一般异常','核心业务及一般复杂问题','本专业复杂诉求','重大疑难研判与处理'];
d.capabilities=definitions.map((x,i)=>({...meta,id:cid(i+1),name:x[0],category:x[1],definition:x[2],roleIds:[],levels:x.slice(3).map((behavior,j)=>({level:j+1,name:levelNames[j],behavior,behaviorId:`BEH-${String(i+1).padStart(2,'0')}-L${j+1}`}))}));
const roleNames=['电话服务专员 · 综合业务','电话服务专员 · 报修查询','电子服务专员 · 投诉举报','质检员','知识编译员','电话服务班长'];
const roleCaps=[
 [1,2,3,5,6,13,14,15,16,17,18,19,20,21,22],
 [1,2,3,4,5,6,7,13,14,15,16,17,18,19,20,21,22],
 [1,2,3,5,6,7,13,14,15,16,17,18,19,20,21,22],
 [2,6,8,10,13,14,17,18,21],
 [2,8,9,10,13,14,17,18,20,21],
 [6,7,10,11,12,15,16,17,19,21,22]
].map(a=>a.map(cid));
d.roles.forEach((r,i)=>{r.name=roleNames[i];r.capabilityIds=roleCaps[i]});
// Keep existing scenes and workflows; specialize their task content and supported capabilities.
const taskAdds=[[13,14],[13,14,19,20,21],[15,16,17,18,22],[13,14],[13,14,21],[15,16,17,18,19,20,22],[13,14,19,20,21],[17,18,22],[15,16],[13,14,19,20,21],[17,18,22],[15,16],[2,13,14,19,20,21],[13,17,18,22],[2,15,16],[13,14,17,18,21],[13,14,17,18,21],[15,16,19,21,22],[13,14,18,20,21],[13,14,17,18,20,21],[13,14,17,18,20,21],[19,21],[15,16,17,19,21,22],[15,16,17,19,21]];
d.tasks.forEach((t,i)=>{t.capabilityIds=[...new Set([...t.capabilityIds,...taskAdds[i].map(cid)])];t.roleCapabilityMap=Object.fromEntries(d.roles.filter(r=>r.taskIds.includes(t.id)).map(r=>[r.id,t.capabilityIds.filter(id=>r.capabilityIds.includes(id))]))});
d.tasks[11].capabilityIds.push('CAP-02');d.tasks[11].roleCapabilityMap['ROLE-02'].push('CAP-02');
Object.assign(d.tasks[0],{name:'核实账单与咨询事项',input:'客户咨询、账单记录、适用地区与计费时点',action:'澄清咨询事项，交叉核对账单项目、客户信息和规则来源',output:'已核实的计费事实与待澄清差异'});
Object.assign(d.tasks[1],{name:'核查并解释电费构成',input:'已核实账单、有效知识版本和适用条件',action:'结合资料说明依据，回应一般复杂追问；使用AI时核验其来源与数值',output:'完整说明依据、确认理解并保留引用版本的服务记录'});
Object.assign(d.tasks[12],{input:'客户电子渠道文字诉求、关联工单和有效知识资料',action:'澄清事实和核心诉求，核验辅助摘要；形成依据完整、表达清晰的书面说明',output:'核实后的书面诉求摘要与依据引用'});
Object.assign(d.tasks[18],{input:'来源文件、知识反馈与适用地区和时点',action:'核验来源、适用范围与有效期，保留原文定位',output:'可追溯的知识采编依据'});
Object.assign(d.tasks[19],{action:'编审问答，合并相似问，检查内容冲突、敏感信息和AI生成内容',output:'知识修订稿、版本差异与质量校验记录'});
Object.assign(d.tasks[20],{action:'审核发布知识版本，核查各服务渠道同步情况并处理反馈',output:'发布记录、渠道版本对照和反馈处理记录'});
d.capabilities.forEach(c=>c.roleIds=d.roles.filter(r=>r.capabilityIds.includes(c.id)).map(r=>r.id));
const oldTargets=d.capabilityTargets;
d.capabilityTargets=d.roles.flatMap(r=>[1,2,3,4,5].flatMap(star=>r.capabilityIds.map(capabilityId=>{
 const old=oldTargets.find(t=>t.roleId===r.id&&t.star===star&&t.capabilityId===capabilityId);
 const ai=Number(capabilityId.slice(-2))>=19;
 const behavior=capabilityId==='CAP-02'&&r.id==='ROLE-03'&&star===3?'形成依据完整、表达清晰的书面说明。':capabilityId==='CAP-02'&&r.id==='ROLE-01'&&[3,4].includes(star)?(star===3?'结合资料说明依据，回应一般复杂追问。':'解释复杂诉求的适用依据，说明处理方案。'):'';
 return {...meta,id:`REQ-${r.id}-S${star}-${capabilityId}`,roleId:r.id,star,capabilityId,targetLevel:old?.targetLevel??star,required:old?.required??true,thresholdType:ai?'AI协作必选能力':old?.thresholdType||'业务必选能力',scenarioIds:r.scenarioIds,behavior};
})));
// These are a newly generated demonstration cohort, never a reassessment of saved V3 users.
d.people.forEach((p,i)=>{
 const r=d.roles.find(r=>r.id===p.roleId);const e=d.evidence.find(e=>e.employeeId===p.id&&e.evidenceStatus==='admissible');
 for(const cap of r.capabilityIds)if(!p.capabilities[cap]){const level=p.formalStars;p.capabilities[cap]={level,evidenceStatus:'admissible',evidenceIds:[e.id]};e.capabilityIds.push(cap);e.observations.push({capabilityId:cap,level,behaviorId:`BEH-${cap.slice(-2)}-L${level}`,result:'附件框架下的新合成行为观察，非旧版结论换算'})}
});
const example=d.people[0];example.capabilities['CAP-14'].level=3;
const ee=d.evidence.find(e=>e.id===example.capabilities['CAP-14'].evidenceIds[0]);ee.observations.find(o=>o.capabilityId==='CAP-14').level=3;ee.observations.find(o=>o.capabilityId==='CAP-14').behaviorId='BEH-14-L3';
for(const id of ['CAP-19','CAP-20','CAP-22']){example.capabilities[id].level=3;const o=ee.observations.find(o=>o.capabilityId===id);o.level=3;o.behaviorId='BEH-'+id.slice(-2)+'-L3'}
example.capabilities['CAP-21']={level:null,evidenceStatus:'missing',evidenceIds:[]};ee.capabilityIds=ee.capabilityIds.filter(id=>id!=='CAP-21');ee.observations=ee.observations.filter(o=>o.capabilityId!=='CAP-21');
example.growthFocus={type:'capability',capabilityId:'CAP-02',targetLevel:3,reason:'依据解释当前 L2，对照电话服务三星要求需提升；AI结果校验另有证据缺口',nextAction:'练习完整说明依据、回应一般复杂追问，并由导师记录复测表现',resourceIds:['RES-02','RES-14','RES-21']};
d.growthResources=d.capabilities.map((c,i)=>({...meta,id:`RES-${String(i+1).padStart(2,'0')}`,name:`${c.name} · ${i>=18?'AI协作实操':'情境实践'}`,type:['典型案例','情境陪练','导师辅导'][i%3],capabilityIds:[c.id],roleIds:c.roleIds,scenarioIds:[...new Set(d.roles.filter(r=>c.roleIds.includes(r.id)).flatMap(r=>r.scenarioIds))],durationMinutes:i>=18?40:30,reason:`针对${c.name}的已确认差距安排实践；待验证时先补齐证据`,verification:`在两个独立事件中观察“${c.levels[2].behavior}”，由评价人员复核；完成学习不自动达标`}));
d.meta={...d.meta,title:'95598岗位能力图谱基础数据 · 附件参考版',version:'2.0',generatedAt:'2026-09-08',dataNature:'岗位目录与分类摘自附件；人员、业务记录、行为细化与统计为模拟数据',warning:'岗位目录参考2025.11.10修订稿，能力族参考用户图片。岗位职级、能力对标与场景授权分别记录；不代表生效制度或真实人员评价。',targetSemantics:'一至五星仅为图片所示能力对标要求；L1—L5为单项行为等级，均不替代修订稿岗位职级。'};
delete d.validationSummary;
for(const collection of ['businessDomains','roles','responsibilities','scenarios','tasks','capabilities','capabilityTargets','people','evidence','dataAssets','growthResources'])for(const row of d[collection])row.standardVersion=meta.standardVersion;
d.meta.standardVersion=meta.standardVersion;
const addField=(assetId,name,label,rule)=>{const a=d.dataAssets.find(a=>a.id===assetId);a.fields.push({name,label,type:'string',required:true,sensitive:false,qualityRule:rule,qualityStatus:'passed',standard:{id:'REF-DS-'+name.toUpperCase(),name:label,version:'REF-DS-1.0'}})};
for(const [name,label,rule] of [['job_reference_code','制度岗位编码','引用三个序列的岗位名称目录，岗位样本单独编码'],['rank_scheme','职级制度','区分服务星级、智能星级、岗位职级与首席聘任'],['registered_rank','登记职级','来自独立登记记录，不由能力达标比例或学习完成度推算']])addField('ASSET-01',name,label,rule);
for(const [name,label,rule] of [['knowledge_type','知识类型','FAQ、文档、图片、表格、音视频、结构化知识之一'],['source_document','来源文件与记录','保留原始来源标识'],['source_locator','原文定位','文档段落、表格位置或音视频时间点'],['knowledge_version','知识版本','与具体引用时点、渠道相绑定'],['effective_period','适用时段','有效期、适用地区与业务条件分别核对'],['channel_version','服务渠道版本','区分发布版本和各渠道实际可见版本'],['feedback_reference','质量反馈引用','关联整改事项与复验记录；无问题明确填写不适用']])addField('ASSET-06',name,label,rule);
d.dataAssets.find(a=>a.id==='ASSET-06').evidencePurpose='知识主记录、类型、原文定位、版本与渠道同步，为具体任务及行为观察提供依据';
d.people.forEach(p=>{p.resultId='REF-'+p.resultId;p.resultStatus='新合成结果';p.ruleVersion='REF-RULE-1.0'});
d.evidence.forEach(e=>{e.sourceRecordId='REF-'+e.sourceRecordId;e.batchId='REF-SYNTHETIC-0908';e.ruleVersion='REF-EV-1.0';e.summary='附件参考版重新构造的合成记录，不继承旧版业务事实或人员评价。';e.observations.forEach(o=>{o.result='新合成观察，非旧版结论换算';o.roleBehavior=d.capabilityTargets.find(t=>t.roleId===d.people.find(p=>p.id===e.employeeId).roleId&&t.targetLevel===o.level&&t.capabilityId===o.capabilityId&&t.behavior)?.behavior||''})});
fs.writeFileSync('app/mock-catalog.json',JSON.stringify(d,null,2)+'\n');

const sequences=[{id:'SEQ-01',name:'生产序列',names:'电话服务专员、电子服务专员、智能服务专员、电话服务班长、电子服务班长、智能服务班长、首席客服专员'.split('、')},{id:'SEQ-02',name:'支撑序列',names:'系统维护员、安全员、客户体验师、服务监督员、大数据应用专员、质检员、审单员、知识编译员、重要服务事项专员、运营调控专员、内训师、业务分析师、智能服务场景设计师'.split('、')},{id:'SEQ-03',name:'运营序列',names:'安全主管、综合主管、话务预测排班主管、知识编译主管、质检主管、内训主管、业务分析主管、服务联络主管、业务运营主管、客服经理'.split('、')}];
let jobIndex=0;const jobs=sequences.flatMap(s=>s.names.map(name=>({id:`JOB-${String(++jobIndex).padStart(2,'0')}`,name,sequenceId:s.id,rankScheme:name==='首席客服专员'?'首席聘任':name==='智能服务专员'?'智能星级（待确认）':['电话服务专员','电子服务专员'].includes(name)?'服务星级':'岗位职级',sourceId:'SRC-RANK',locator:'第2—4页，第8—9条',status:'修订稿参考'})));
const profileNames=['电话服务专员','电话服务专员','电子服务专员','质检员','知识编译员','电话服务班长'];
const profiles=d.roles.map((r,i)=>({roleId:r.id,jobId:jobs.find(j=>j.name===profileNames[i]).id,focus:['综合业务','报修查询','投诉举报','服务质量复核','知识采编与版本核验','班组运营与辅导'][i],coverage:i<3?'代表性任务样本，未覆盖完整岗位资格；二星及以上服务专员全业务技能须另行核验。':'代表性任务样本，未覆盖完整岗位资格；采用一级至三级职级，相关资格需另行核验。'}));
const ranks=d.people.map(p=>{const job=jobs.find(j=>j.id===profiles.find(r=>r.roleId===p.roleId).jobId);const isGrade=job.rankScheme==='岗位职级';const value=isGrade?Math.max(1,Math.min(3,p.formalStars-1)):p.formalStars;return {personId:p.id,jobId:job.id,scheme:job.rankScheme,value,label:isGrade?['一级','二级','三级'][value-1]:['无星','一星','二星','三星','四星','五星','六星'][value],status:'模拟登记',sourceId:'SRC-RANK'}});
const knowledgeSpec=[
 ['KN-FAQ-001','FAQ问答对','电费账单构成解释问答',['SCN-01'],['TASK-01','TASK-02']],
 ['KN-FAQ-002','FAQ问答对','停电进度查询与反馈问答',['SCN-03'],['TASK-07','TASK-08','TASK-09']],
 ['KN-DOC-001','文档类','电费电价口径适用性核对指引',['SCN-01'],['TASK-01','TASK-02']],
 ['KN-DOC-002','文档类','投诉升级交接资料核对指引',['SCN-05'],['TASK-13','TASK-14','TASK-15']],
 ['KN-IMG-001','图片类','故障范围初判流程示意',['SCN-04'],['TASK-10','TASK-11','TASK-12']],
 ['KN-IMG-002','图片类','知识版本差异核对操作图',['SCN-07'],['TASK-19','TASK-20','TASK-21']],
 ['KN-TAB-001','表格类','价目与参数口径字段示例',['SCN-01'],['TASK-01','TASK-02']],
 ['KN-TAB-002','表格类','渠道知识版本对照台账',['SCN-07'],['TASK-21']],
 ['KN-AV-001','音视频类','客户情绪回应话术示例',['SCN-05'],['TASK-13','TASK-14']],
 ['KN-AV-002','音视频类','账单解释情境训练演示',['SCN-01'],['TASK-02']],
 ['KN-STR-001','结构化知识','投诉升级节点与岗位责任示例',['SCN-05'],['TASK-14','TASK-15']],
 ['KN-STR-002','结构化知识','知识发布与反馈处理规则示例',['SCN-07'],['TASK-19','TASK-20','TASK-21']]
];
const knowledge=knowledgeSpec.map(([id,type,title,scenarioIds,taskIds],i)=>({id,type,title,scenarioIds,taskIds,capabilityIds:[...new Set(d.tasks.filter(t=>taskIds.includes(t.id)).flatMap(t=>t.capabilityIds))],roleIds:d.roles.filter(r=>r.taskIds.some(id=>taskIds.includes(id))).map(r=>r.id),version:i===1?'K2.0':'K1.0',previousVersion:i===1?'K1.0':'',effectiveFrom:'2026-08-20',effectiveUntil:'2026-12-31',publicationStatus:'已发布',qualityStatus:'通过',owner:'知识编译专业（模拟）',region:'示例地区，使用前核对实际适用范围',sourceDocument:`DEMO-KNOWLEDGE-${String(i+1).padStart(3,'0')}`,sourceLocator:type==='音视频类'?'00:20—01:40（演示定位）':type==='表格类'?'工作表1 / 第2—6行（演示定位）':'第1节 / 片段01（演示定位）',content:`${title}：核对来源、地区、时点和版本后使用。此处仅提供训练要点，不包含真实政策数值或可用于生产的服务答复。`,channels:[{channel:'坐席知识端',version:i===1?'K2.0':'K1.0',syncStatus:'已同步'},{channel:'智能客服端',version:'K1.0',syncStatus:i===1?'待同步':'已同步'}],sourceId:'SRC-KNOWLEDGE',isSynthetic:true}));
const ref={edition:'REF-2026-09-08',title:'附件参考基础数据',sources:[{id:'SRC-RANK',name:'国家电网有限公司客户服务中心客服专员岗位职级管理办法（修订稿）-2025.11.10.pdf',nature:'修订稿，未确认生效',locator:'25页；本原型页码与印刷页码一致',sha256:'593a2cc715d13579238e684ff11f2e015de5c703c6481991b509c7ed80886072'},{id:'SRC-KNOWLEDGE',name:'新型知识库选型建设技术方案 0814.docx',nature:'技术方案参考',locator:'知识分类表、95598现状、知识处理与追溯章节；未采用技术选型及效果数字',sha256:'19f11dea855e51609b25d99db260e0f24e3fc5e4f005258fccba0f7d5ee9d0b3'},{id:'SRC-WALL',name:'用户提供的95598岗位能力墙图片',nature:'能力框架示意',locator:'统一星级定义、七个能力族、分级行为要求、人员对照与成长',sha256:'a9ed63ed05dffdebe37e9c07747b3c359df0adbe59f85f237396364637268e1d'}],sequences:sequences.map(({names,...s})=>s),jobs,profiles,ranks,
 starDefinitions:levelNames.map((name,i)=>({star:i+1,name,sourceId:'SRC-WALL'})),
 rankSchemes:[{name:'服务星级',levels:['无星','一星','二星','三星','四星','五星','六星'],sourceId:'SRC-RANK',locator:'第3—4页'},{name:'智能星级（待确认）',levels:['一星','二星','三星','四星','五星','六星'],sourceId:'SRC-RANK',locator:'第3、5页；数量表述冲突待确认'},{name:'岗位职级',levels:['一级','二级','三级'],sourceId:'SRC-RANK',locator:'第4页'},{name:'首席聘任',levels:['首席客服专员'],sourceId:'SRC-RANK',locator:'第3—4页；一般2年聘期，资格条款冲突待确认'}],
 behaviorExamples:[{roleId:'ROLE-01',star:3,capabilityId:'CAP-02',behavior:'结合资料说明依据，回应一般复杂追问。',sourceId:'SRC-WALL'},{roleId:'ROLE-01',star:4,capabilityId:'CAP-02',behavior:'解释复杂诉求的适用依据，说明处理方案。',sourceId:'SRC-WALL'},{roleId:'ROLE-03',star:3,capabilityId:'CAP-02',behavior:'形成依据完整、表达清晰的书面说明。',sourceId:'SRC-WALL'}],
 rules:[{title:'适用范围',text:'南、北分中心劳务派遣制客服专员，协理员、驾驶员等除外。',locator:'第1页，第3条'},{title:'全业务技能',text:'二星及以上服务专员需具备报修查询、综合业务、投诉举报等全业务技能。代表性场景达标不能代替全业务核验。',locator:'第3页，第9条'},{title:'服务专员成绩',text:'绩效50%＋业务调考15%＋业务实操35%；调考分数线由分中心划定且不得低于60分。',locator:'第7—8页，第21条'},{title:'班长成绩',text:'班组评价80%＋个人能力20%；话务量条件由分中心制定。',locator:'第9页，第22条'},{title:'支撑、运营成绩',text:'业务调考／评级考试25%＋绩效50%＋述职评价25%。',locator:'第9—10页，第23条'},{title:'职级比例',text:'服务专员一星与二星合计≤30%，三星≥40%，四星≤15%，五星≤10%，六星≤5%。一级≥40%、二级≤35%、三级≤25%。分母为中心下达的各序列定员人数，不使用本原型40人直接测算。',locator:'第10页第25条、第16页附表'},{title:'公示与复核',text:'公示3个工作日；书面申请复核后，人资3个工作日内答复是否受理，5个工作日内组织复核并书面反馈。',locator:'第11页，第28条'}].map(r=>({...r,sourceId:'SRC-RANK',status:'修订稿参考，未启用为自动规则'})),
 developmentPaths:[{from:'三星及以上服务专员',to:'一级班长／一级支撑',condition:'相应岗位满0.5年，参加竞聘并通过考核；一级班长另有支撑序列路径。',locator:'第5、19—20页'},{from:'四星及以上服务专员／班长／支撑',to:'一级运营主管',condition:'四星服务专员或班长满1年，或支撑岗位满1.5年，并通过相应考核。',locator:'第5、20页'},{from:'一星服务专员',to:'跨级申报三星',condition:'入职两年内，一星后各月绩效B及以上且评价周期连续6个月A；连续两次未成功停止申请；须本人申请、部门申报与人资审核。',locator:'第5页，第14条'}],
 conflicts:[['智能服务等级数量','第3页称“五个等级”却列一至六星，第5页再次列六档。','第3、5页'],['首席申报通道','正文六星可竞聘，第17页图为五星，第19页为五星满2年或六星满1年。','第3—4、17、19页'],['六星考核名称','六星晋升行写“通过五星评级考核”，保留原文待确认。','第19页'],['智能一星时间','参考晋升时间0.5年与申报要求电话／电子服务满1年不一致。','第18—19页'],['客服经理通道','正文包含六星满1年，附表未列此路径。','第5、20页'],['岗位名称差异','正文“综合主管、话务预测排班主管”与时间表名称不完全一致；目录采用正文。','第3、18页'],['培训积分折算','积分折算条款未说明如何进入总分，不自行分配权重。','第7—9页'],['知识数量口径','方案两处将标问与标答数量相互颠倒；未导入原型统计。','DOCX原95598知识库现状两段']].map(([title,detail,locator],i)=>({id:`ISSUE-${i+1}`,title,detail,locator,sourceId:i===7?'SRC-KNOWLEDGE':'SRC-RANK',status:'待业务确认'})),knowledge,
 knowledgeTypes:['FAQ问答对','文档类','图片类','表格类','音视频类','结构化知识'],
 knowledgeFeedback:[{id:'KFB-001',knowledgeId:'KN-FAQ-002',version:'K2.0',category:'渠道版本不一致',description:'坐席知识端已使用K2.0，智能客服端仍为K1.0，先核对同步批次和发布记录。',owner:'DEMO-035',status:'待办理',actionId:'ACT-03',diagnosisId:'DIAG-01'}],
 evidenceKnowledge:d.evidence.filter(e=>e.observations.some(o=>['CAP-02','CAP-21'].includes(o.capabilityId))&&knowledge.some(k=>k.scenarioIds.some(id=>e.scenarioIds.includes(id)))).map(e=>{const k=knowledge.find(k=>k.scenarioIds.some(id=>e.scenarioIds.includes(id)));return {evidenceId:e.id,knowledgeId:k.id,usedVersion:k.version,usedAt:e.observedAt,taskId:k.taskIds[0],sourceLocator:k.sourceLocator,note:'引用记录为合成示例；采信依赖独立行为观察，非检索次数'}})
};
ref.knowledge.forEach(k=>{k.versions=[{version:k.version,effectiveFrom:k.effectiveFrom,effectiveUntil:k.effectiveUntil,status:'已发布'}];if(k.previousVersion)k.versions.unshift({version:k.previousVersion,effectiveFrom:'2026-08-01',effectiveUntil:'2026-08-19',status:'已被替代'});k.channels.forEach(c=>c.syncedAt=c.syncStatus==='已同步'?'2026-08-20 09:00':'2026-08-01 09:00')});
ref.evidenceKnowledge.forEach(e=>{e.channel='坐席知识端';if(e.evidenceId==='EV-014'&&e.knowledgeId==='KN-FAQ-002'){e.channel='智能客服端';e.usedVersion='K1.0';e.note='引用时渠道仍显示旧版；版本不一致是知识问题线索，不能直接认定员工能力不足'}});
fs.writeFileSync('app/foundation-reference.json',JSON.stringify(ref,null,2)+'\n');
console.log(JSON.stringify({roles:d.roles.length,referenceJobs:jobs.length,capabilities:d.capabilities.length,families:new Set(d.capabilities.map(c=>c.category)).size,targets:d.capabilityTargets.length,people:d.people.length,knowledge:knowledge.length}));
