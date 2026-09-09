const fs=require('fs'),path=require('path'),assert=require('assert/strict'),ts=require('typescript');const out=path.resolve('work/workflow-check');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,'package.json'),'{"type":"commonjs"}');
for(const n of ['model','management-model','workflow-model','template-model','matrix-improvement-model'])fs.writeFileSync(path.join(out,n+'.js'),ts.transpileModule(fs.readFileSync(`app/${n}.ts`,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022,esModuleInterop:true}}).outputText);fs.copyFileSync('app/mock-catalog.json',path.join(out,'mock-catalog.json'));
fs.copyFileSync('app/foundation-reference.json',path.join(out,'foundation-reference.json'));const m=require(path.join(out,'management-model.js')),w=require(path.join(out,'workflow-model.js')),t=require(path.join(out,'template-model.js'));const results=[];function test(name,fn){try{fn();results.push({name,passed:true})}catch(e){results.push({name,passed:false,error:e.message});console.error(name,e.stack)}}const fresh=()=>w.createWorkspaceState();
test('V2 migration preserves all other records, old review does not create an assessment, repeat upgrade is idempotent',()=>{const old=m.createInitialState();old.legacyPlans=[{personId:'DEMO-013',resourceId:m.base.growthResources[0].id,status:'review'}];old.actions[0].title='用户先前修改';const original=JSON.stringify(old);const s=w.upgradeWorkspace(old);assert.equal(JSON.stringify(old),original);for(const key of ['orgs','positions','assignments','versions','facts','assessments','authorizations','appeals','audit','actions'])assert.deepEqual(s[key],old[key]);const d=s.development.find(d=>d.id==='MIGRATED-DEMO-013');assert.equal(d.targetConfirmed,false);assert.equal(d.resources[0].trained,true);assert.equal(d.targetPolicyId,'');assert.equal(s.assessments.length,old.assessments.length);assert.equal(s.legacyPlans.length,0);assert.deepEqual(w.upgradeWorkspace(s),s);assert.throws(()=>w.requestDevelopmentReview(s,d.id),/确认/)});
test('Missing historical deadlines are not converted to overdue tasks',()=>{const s=fresh();const a=w.todos(s).find(t=>t.id==='assessment:ASSESS-DEMO-013');assert.equal(a.due,'');assert.equal(w.todos(s).find(t=>t.id==='development:DEV-01').due,'')});
test('Training and practice alone never change capability, authorization, or supply',()=>{const s=fresh(),before=JSON.stringify([m.personAt(s,'DEMO-016'),s.authorizations,m.supply(s,'POL-SCN-03','SLOT-1')]);s.development[0].milestones.forEach(m=>{m.done=true;m.evidence='合成实践'});assert.equal(JSON.stringify([m.personAt(s,'DEMO-016'),s.authorizations,m.supply(s,'POL-SCN-03','SLOT-1')]),before)});
test('Cannot request review before required practice completion',()=>assert.throws(()=>w.requestDevelopmentReview(fresh(),'DEV-01'),/实践/));
test('A real assessment draft is linked once, returned assessment is reused, no premature pending-review stage',()=>{const s=fresh();s.development[0].milestones.forEach(m=>m.done=true);const ids=w.requestDevelopmentReview(s,'DEV-01');assert.ok(ids.length);assert.ok(ids.every(id=>s.assessments.find(a=>a.id===id)?.status==='草稿'));assert.equal(w.developmentStatus(s,s.development[0]),'复测待取证');const length=s.assessments.length;assert.deepEqual(w.requestDevelopmentReview(s,'DEV-01'),ids);s.assessments.find(a=>a.id===ids[0]).status='已退回';assert.deepEqual(w.requestDevelopmentReview(s,'DEV-01'),ids);assert.equal(s.assessments.length,length);assert.equal(w.todos(s).filter(t=>t.id==='assessment:'+ids[0]).length,1)});
test('Insufficient capability cannot be confirmed even when all practice is complete',()=>{const s=fresh();s.development[0].milestones.forEach(m=>m.done=true);assert.throws(()=>w.confirmDevelopment(s,'DEV-01'),/尚未全部满足/)});
test('Employee inbox only contains owned records, workflow context identifies source record',()=>{const s=fresh();const items=w.visibleTodos(s,'员工','DEMO-013');assert.ok(items.every(t=>t.ownerId==='DEMO-013'));const a=w.todos(s).find(t=>t.id==='assessment:ASSESS-DEMO-013');assert.equal(a.context.personId,'DEMO-013');assert.equal(a.context.recordId,'ASSESS-DEMO-013');assert.equal(a.context.scenarioId,'SCN-04');assert.equal(a.page,'evaluation')});
test('One verification completes an improvement action and removes its todo without changing other business records',()=>{
 const s=fresh(),before=structuredClone(s),a=s.actions.find(a=>a.id==='ACT-03');
 assert.ok(w.todos(s).some(t=>t.id==='action:'+a.id));
 w.completeImprovementAction(s,a.id,'  已核对渠道版本，附同步批次与验证记录。  ');
 assert.equal(a.status,'已完成');assert.equal(a.deliverable,'已核对渠道版本，附同步批次与验证记录。');
 assert.equal(a.acceptance,before.actions.find(x=>x.id===a.id).acceptance);
 assert.equal(s.audit.length,before.audit.length+1);
 assert.ok(!w.todos(s).some(t=>t.id==='action:'+a.id));
 for(const key of Object.keys(before).filter(k=>!['actions','audit'].includes(k)))assert.deepEqual(s[key],before[key]);
 assert.deepEqual(s.actions.filter(x=>x.id!==a.id),before.actions.filter(x=>x.id!==a.id));
});
test('Legacy pending acceptance retains its saved material and completes with one verification',()=>{
 const saved=fresh();const old=saved.actions.find(a=>a.id==='ACT-03');old.status='待验收';old.deliverable='已提交工作记录；退回：补充同步结果';
 const s=w.decodeWorkspace(JSON.stringify(saved)),a=s.actions.find(a=>a.id===old.id);
 assert.equal(JSON.stringify(s),JSON.stringify(saved));assert.equal(a.status,'待验收');
 w.completeImprovementAction(s,a.id,a.deliverable+'；已补齐同步结果');
 assert.equal(a.status,'已完成');assert.ok(a.deliverable.startsWith(old.deliverable));
 assert.equal(s.audit.length,saved.audit.length+1);
});
test('Empty material, missing actions and repeated verification do not change saved records or append audit entries',()=>{
 const s=fresh(),original=structuredClone(s);
 assert.throws(()=>w.completeImprovementAction(s,'ACT-03',' \n '),/验证材料/);assert.deepEqual(s,original);
 assert.throws(()=>w.completeImprovementAction(s,'MISSING','完成记录'),/未找到/);assert.deepEqual(s,original);
 w.completeImprovementAction(s,'ACT-03','首次完成记录');const completed=structuredClone(s);
 assert.throws(()=>w.completeImprovementAction(s,'ACT-03','重复记录'),/已完成/);assert.deepEqual(s,completed);
});
test('Improvement todos preserve the working owner and deadline while old acceptance assignments expire',()=>{
 const s=fresh(),a=s.actions.find(a=>a.id==='ACT-03');a.ownerId='DEMO-034';a.due='2026-09-12';
 const id='action:'+a.id;
 s.workspace.todoAssignments[id]={ownerId:a.ownerId,due:a.due,stage:a.category+'|提交改善材料'};
 let todo=w.todos(s).find(t=>t.id===id);assert.equal(todo.ownerId,a.ownerId);assert.equal(todo.due,a.due);
 a.status='待验收';s.workspace.todoAssignments[id]={ownerId:'DEMO-013',due:a.due,stage:a.category+'|检查产出并验收'};
 todo=w.todos(s).find(t=>t.id===id);assert.equal(todo.actor,'班组长');assert.equal(todo.ownerId,a.ownerId);assert.equal(todo.ownerLabel,m.nameOf(s,a.ownerId));
 assert.equal(todo.step,'填写验证材料并完成');assert.equal(todo.context.recordId,a.id);
 s.workspace.todoAssignments[id]={ownerId:'DEMO-035',due:'2026-09-15',stage:todo.category+'|'+todo.step};
 todo=w.todos(s).find(t=>t.id===id);assert.equal(todo.ownerId,'DEMO-035');assert.equal(todo.due,'2026-09-15');
});
test('Matrix deduplicates identical assignments and partitions all applicable people',()=>{const s=fresh();s.assignments.push({...s.assignments.find(a=>a.personId==='DEMO-018'),id:'DUP'});const cells=w.matrixCells(s,'ROLE-02',3);assert.equal(cells[0].total,8);cells.forEach(c=>assert.equal(c.achieved+c.gap+c.unknown,c.total))});
test('Changing target star changes actual matrix requirements',()=>{const s=fresh();assert.notDeepEqual(w.matrixCells(s,'ROLE-02',3).map(c=>c.level),w.matrixCells(s,'ROLE-02',4).map(c=>c.level))});
test('Training and draft results do not affect historical matrix, effective review changes only after date',()=>{const s=fresh();const cap='CAP-04';const baseline=w.matrixCells(s,'ROLE-02',3,'all','2026-09-01').find(c=>c.capabilityId===cap);const before=w.matrixCells(s,'ROLE-02',3).find(c=>c.capabilityId===cap);s.assessments.push({id:'TEST-EFFECTIVE',personId:'DEMO-013',capabilityId:cap,scenarioId:'SCN-04',targetLevel:3,status:'已生效',resultLevel:5,previousLevel:2,created:'2026-09-01',effective:'2026-09-07',reviewedAt:'2026-09-07T10:00:00Z',version:m.currentVersion(s),evidenceSnapshot:[{expires:'2026-12-31'}],factIds:[],reason:'test',reviewer:'复核',submitter:'评价'});assert.deepEqual(w.matrixCells(s,'ROLE-02',3,'all','2026-09-01').find(c=>c.capabilityId===cap),baseline);assert.ok(w.matrixCells(s,'ROLE-02',3).find(c=>c.capabilityId===cap).achieved>before.achieved)});
test('Semantic standard changes suspend comparison without mutating live state',()=>{const s=fresh();const c=structuredClone(s.catalog);c.nodes.find(n=>n.id==='CAP-04').description+='实质变化';s.versions.push({id:'NEW',date:'2026-09-06',catalog:c,policies:s.policies,reviewer:'模拟',note:'test'});s.catalog=c;const before=JSON.stringify(s);assert.equal(w.compareMatrix(s,'ROLE-02',3,'all','2026-09-01').comparable,false);assert.equal(JSON.stringify(s),before)});
test('Roster entrants are reported separately from the fixed comparison cohort',()=>{const s=fresh();s.assignments.find(a=>a.personId==='DEMO-020'&&a.type==='主岗').start='2026-09-05';const trend=w.compareMatrix(s,'ROLE-02',3,'all','2026-09-01');assert.ok(trend.entered.includes('DEMO-020'));assert.ok(!trend.cohort.includes('DEMO-020'))});
test('Two scene templates reuse capability IDs and do not change published state',()=>{const s=fresh(),before=JSON.stringify(s.catalog);const csv='类型,模板编码,新编码,新名称,负责人\n场景,SCN-03,SCN-X1,新增报修场景,业务专业\n场景,SCN-05,SCN-X2,新增投诉场景,投诉专业';const p=t.previewBatch(s,csv);assert.deepEqual(p.errors,[]);assert.equal(p.draft.catalog.nodes.filter(n=>n.kind==='capability').length,s.catalog.nodes.filter(n=>n.kind==='capability').length);t.applyBatch(s,csv,p.stamp);assert.equal(JSON.stringify(s.catalog),before);assert.equal(s.draft.status,'草稿');assert.throws(()=>m.publishDraft(s),/审核/);s.draft.status='已批准';s.draft.reviewer='模拟复核';m.publishDraft(s);assert.ok(s.catalog.nodes.some(n=>n.id==='SCN-X2'))});
test('Role template has explicit five-star requirements and complete reused business chain',()=>{const p=t.previewBatch(fresh(),'类型,模板编码,新编码,新名称,负责人\n岗位,ROLE-02,ROLE-X,故障后备岗,报修专业');assert.deepEqual(p.errors,[]);assert.ok(p.draft.catalog.edges.filter(e=>e.type==='roleCapability'&&e.from==='ROLE-X').every(e=>e.targetLevels.length===5))});
test('Mixed invalid CSV fails atomically, duplicate batch and stale preview are rejected',()=>{const s=fresh(),before=JSON.stringify(s);const p=t.previewBatch(s,'场景,SCN-03,SCN-X,有效新增,业务专业\n场景,NO-SUCH,SCN-Y,非法新增,业务专业');assert.ok(p.errors.length);assert.throws(()=>t.applyBatch(s,'场景,SCN-03,SCN-X,有效新增,业务专业\n场景,NO-SUCH,SCN-Y,非法新增,业务专业',p.stamp));assert.equal(JSON.stringify(s),before);const csv='场景,SCN-03,SCN-X,有效新增,业务专业',good=t.previewBatch(s,csv);t.applyBatch(s,csv,good.stamp);assert.ok(t.previewBatch(s,csv).errors.length);assert.throws(()=>t.applyBatch(s,csv,good.stamp),/重新预览/)});
test('CSV parser handles quoted commas and rejects unclosed quotes',()=>{assert.equal(t.parseCsv('场景,SCN-03,X,"含,逗号",专业')[0][3],'含,逗号');assert.throws(()=>t.parseCsv('场景,"未结束'),/引号/)});
test('Collaboration samples validate and old versions are not retroactively changed',()=>{const s=fresh(),history=JSON.stringify(s.versions);s.draft={catalog:structuredClone(s.catalog),policies:structuredClone(s.policies),status:'草稿',note:'协同',reviewer:'',date:s.date};s.draft.catalog.handoffs=w.exampleHandoffs(s.catalog);assert.equal(s.draft.catalog.handoffs.length,2);assert.deepEqual(m.checkCatalog(s.draft.catalog,s.draft.policies),[]);assert.equal(JSON.stringify(s.versions),history);assert.equal(s.catalog.handoffs,undefined)});
test('Inactive roles, duplicate scenario-task ownership, missing handoff material block publishing',()=>{const s=fresh();const c=structuredClone(s.catalog);c.handoffs=w.exampleHandoffs(c);c.handoffs[0].materials='';assert.ok(m.checkCatalog(c,s.policies).some(e=>e.includes('交接材料')));c.handoffs[0].materials='工单';c.handoffs.push({...c.handoffs[0],id:'DUP'});assert.ok(m.checkHandoffs(c).some(e=>e.includes('重复')));c.nodes.find(n=>n.id==='ROLE-04').active=false;assert.ok(m.checkHandoffs(c).some(e=>e.includes('岗位无效')))});
test('Collaboration changes include support, review, escalation roles and personnel in impact',()=>{const s=fresh();s.draft={catalog:structuredClone(s.catalog),policies:structuredClone(s.policies),status:'草稿',note:'协同',reviewer:'',date:s.date};s.draft.catalog.handoffs=w.exampleHandoffs(s.catalog);const i=m.impact(s);for(const id of ['ROLE-01','ROLE-02','ROLE-03','ROLE-04','ROLE-06'])assert.ok(i.roles.includes(id));assert.ok(i.people.length>0);assert.equal(m.catalogChanges(s.catalog,s.draft.catalog).filter(x=>x.change.includes('协同')).length,2)});
test('Malformed saved records fail decoding without modifying the supplied string',()=>{const original=JSON.stringify(fresh());assert.equal(JSON.stringify(w.decodeWorkspace(original)),original);const broken=JSON.parse(original);delete broken.assignments;assert.throws(()=>w.decodeWorkspace(JSON.stringify(broken)),/格式/);assert.throws(()=>w.decodeWorkspace('{broken'))});
test('Known V2 reserve targets recover matching open assessments during migration',()=>{const old=m.createInitialState(),d=old.development[0],p=old.policies.find(p=>p.id===d.targetPolicyId);d.status='待复核';d.milestones.forEach(m=>m.done=true);old.assessments.push({...old.assessments[0],id:'V2-OPEN',personId:d.personId,scenarioId:p.scenarioId,capabilityId:p.requirements[0].capabilityId,targetLevel:p.requirements[0].level});const s=w.upgradeWorkspace(old);assert.ok(s.development[0].assessmentIds.includes('V2-OPEN'));assert.equal(w.developmentStatus(s,s.development[0]),'复测待取证')});
test('Assignments expire on stage changes and plan does not duplicate open evaluation work',()=>{const s=fresh(),d=s.development[0];d.milestones.forEach(m=>m.done=true);const ids=w.requestDevelopmentReview(s,d.id);assert.ok(!w.todos(s).some(t=>t.id==='development:DEV-01'));let todo=w.todos(s).find(t=>t.id==='assessment:'+ids[0]);s.workspace.todoAssignments[todo.id]={ownerId:'DEMO-014',due:'2026-09-10',stage:todo.category+'|'+todo.step};assert.equal(w.todos(s).find(t=>t.id===todo.id).ownerId,'DEMO-014');s.assessments.find(a=>a.id===ids[0]).status='待复核';assert.equal(w.todos(s).find(t=>t.id===todo.id).ownerLabel,'专业复核员');assert.equal(w.todos(s).find(t=>t.id===todo.id).ownerId,'')});
test('Review milestone is system-checked and does not create a circular prerequisite',()=>{const s=fresh();const d=s.development[0];assert.ok(d.milestones.some(m=>m.systemReview));d.milestones.filter(m=>!m.systemReview).forEach(m=>m.done=true);assert.ok(w.requestDevelopmentReview(s,d.id).length)});
test('Complete practice-to-assessment-to-confirmation flow preserves independent authorization, then new standard requires confirmation',()=>{const s=fresh(),d=s.development[0];d.milestones.filter(m=>!m.systemReview).forEach(m=>{m.done=true;m.evidence='实践已核验'});const auth=JSON.stringify(s.authorizations);const ids=w.requestDevelopmentReview(s,d.id);for(const id of ids){const a=s.assessments.find(a=>a.id===id);s.facts.filter(f=>f.personId===a.personId&&f.capabilityId===a.capabilityId&&f.scenarioId===a.scenarioId).forEach(f=>f.excluded=true);for(let i=0;i<2;i++)s.facts.push({id:id+'-'+i,personId:a.personId,capabilityId:a.capabilityId,scenarioId:a.scenarioId,eventId:id+'-EVENT-'+i,level:a.targetLevel,observed:s.date,expires:'2026-12-31',quality:true,identity:true,permitted:true,conflict:false,source:'独立实操观察'});m.submitAssessment(s,id);m.reviewAssessment(s,id,true,'独立样本及行为复核通过','另一复核员')}assert.equal(w.developmentStatus(s,d),'条件满足，待确认');w.confirmDevelopment(s,d.id);assert.equal(w.developmentStatus(s,d),'培养目标已确认');assert.equal(d.confirmations.length,1);assert.equal(JSON.stringify(s.authorizations),auth);assert.ok(!w.todos(s).some(t=>t.id==='development:'+d.id));s.date='2027-01-01';assert.match(w.developmentStatus(s,d),/需重新确认/);assert.equal(d.confirmations.length,1)});
test('Role template preserves all five levels, required flags and threshold types',()=>{const s=fresh(),p=t.previewBatch(s,'岗位,ROLE-02,ROLE-COPY,报修后备岗,业务专业');assert.deepEqual(p.errors,[]);for(let star=1;star<=5;star++)assert.deepEqual(w.roleRequirements(p.draft.catalog,'ROLE-COPY',star),w.roleRequirements(s.catalog,'ROLE-02',star))});
test('Handoff owner must be assigned to its task and scene',()=>{const s=fresh(),c=structuredClone(s.catalog);c.handoffs=w.exampleHandoffs(c);c.handoffs[0].leadRoleId='ROLE-05';assert.ok(m.checkHandoffs(c).some(e=>e.includes('未承担该场景与任务')))});
test('Handoff-only changes notify involved roles but do not invalidate unrelated authorizations',()=>{const s=fresh(),before=m.authorizationStatus(s,'DEMO-020','POL-EXPERT');s.draft={catalog:structuredClone(s.catalog),policies:structuredClone(s.policies),status:'已批准',note:'协同',reviewer:'模拟',date:s.date};s.draft.catalog.handoffs=[w.exampleHandoffs(s.catalog)[0]];const impact=m.impact(s);assert.ok(impact.roles.includes('ROLE-02'));assert.ok(!impact.policies.includes('POL-EXPERT'));m.publishDraft(s);assert.equal(m.authorizationStatus(s,'DEMO-020','POL-EXPERT').label,before.label)});
test('Same-ID role requirement changes appear with exact before and after values and invalid old-edge levels are rejected',()=>{const s=fresh(),c=structuredClone(s.catalog),e=c.edges.find(e=>e.type==='roleCapability'&&e.from==='ROLE-02'&&e.to==='CAP-04');e.targetLevels=[2,3,4,5,5];const diff=m.catalogChanges(s.catalog,c);assert.ok(diff.some(d=>d.change==='修改岗位要求'&&d.after.includes('[2,3,4,5,5]')));e.targetLevels=[0,3,4,5,5];assert.ok(m.checkCatalog(c,s.policies).some(e=>e.includes('五个 L1')))});

