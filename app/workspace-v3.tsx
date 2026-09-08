'use client';
import {useState,useEffect,useRef,type CSSProperties} from 'react';
import {Network,LayoutDashboard,BriefcaseBusiness,TrendingUp,ChevronRight,ShieldCheck,Settings2,ClipboardCheck,Info,X,ArrowUpRight,Users} from 'lucide-react';
import {Sidebar,SidebarProvider,SidebarContent,SidebarHeader,SidebarFooter,SidebarMenu,SidebarMenuItem,SidebarMenuButton,SidebarTrigger} from '@/components/ui/sidebar';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {ManagementProvider,useManagement} from './management-context';
import {base,currentVersion,setReferenceDate,personAt,nameOf} from './management-model';
import {db,roles,type Person} from './model';
import {GraphView,type DetailRef} from './graph-view';
import {WallView} from './wall-view';
import {BusinessView} from './business-view';
import {DataView} from './data-view';
import {DetailPanel} from './detail-panel';
import {OrganizationView} from './organization-view';
import {GovernanceView} from './governance-view';
import {AuthorizationView,EvaluationView} from './evaluation-view';
import {SupplyView,DiagnosisView} from './operations-view';
import {TalentView} from './talent-workspace';
import {WorkbenchView} from './workbench-view';
import {OrganizationMatrix} from './organization-matrix';
import {HandoffView,TemplateView} from './maintenance-tools';
import {Picker,Segments,Badge} from './ui-parts';
import {Field} from './management-ui';
import type {ViewRole,WorkContext} from './workflow-model';

