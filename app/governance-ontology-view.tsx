'use client';
import {useState} from 'react';
import {ArrowRight,Braces,BriefcaseBusiness,Check,ChevronDown,Database,Download,FileJson,Layers3,Link2,Network} from 'lucide-react';
import {useManagement} from './management-context';
import {Badge,Picker} from './ui-parts';
import {Modal} from './management-ui';
import {buildGovernanceOntology,ontologyExportJson,ontologySourceNotes} from './governance-ontology';
import {GovernanceSourceReference} from './governance-source-reference';

export function GovernanceOntologyView(){
 const {state:s,notify}=useManagement();
 const roles=s.catalog.nodes.filter(n=>n.active&&n.kind==='role');
 const [roleSelection,setRoleSelection]=useState(roles.some(r=>r.id==='ROLE-02')?'ROLE-02':roles[0]?.id||'all');
 const roleId=roleSelection==='all'||roles.some(r=>r.id===roleSelection)?roleSelection:roles[0]?.id||'all';
 const [needId,setNeedId]=useState('NEED-CAPABILITY-RESULT');
 const [preview,setPreview]=useState(false);
 const bundle=buildGovernanceOntology(s,roleId);
 const need=bundle.dataNeeds.find(n=>n.id===needId)||bundle.dataNeeds[0];
 const catalog=need?bundle.catalogReferences.find(c=>c.needId===need.id):null;
 const example=catalog?.exampleReference;
 const names=new Map(bundle.businessOntology.nodes.map(n=>[n.id,n.name]));
 const name=(id:string)=>names.get(id)||id;
 const scenes=bundle.businessOntology.nodes.filter(n=>n.kind==='scenario');
 const tasks=bundle.businessOntology.nodes.filter(n=>n.kind==='task');
 const capabilities=bundle.businessOntology.nodes.filter(n=>n.kind==='capability');
 const first=bundle.businessOntology.roleTaskBindings[0];
 const sampleTarget=first?bundle.businessOntology.roleCapabilityTargets.find(t=>t.roleId===first.roleId&&t.capabilityId===first.capabilityIds[0]&&t.star===3):null;
 const sampleBehavior=sampleTarget?.roleBehavior||bundle.businessOntology.nodes.find(n=>n.kind==='behavior'&&n.level===sampleTarget?.targetLevel&&bundle.businessOntology.relations.some(r=>r.type==='capabilityBehavior'&&r.from===sampleTarget?.capabilityId&&r.to===n.id))?.description;
 const download=()=>{const text=ontologyExportJson(s,roleId);const url=URL.createObjectURL(new Blob([text],{type:'application/json;charset=utf-8'}));const link=document.createElement('a');link.href=url;link.download=`95598_岗位数据对接清单_${roleId}_${bundle.standardVersion}.json`;link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);notify('对接清单已下载。尚未向数据治理平台同步。')};
 return <section className="governance-ontology">
  <div className="ontology-intro"><div><span className="ontology-eyebrow">岗位能力墙 · 数据准备</span><h2>从岗位业务到数据清单</h2><p>说明业务需要什么数据，再交给数据治理平台匹配目录、找到对应数据库。</p></div><Badge tone="blue">对接清单 · 待同步</Badge></div>
  <ol className="ontology-flow" aria-label="业务到数据的对接流程">
   {[{title:'岗位业务',sub:'业务本体',text:'岗位、场景、任务与能力',icon:<Network size={20}/>,owner:'我方整理'},{title:'数据需求',sub:'数据本体',text:'对象、描述、标签与字段',icon:<Braces size={20}/>,owner:'我方提供'},{title:'平台匹配目录',sub:'数据治理平台',text:'理解需求，推荐已有目录',icon:<Layers3 size={20}/>,owner:'待对接'},{title:'目录定位数据库',sub:'确认后接入',text:'确认库表、字段和使用条件',icon:<Database size={20}/>,owner:'未接入'}].map((step,i)=><li key={step.title}><div className="ontology-step-top"><span className="ontology-step-icon">{step.icon}</span><small>{String(i+1).padStart(2,'0')}</small>{i<3&&<ArrowRight className="ontology-flow-arrow" size={16}/>}</div><h3>{step.title}<span>{step.sub}</span></h3><p>{step.text}</p><span className="ontology-step-owner">{step.owner}</span></li>)}
  </ol>
  <div className="ontology-toolbar"><label><BriefcaseBusiness size={17}/><span>查看岗位</span><Picker label="数据需求适用岗位" value={roleId} onChange={setRoleSelection} options={[{value:'all',label:'全部岗位'},...roles.map(r=>({value:r.id,label:r.name}))]}/></label><div><button type="button" className="button outline" onClick={()=>setPreview(true)}><FileJson size={16}/>查看同步内容</button><button type="button" className="button primary" disabled={!bundle.scope.roleIds.length} onClick={download}><Download size={16}/>导出对接清单</button></div></div>
  <section className="panel ontology-business"><div className="ontology-section-heading"><div><h3><Network size={18}/>业务本体<span>先看这个岗位做什么</span></h3><p>{scenes.length} 个业务场景 · {tasks.length} 项岗位任务 · {capabilities.length} 项能力</p></div><Badge tone="gray">当前已发布要求</Badge></div>
   <div className="ontology-business-summary"><div><span className="ontology-minor-label">涉及的业务场景</span><div className="ontology-chips">{scenes.map(scene=><span key={scene.id}>{scene.name}</span>)}{!scenes.length&&<span>当前岗位尚未定义场景</span>}</div></div>{first&&<div className="ontology-business-example"><span className="ontology-minor-label">一条业务关系示例</span><div><b>{name(first.roleId)}</b><ArrowRight size={13}/><span>{name(first.scenarioId)}</span><ArrowRight size={13}/><span>{name(first.taskId)}</span></div>{sampleTarget&&<p><Badge tone="green">3 星对标示例</Badge>{name(sampleTarget.capabilityId)}{sampleTarget.targetLevel?` · L${sampleTarget.targetLevel}`:' · 目标待定义'}<small>{sampleBehavior||'岗位目标行为待补充'}</small></p>}</div>}</div>
   <details className="ontology-business-details"><summary>展开岗位、任务与能力关系<ChevronDown size={15}/></summary><div>{bundle.businessOntology.roleTaskBindings.map(binding=><article key={`${binding.roleId}:${binding.scenarioId}:${binding.taskId}`}><h4>{name(binding.taskId)}</h4><span>{name(binding.roleId)} · {name(binding.scenarioId)}</span><p>{binding.capabilityIds.map(name).join('、')||'该任务的能力关联待补充'}</p></article>)}</div><p>完整的等级行为、岗位目标和关系编码均包含在对接清单中。</p></details>
  </section>
  <section className="panel ontology-demands"><div className="ontology-section-heading"><div><h3><Braces size={18}/>数据本体<span>把需要的数据说清楚</span></h3><p>围绕能力墙整理 {bundle.dataNeeds.length} 类需求；对象、粒度和字段口径将在对接时确认。</p></div></div>
   <div className="ontology-demand-workspace"><nav className="ontology-need-list" aria-label="数据需求清单">{bundle.dataNeeds.map((row,i)=><button type="button" key={row.id} className={row.id===need?.id?'is-active':''} aria-pressed={row.id===need?.id} onClick={()=>setNeedId(row.id)}><span>{String(i+1).padStart(2,'0')}</span><div><b>{row.name}</b><small>{row.purpose}</small></div><ArrowRight size={14}/></button>)}</nav>
    {need?<div className="ontology-need-detail" key={`${roleId}:${need.id}`}><div className="ontology-need-heading"><div><span className="ontology-minor-label">这类数据用来做什么</span><h4>{need.name}</h4></div><Badge tone="amber">待匹配目录</Badge></div><p className="ontology-need-description">{need.description}</p><div className="ontology-need-use"><Check size={16}/><span>{need.useRule}</span></div><dl className="ontology-semantics"><div><dt>涉及哪些对象</dt><dd>{need.objects.join('、')}</dd></div><div><dt>一条记录代表什么</dt><dd>{need.grain}<small>建议口径，待业务确认</small></dd></div><div><dt>用于哪些岗位</dt><dd>{bundle.scope.roleNames.join('、')}</dd></div></dl>
     <details className="ontology-detail-fold"><summary><span>需要哪些字段</span><small>{need.requestedFields.length} 个字段定义</small><ChevronDown size={15}/></summary><p>“目录参考”来自现有模拟目录；“业务需求”是为满足本业务提出的字段，均未完成实际库表映射。</p><div className="ontology-field-list">{need.requestedFields.map(field=><article key={field.name}><div><b>{field.label}</b><Badge tone={field.origin==='existing_demo_catalog'?'gray':'blue'}>{field.origin==='existing_demo_catalog'?'目录参考':'业务需求'}</Badge></div><code>{field.name}</code><small>{field.description}</small></article>)}</div></details>
     <details className="ontology-detail-fold"><summary><span>给平台识别的描述与关联</span><ChevronDown size={15}/></summary><div className="ontology-tags">{need.tags.map((tag,i)=><span key={`${tag.category}:${tag.label}:${i}`}>{tag.category} · {tag.label}</span>)}</div><p>{need.relationBasis}</p><dl className="ontology-semantic-refs"><div><dt>关联场景</dt><dd>{need.businessRefs.scenarioIds.map(name).join('、')||'待确认'}</dd></div><div><dt>关联能力</dt><dd>{need.businessRefs.capabilityIds.map(name).join('、')||'待确认'}</dd></div></dl></details>
     <div className="ontology-catalog-preview"><h5><Link2 size={16}/>治理平台返回后，接到哪里</h5><p>尚未收到平台匹配结果。目录、数据库和实际字段都需要平台返回并人工确认。</p>{example?<details><summary>查看现有模拟目录示例<ChevronDown size={14}/></summary><div className="ontology-catalog-path"><span>{example.sourceSystem}</span><ArrowRight size={13}/><span>{example.name}</span><ArrowRight size={13}/><code>{example.tableName}</code></div><small>以上仅为目录样例，未匹配、未接入；数据库实例与实际表结构尚待确认。</small></details>:<div className="ontology-no-catalog"><Database size={16}/><span>这项需求尚无目录示例，等待平台匹配。</span></div>}</div>
    </div>:<div className="ontology-empty">当前没有可展示的岗位数据需求。</div>}
   </div>
  </section>
  <details className="ontology-reference"><summary><Database size={16}/><span>查看当前原型的数据来源参考</span><ChevronDown size={15}/></summary><div><GovernanceSourceReference/></div></details>
  <p className="ontology-footer">当前仅整理和导出需求说明。数据治理平台负责匹配其已有目录与数据库；匹配结果、用途授权和评价采信分别确认。</p>
  <Modal open={preview} onClose={()=>setPreview(false)} title="对接清单 · 待同步" sub="供后续数据治理平台理解业务需求和匹配数据目录，目前未调用接口。"><div className="ontology-sync-preview"><div className="ontology-sync-scope"><span>适用岗位</span><b>{bundle.scope.roleNames.join('、')||'未选定岗位'}</b><small>业务标准 {bundle.standardVersion}</small></div><ol><li><b>业务本体</b><span>岗位、场景、任务、能力、等级行为及其关系</span></li><li><b>数据本体</b><span>{bundle.dataNeeds.length} 类需求的描述、对象、粒度、标签、字段和业务关联</span></li><li><b>待平台返回</b><span>候选目录、字段对应关系、匹配依据、库表位置和使用条件</span></li></ol><p>不包含员工样本或业务事件明细。下载文件不会标记为已同步。</p><details><summary>查看 JSON 对接内容<ChevronDown size={14}/></summary><pre>{ontologyExportJson(s,roleId)}</pre></details><details><summary>查看来源与口径说明<ChevronDown size={14}/></summary>{Object.values(ontologySourceNotes).map(text=><p key={text}>{text}</p>)}</details><button type="button" className="button primary" onClick={download}><Download size={16}/>下载 JSON 对接清单</button></div></Modal>
 </section>;
}