const improve=require(path.join(out,'matrix-improvement-model.js'));
test('Matrix improvement keeps the selected role, star and actual capability level rather than the scenario default',()=>{
 const s=fresh(),context={personId:'DEMO-018',roleId:'ROLE-03',star:5,capabilityId:'CAP-02',scenarioId:'SCN-05'};
 const row=w.roleRequirements(s.catalog,context.roleId,context.star).find(r=>r.capabilityId===context.capabilityId);
 s.assessments=s.assessments.filter(a=>!(a.personId===context.personId&&a.capabilityId===context.capabilityId));
 const before=JSON.stringify([s.assignments,s.authorizations,m.base.people,m.base.capabilityTargets]);
 const id=improve.prepareMatrixAssessment(s,context),a=s.assessments.find(a=>a.id===id);
 assert.equal(a.targetLevel,row.level);assert.equal(a.targetRoleId,'ROLE-03');assert.equal(a.targetStar,5);
 assert.equal(improve.prepareMatrixAssessment(s,context),id);
 assert.throws(()=>improve.prepareMatrixAssessment(s,{...context,star:3}),/原评价/);
 a.status='已退回';assert.equal(improve.prepareMatrixAssessment(s,context),id);
 assert.equal(JSON.stringify([s.assignments,s.authorizations,m.base.people,m.base.capabilityTargets]),before);
});
test('Improvement preserves null current ability and uses actual L4 under a five-star requirement',()=>{
 const s=fresh(),rows=improve.matrixImprovementPlan(s,'DEMO-001','ROLE-01',5);
 const target=rows.find(r=>r.level===4);assert.ok(target);assert.equal(target.level,4);
 assert.equal(rows.find(r=>r.capabilityId==='CAP-21').currentLevel,null);
 assert.throws(()=>improve.prepareMatrixAssessment(s,{personId:'DEMO-001',roleId:'ROLE-02',star:3,capabilityId:'CAP-04',scenarioId:'SCN-04'}),/任职/);
});
test('Improvement evidence rejects incomplete, repeated, invalid or expired material and retains excluded originals',()=>{
 const s=fresh(),context={personId:'DEMO-002',roleId:'ROLE-01',star:3,capabilityId:'CAP-02',scenarioId:'SCN-01'};
 const id=improve.prepareMatrixAssessment(s,context),original=JSON.stringify(s);
 const input={eventId:'IMPROVE-EVENT-A',source:'本人录音及解释结果，测试模拟材料',level:3,observed:s.date,expires:'2026-12-31',confirmed:true};
 for(const bad of [{...input,eventId:' '},{...input,source:''},{...input,confirmed:false},{...input,level:0},{...input,level:2.5},{...input,observed:'2026-02-30'},{...input,observed:'2026-09-08'},{...input,expires:'2026-09-01'}])assert.throws(()=>improve.addImprovementEvidence(s,id,bad));
 assert.equal(JSON.stringify(s),original);
 const baseline=improve.matrixImprovementPlan(s,context.personId,context.roleId,context.star);
 improve.addImprovementEvidence(s,id,input);assert.deepEqual(improve.matrixImprovementPlan(s,context.personId,context.roleId,context.star),baseline);
 assert.throws(()=>improve.addImprovementEvidence(s,id,input),/重复/);
 const fact=s.facts.at(-1);assert.throws(()=>improve.setImprovementEvidenceExcluded(s,id,fact.id,true,''),/原因/);
 improve.setImprovementEvidenceExcluded(s,id,fact.id,true,'同一事项重复采集');assert.equal(fact.excluded,true);assert.ok(s.facts.includes(fact));
 improve.setImprovementEvidenceExcluded(s,id,fact.id,false,'复核归属后恢复');assert.equal(fact.excluded,false);
});
test('Improvement result needs sufficient distinct events and explicit confirmation before it changes the matrix',()=>{
 const s=fresh(),context={personId:'DEMO-002',roleId:'ROLE-01',star:3,capabilityId:'CAP-02',scenarioId:'SCN-01'};
 const id=improve.prepareMatrixAssessment(s,context),a=s.assessments.find(a=>a.id===id);
 for(const f of s.facts.filter(f=>f.personId===context.personId&&f.capabilityId===context.capabilityId&&f.scenarioId===context.scenarioId))improve.setImprovementEvidenceExcluded(s,id,f.id,true,'采用本次新实践材料');
 const retained=JSON.stringify([s.assignments,s.authorizations,s.versions,m.base.people]);
 const before=improve.matrixImprovementPlan(s,context.personId,context.roleId,context.star).find(r=>r.capabilityId===context.capabilityId);
 const newFact=n=>({eventId:'IMPROVE-VERIFY-'+n,source:'模拟工单材料位置及本人处理结果',level:a.targetLevel,observed:s.date,expires:'2026-12-31',confirmed:true});
 improve.addImprovementEvidence(s,id,newFact(1));assert.equal(improve.matrixEvidenceCheck(s,context.personId,context.capabilityId,context.scenarioId).ok,false);assert.throws(()=>m.submitAssessment(s,id),/样本不足/);
 improve.addImprovementEvidence(s,id,newFact(2));m.submitAssessment(s,id);assert.equal(a.status,'待复核');assert.equal(a.roleBehaviorSnapshot,w.roleRequirements(s.catalog,context.roleId,context.star).find(r=>r.capabilityId===context.capabilityId).behavior);
 assert.equal(improve.matrixImprovementPlan(s,context.personId,context.roleId,context.star).find(r=>r.capabilityId===context.capabilityId).status,before.status);
 assert.throws(()=>improve.addImprovementEvidence(s,id,newFact(3)),/已提交/);assert.throws(()=>m.reviewAssessment(s,id,true,'确认',a.submitter));
 m.reviewAssessment(s,id,true,'两个独立事件材料一致，确认实际表现','测试专业复核员');
 assert.equal(improve.matrixImprovementPlan(s,context.personId,context.roleId,context.star).find(r=>r.capabilityId===context.capabilityId).status,'achieved');
 assert.equal(JSON.stringify([s.assignments,s.authorizations,s.versions,m.base.people]),retained);
});
test('A confirmed observation below the requested target remains a gap and does not fabricate the target level',()=>{
 const s=fresh(),context={personId:'DEMO-002',roleId:'ROLE-01',star:5,capabilityId:'CAP-02',scenarioId:'SCN-01'};
 s.assessments=s.assessments.filter(a=>!(a.personId===context.personId&&a.capabilityId===context.capabilityId));
 const id=improve.prepareMatrixAssessment(s,context),a=s.assessments.find(a=>a.id===id);
 for(const f of s.facts.filter(f=>f.personId===context.personId&&f.capabilityId===context.capabilityId&&f.scenarioId===context.scenarioId))improve.setImprovementEvidenceExcluded(s,id,f.id,true,'采用本次材料');
 for(let n=1;n<=2;n++)improve.addImprovementEvidence(s,id,{eventId:'BELOW-'+n,source:'实际只能完成 L2 的模拟材料',level:2,observed:s.date,expires:'2026-12-31',confirmed:true});
 m.submitAssessment(s,id);assert.equal(a.resultLevel,2);m.reviewAssessment(s,id,true,'确认实际 L2，仍需提升','测试专业复核员');
 const row=improve.matrixImprovementPlan(s,context.personId,context.roleId,context.star).find(r=>r.capabilityId===context.capabilityId);assert.equal(row.currentLevel,2);assert.equal(row.status,'gap');
});
test('Multi-role demo upgrade adds distinct assignments once and preserves existing edits and ended appointments',()=>{
 const old=w.upgradeWorkspace(m.createInitialState()),before=structuredClone(old);old.actions[0].title='用户保留的事项';
 const upgraded=w.addMultiRoleSamples(old);assert.equal(old.assignments.length,before.assignments.length);assert.equal(upgraded.assignments.length,old.assignments.length+2);assert.equal(upgraded.actions[0].title,'用户保留的事项');
 assert.deepEqual(w.addMultiRoleSamples(upgraded),upgraded);assert.equal(new Set(m.activeAssignments(upgraded).map(a=>a.personId)).size,40);
 for(const pid of ['DEMO-001','DEMO-013','DEMO-018'])assert.equal(new Set(m.activeAssignments(upgraded).filter(a=>a.personId===pid).map(a=>upgraded.positions.find(p=>p.id===a.positionId).roleId)).size,2);
 for(const key of ['versions','facts','assessments','authorizations','development'])assert.deepEqual(upgraded[key],old[key]);
 const ended=structuredClone(old);ended.assignments.push({id:'USER-HISTORY',personId:'DEMO-001',positionId:ended.positions.find(p=>p.roleId==='ROLE-05').id,type:'兼岗',start:'2026-01-01',end:'2026-08-31',reason:'用户已结束'});
 const restored=w.decodeWorkspace(JSON.stringify(ended));assert.equal(restored.assignments.filter(a=>a.personId==='DEMO-001'&&restored.positions.find(p=>p.id===a.positionId).roleId==='ROLE-05').length,1);assert.equal(restored.assignments.find(a=>a.id==='USER-HISTORY').end,'2026-08-31');
 assert.equal(m.activeAssignments(upgraded,'2026-09-01').length,m.activeAssignments(old,'2026-09-01').length);
});