export const groups=[
 {id:'overview',label:'工作台',icon:LayoutDashboard,pages:[['overview','待办与提醒']]},
 {id:'wall',label:'岗位能力墙',icon:BriefcaseBusiness,pages:[['wall','人员能力'],['matrix','组织能力'],['business','岗位与业务标准'],['graph','关联图谱'],['handoff','协同责任']]},
 {id:'supply',label:'业务保障',icon:Users,pages:[['supply','能力供需与预警'],['diagnosis','业务结果诊断']]},
 {id:'evaluation',label:'评价与授权',icon:ClipboardCheck,pages:[['evaluation','评价与复核'],['authorization','场景上岗授权']]},
 {id:'talent',label:'培养发展',icon:TrendingUp,pages:[['talent','统一培养计划']]},
 {id:'organization',label:'体系管理',icon:Settings2,pages:[['organization','组织与岗位'],['governance','标准与版本'],['templates','模板与批量维护'],['handoff-admin','协同标准维护'],['data','数据治理']]}
];
const alias=(id:string)=>id==='growth'?'talent':id;
const validPage=(id:string)=>groups.some(g=>g.pages.some(p=>p[0]===alias(id)));
const descriptions:Record<string,string>={overview:'把风险和待办落实到具体人员与下一步行动。',wall:'查看岗位能力现状、组织共性缺口与成长方向。',supply:'对照业务需求安排能力保障，追查异常并跟进改善。',evaluation:'让每项能力结论和场景授权都有可核验的依据。',talent:'个人成长、导师带教与人才梯队共用一份培养记录。',organization:'维护组织、业务标准与数据依据，支撑体系持续延伸。'};
export default function WorkspaceV3(){return <ManagementProvider><Workspace/></ManagementProvider>}
function Workspace(){
 const {state:s,mutate,message,notify,storageStatus,legacyAvailable,exportLegacy}=useManagement();const [page,setPage]=useState('overview');const [roleId,setRoleId]=useState('ROLE-02');const [personId,setPersonId]=useState('DEMO-013');const personRef=useRef(personId);const [context,setContext]=useState<WorkContext>({});const [nonce,setNonce]=useState(0);const [viewRole,setViewRole]=useState<ViewRole>('管理者');const [viewerId,setViewerId]=useState('DEMO-016');const [about,setAbout]=useState(false);const [stack,setStack]=useState<DetailRef[]>([]);const [assetId,setAssetId]=useState(db.dataAssets[0].id);const [dataTab,setDataTab]=useState('catalog');
 const stateRef=useRef(s);stateRef.current=s;
 const choosePerson=(id:string)=>{personRef.current=id;setPersonId(id)};
 const applyRoute=(id:string,ctx:WorkContext)=>{if(!validPage(id))return;const next={...ctx};if(next.personId&&!base.people.some(p=>p.id===next.personId))delete next.personId;if(next.roleId&&!stateRef.current.catalog.nodes.some(n=>n.id===next.roleId&&n.kind==='role'&&n.active))delete next.roleId;if(next.policyId&&!stateRef.current.policies.some(p=>p.id===next.policyId))delete next.policyId;if(next.personId)choosePerson(next.personId);if(next.roleId)setRoleId(next.roleId);setContext(next);setPage(alias(id));setNonce(n=>n+1);setStack([])};
 const go=(id:string,ctx:WorkContext={})=>{if(!validPage(id))return;const next={...ctx};applyRoute(id,next);const query=new URLSearchParams(Object.entries(next).filter(([,v])=>!!v) as [string,string][]).toString();window.history.pushState({},'',`#${alias(id)}${query?'?'+query:''}`);window.scrollTo({top:0,behavior:'instant'})};
 useEffect(()=>{const sync=()=>{const [id,query='']=window.location.hash.slice(1).split('?');if(validPage(id)){const allowed=['personId','roleId','policyId','scenarioId','capabilityId','recordId','tab','orgId'];const ctx=Object.fromEntries([...new URLSearchParams(query)].filter(([k])=>allowed.includes(k)));applyRoute(id,ctx)}};sync();window.addEventListener('hashchange',sync);window.addEventListener('popstate',sync);return()=>{window.removeEventListener('hashchange',sync);window.removeEventListener('popstate',sync)}},[]);
 const restored=useRef(false);useEffect(()=>{if(!restored.current&&storageStatus==='演示操作保存于此浏览器'){restored.current=true;const [id,query='']=window.location.hash.slice(1).split('?');if(validPage(id))applyRoute(id,Object.fromEntries(new URLSearchParams(query)))}},[storageStatus]);
 const group=groups.find(g=>g.pages.some(p=>p[0]===page))||groups[0];const nav=groups.filter(g=>viewRole==='体系管理员'||g.id!=='organization');const openDetail=(d:DetailRef)=>setStack(st=>[...st,d]);const openGrowth=(p:Person)=>go('talent',{personId:p.id,roleId:p.roleId});
 const openData=(id:string,tab:string)=>{setAssetId(id);setDataTab(tab);go('data')};
 const snapshot=useRef({page,personId,roleId});snapshot.current={page,personId,roleId};
 useEffect(()=>{const modelContext=(document as Document&{modelContext?:{registerTool:(tool:unknown,options:{signal:AbortSignal})=>unknown}}).modelContext;if(!modelContext)return;const controller=new AbortController();try{modelContext.registerTool({name:'read_capability_workspace',description:'Read the synthetic workspace selection.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>({...snapshot.current,synthetic:true})},{signal:controller.signal});modelContext.registerTool({name:'navigate_capability_workspace',description:'Open a capability workspace view and optionally select a valid employee or role.',inputSchema:{type:'object',properties:{page:{type:'string',enum:groups.flatMap(g=>g.pages.map(p=>p[0]))},personId:{type:'string'},roleId:{type:'string'}},required:['page'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:(v:{page:string;personId?:string;roleId?:string})=>{if(!validPage(v.page)||v.personId&&!base.people.some(p=>p.id===v.personId)||v.roleId&&!roles.some(r=>r.id===v.roleId))throw new Error('Invalid selection');go(v.page,{personId:v.personId,roleId:v.roleId});return {page:v.page,synthetic:true}}},{signal:controller.signal})}catch{/* Optional integration does not block this workspace. */}return()=>controller.abort()},[]);
 const sharedKey=`${page}:${nonce}`;
 return <SidebarProvider style={{'--sidebar-width':'218px'} as CSSProperties}><Sidebar className="app-sidebar"><SidebarHeader className="brand"><span className="brand-mark"><Network size={27}/></span><div><strong>95598</strong><span>岗位能力图谱</span></div></SidebarHeader><SidebarContent><div className="nav-caption">工作空间</div><SidebarMenu className="nav-menu">{nav.map(g=><SidebarMenuItem key={g.id}><SidebarMenuButton className="nav-link" isActive={group.id===g.id} onClick={()=>go(g.id)}><g.icon size={19}/><span>{g.label}</span>{group.id===g.id&&<span className="nav-dot"/>}</SidebarMenuButton></SidebarMenuItem>)}</SidebarMenu><div className="sidebar-note"><span>岗位能力墙</span><p>看清现状<br/>明确差距<br/>落实成长行动</p></div></SidebarContent><SidebarFooter className="sidebar-bottom"><button className="version" onClick={()=>setAbout(true)}><i className="live-dot"/>演示工作空间 <span>V3.0</span></button><div className="user-row"><span className="avatar">{viewRole.slice(0,1)}</span><div><b>{viewRole}视角</b><small>95598 客户服务中心</small></div><ShieldCheck size={17}/></div></SidebarFooter></Sidebar>
 <div className="app-shell"><header className="topbar"><div className="breadcrumb"><SidebarTrigger className="sidebar-toggle"/><span>95598 客户服务中心</span><ChevronRight size={14}/><b>{group.label}</b></div><div className="topbar-right"><span className="mock-badge">模拟数据</span><button className="help-button" aria-label="演示说明" onClick={()=>setAbout(true)}><Info size={18}/></button></div></header><main className="workspace"><div className="page-heading"><div><div className="eyebrow">95598 · 岗位能力体系</div><h1>{group.label}</h1><p>{descriptions[group.id]}</p></div><button className="button outline" onClick={()=>go(group.id==='wall'?'overview':'wall')}>{group.id==='wall'?'返回工作台':'查看岗位能力墙'}<ArrowUpRight size={15}/></button></div>
 <div className="v3-context-bar"><div><span>演示视角</span><Picker label="切换工作视角" value={viewRole} onChange={v=>{setViewRole(v as ViewRole);go('overview')}} options={(['管理者','班组长','员工','评价人员','体系管理员'] as ViewRole[]).map(v=>({value:v,label:v}))}/>{['员工','班组长','评价人员'].includes(viewRole)&&<Picker label="当前演示人员" value={viewerId} onChange={id=>{setViewerId(id);go('overview',{personId:id})}} options={base.people.map(p=>({value:p.id,label:`${p.name} · ${personAt(s,p.id).team}`}))}/>}</div><div><Field label="观察日期" type="date" min={s.versions[0].date} value={s.date} onChange={e=>mutate(st=>setReferenceDate(st,e.target.value))}/><Badge tone="gray">{currentVersion(s)}</Badge></div></div>
 {message&&<div className="notice-banner management-message" role="status"><span>{message}</span><button aria-label="关闭操作提示" onClick={()=>notify('')}><X size={17}/></button></div>}
 {group.pages.length>1&&<div className="v3-section-tabs"><Segments value={page} onChange={id=>go(id)} options={group.pages.map(([value,label])=>({value,label}))}/></div>}
 {context.recordId&&<div className="v3-record-context"><span>当前办理：{nameOf(s,personId)}{context.scenarioId?` · ${nameOf(s,context.scenarioId)}`:''}</span><small>{context.recordId}</small><button className="text-button" onClick={()=>go(page)}>清除事项定位</button></div>}
 {page==='overview'&&<WorkbenchView viewRole={viewRole} viewerId={viewerId} onOpen={go}/>}
 {page==='wall'&&<WallView roleId={roleId} setRoleId={setRoleId} onDetail={openDetail} onGrowth={openGrowth}/>}
 {page==='matrix'&&<OrganizationMatrix roleId={roleId} onRole={setRoleId} onOpen={go}/>}
 {page==='graph'&&<GraphView roleId={roleId} setRoleId={setRoleId} onDetail={openDetail} onNavigate={go} explorer/>}
 {page==='business'&&<BusinessView roleId={roleId} onDetail={openDetail}/>}
 {page==='handoff'&&<><div className="mg-toolbar"><Picker label="协同岗位范围" value={roleId} onChange={setRoleId} options={roles.map(r=>({value:r.id,label:r.name}))}/>{viewRole==='体系管理员'&&<button className="text-button" onClick={()=>go('handoff-admin')}>维护协同标准</button>}</div><HandoffView roleId={roleId}/></>}
 {page==='organization'&&<OrganizationView onDetail={openDetail}/>}
 {page==='governance'&&<GovernanceView key={sharedKey} initialTab={context.tab}/>}
 {page==='templates'&&<TemplateView/>}
 {page==='handoff-admin'&&<><HandoffView editable/><div className="mg-inset"><button className="button primary" onClick={()=>go('governance',{tab:'release'})}>查看影响并办理审核发布</button></div></>}
 {page==='authorization'&&<AuthorizationView key={sharedKey} personId={personId} onPerson={choosePerson} onNavigate={go} context={context} onOpen={go}/>}
 {page==='evaluation'&&<EvaluationView key={sharedKey} personId={personId} onPerson={choosePerson} onDetail={openDetail} context={context}/>}
 {page==='supply'&&<SupplyView key={sharedKey} onNavigate={go} onPerson={choosePerson} context={context} onOpen={go}/>}
 {page==='diagnosis'&&<DiagnosisView key={sharedKey} onNavigate={go} onDetail={openDetail} context={context}/>}
 {page==='talent'&&<TalentView key={sharedKey} onNavigate={go} onPerson={choosePerson} context={context} onOpen={go} viewRole={viewRole} viewerId={viewerId}/>}
 {page==='data'&&<DataView assetId={assetId} setAssetId={setAssetId} tab={dataTab} setTab={setDataTab} onDetail={openDetail}/>}
 <footer className="page-footer"><span>95598 岗位能力图谱 · 业务体系 × 岗位体系 × 数据体系</span><button onClick={()=>setAbout(true)}>{storageStatus}</button></footer></main></div>
 <DetailPanel stack={stack} onClose={()=>setStack([])} onBack={()=>setStack(s=>s.slice(0,-1))} onDetail={openDetail} onGrowth={openGrowth} onData={openData}/>
 <Dialog open={about} onOpenChange={setAbout}><DialogContent className="about-dialog"><DialogHeader><DialogTitle>岗位能力体系演示说明</DialogTitle><DialogDescription>业务有标准，能力有依据，成长有方向。</DialogDescription></DialogHeader><div className="about-content"><h3>业务、岗位与数据相连</h3><p>业务域、职责、场景和任务连接能力与行为标准。岗位能力墙是核心成果，评价、授权、保障和培养围绕能力墙展开。</p><h3>评价与办理</h3><p>缺少证据单独展示，不能计为能力零分；关键门槛逐项满足。训练、评价、授权、任职和正式星级分别记录，模拟操作不会自动升星。</p><h3>演示范围</h3><p>岗位目录及部分规则参考附件修订稿；全部人员、业务数值及细化能力要求为合成示例，不代表生效制度或真实评价。角色切换用于体验不同工作视角，不是真实权限认证。数据保存在当前浏览器；尚未接入真实业务系统或多人共享后台。附件参考版使用新的合成案例与独立保存空间。旧版记录原样保留，不自动换算为新标准结论。</p>{legacyAvailable&&<button className="button outline" onClick={exportLegacy}>导出旧版演示记录（原样归档）</button>}<h3>本次基础数据依据</h3><p>岗位职级办法修订稿（2025.11.10）、新型知识库选型建设技术方案（0814）及用户提供的岗位能力墙图片。原文冲突列于“岗位与业务标准”的附件说明中。登记职级与五档能力对标要求分别呈现。</p><h3>方案依据</h3><p>参考岗位能力图谱建设方案最终版、领导汇报优化版及副本，岗位能力墙汇报版和 V2.8 文件。协同模板及期限用于演示，须按正式业务要求审核。</p></div></DialogContent></Dialog></SidebarProvider>;
}