test('Multi-role growth goals are independent and an unconfigured secondary role does not borrow the primary goal',()=>{
 const s=fresh();assert.equal(m.roleGrowthTarget(s,'DEMO-001','ROLE-01'),3);assert.equal(m.roleGrowthTarget(s,'DEMO-001','ROLE-05'),2);
 assert.equal(m.roleGrowthTarget(s,'DEMO-018','ROLE-02'),5);assert.equal(m.roleGrowthTarget(s,'DEMO-018','ROLE-03'),3);
 const secondary=s.assignments.find(a=>a.id==='ASG-MULTI-DEMO-001');delete secondary.targetStars;assert.equal(m.roleGrowthTarget(s,'DEMO-001','ROLE-05'),null);
 secondary.end='2026-08-31';secondary.targetStars=2;assert.equal(m.roleGrowthTarget(s,'DEMO-001','ROLE-05'),null);
});
test('A legacy assessment with a different target freezes behavior for its actual level, not the current scenario default',()=>{
 const s=fresh(),context={personId:'DEMO-002',roleId:'ROLE-01',star:5,capabilityId:'CAP-02',scenarioId:'SCN-01'};
 s.assessments=s.assessments.filter(a=>!(a.personId===context.personId&&a.capabilityId===context.capabilityId));
 const id=improve.prepareMatrixAssessment(s,context),a=s.assessments.find(a=>a.id===id);delete a.targetRoleId;delete a.targetStar;
 for(const f of s.facts.filter(f=>f.personId===a.personId&&f.capabilityId===a.capabilityId&&f.scenarioId===a.scenarioId))improve.setImprovementEvidenceExcluded(s,id,f.id,true,'采用本次材料');
 for(let n=1;n<=2;n++)improve.addImprovementEvidence(s,id,{eventId:'LEGACY-'+n,source:'历史目标实际表现记录',level:a.targetLevel,observed:s.date,expires:'2026-12-31',confirmed:true});
 m.submitAssessment(s,id);const behavior=s.catalog.nodes.find(n=>n.level===a.targetLevel&&s.catalog.edges.some(e=>e.type==='capabilityBehavior'&&e.from===a.capabilityId&&e.to===n.id));assert.equal(a.roleBehaviorSnapshot,behavior.description);
});

fs.writeFileSync('work/workflow-verification.json',JSON.stringify({type:'Synthetic business logic checks; no browser QA',results},null,2));console.log(JSON.stringify({passed:results.every(r=>r.passed),total:results.length,failed:results.filter(r=>!r.passed)},null,2));if(results.some(r=>!r.passed))process.exitCode=1;
