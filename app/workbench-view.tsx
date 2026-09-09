'use client';
import {useState} from 'react';
import {TeamStructureView} from './team-structure';
import type {DetailRef} from './graph-view';
import {ListChecks,ArrowUpRight,CalendarDays,ShieldCheck,ClipboardCheck,Sprout,UserRound,Sun,Clock3} from 'lucide-react';
import {useManagement} from './management-context';
import {base,nameOf,personAt,supply,addAudit,type State} from './management-model';
import {visibleTodos,todos,developmentStatus,dayAfter,type ViewRole,type WorkContext,type Todo} from './workflow-model';
import {Picker,Segments,PanelTitle,DataTable,Badge,SearchBox,Note} from './ui-parts';
import {Modal,Field,Actions} from './management-ui';

export function WorkbenchView({viewRole,viewerId,onOpen,onDetail}:{viewRole:ViewRole;viewerId:string;onDetail:(detail:DetailRef)=>void;onOpen:(page:string,context?:WorkContext)=>void}){
 const {state:s,mutate}=useManagement();const [category,setCategory]=useState('all'),[query,setQuery]=useState(''),[limit,setLimit]=useState(12),[editing,setEditing]=useState<Todo|null>(null),[owner,setOwner]=useState(viewerId),[due,setDue]=useState('');
 const items=visibleTodos(s,viewRole,viewerId);const filtered=items.filter(t=>(category==='all'||category==='overdue'&&!!t.due&&t.due<s.date||category==='soon'&&!!t.due&&t.due>=s.date&&t.due<=dayAfter(s.date,3))&&`${t.title} ${t.category} ${t.ownerLabel}`.includes(query));
 const gap=['POL-SCN-03','POL-SCN-05'].filter(id=>s.policies.some(p=>p.id===id)).reduce((n,id)=>n+supply(s,id,'SLOT-1').gap,0);
 const cards=viewRole==='员工'?[{label:'我的待办',value:items.length,note:'本人训练、补证和被分派事项'},{label:'我的培养计划',value:s.development.filter(d=>d.personId===viewerId).length,note:'统一计划保留课程、实践与复测记录',onClick:()=>onOpen('talent',{personId:viewerId})},{label:'我的评价进度',value:s.assessments.filter(a=>a.personId===viewerId&&a.status!=='已生效').length,note:'查看取证、提交及复核进度',onClick:()=>onOpen('evaluation',{personId:viewerId})},{label:'本人能力画像',value:personAt(s,viewerId).name,note:'当前能力、有效证据与成长方向',onClick:()=>onOpen('wall',{personId:viewerId,roleId:personAt(s,viewerId).roleId})}]:[{label:'当前视角待办',value:items.length,note:'来源记录更新后，清单同步更新'},{label:'当班独立保障缺口',value:gap,note:'14:00—15:00 · 报修与投诉场景',onClick:()=>onOpen('supply')},{label:'待评价复核',value:s.assessments.filter(a=>a.status==='待复核').length,note:'与场景上岗授权分别确认',onClick:()=>onOpen('evaluation')},{label:'培养目标待确认',value:s.development.filter(d=>developmentStatus(s,d)==='条件满足，待确认').length,note:'能力和实践满足后由负责人确认',onClick:()=>onOpen('talent')}];

 const overdueCount=items.filter(t=>t.due&&t.due<s.date).length;
 const soonCount=items.filter(t=>t.due&&t.due>=s.date&&t.due<=dayAfter(s.date,3)).length;
 const dateLabel=new Intl.DateTimeFormat('zh-CN',{month:'long',day:'numeric',weekday:'long'}).format(new Date(s.date+'T00:00:00'));
 const cardIcons=viewRole==='员工'?[ListChecks,Sprout,ClipboardCheck,UserRound]:[ListChecks,ShieldCheck,ClipboardCheck,Sprout];
 return <><div className="workbench-dashboard workbench-welcoming">
  <section className="workbench-welcome" aria-labelledby="workbench-welcome-title">
   <div className="workbench-welcome-main">
    <div className="workbench-welcome-copy">
     <div className="workbench-eyebrow"><Sun size={15} aria-hidden="true"/><span>95598 客户服务中心</span><span className="workbench-view-label">{viewRole}视角</span></div>
     <h1 id="workbench-welcome-title">{viewRole==='员工'?personAt(s,viewerId).name+'，你好':'你好'}，今天的工作从这里开始</h1>
     <p>{items.length>0?<>有 <strong>{items.length}</strong> 项待办需要关注，按自己的节奏，有序推进每一项。</>:'当前视角暂无待办，可以从下方了解队伍与能力概况。'}</p>
    </div>
    <img className="workbench-welcome-art" src="/workbench-welcome.png" alt="" width="300" height="150"/>
   </div>
   <div className="workbench-welcome-footer">
    <div className="workbench-date"><CalendarDays size={14} aria-hidden="true"/><span>观察日期 · {dateLabel}</span></div>
    <div className="workbench-focus"><Clock3 size={14} aria-hidden="true"/><span>近期关注</span><b>{soonCount} 项三日内到期</b><span className={overdueCount?'workbench-overdue':''}>{overdueCount?overdueCount+' 项已逾期':'暂无逾期事项'}</span></div>
   </div>
  </section>
  <div className="workbench-section-label"><h2>工作概览</h2><span>当前视角 · 模拟数据</span></div>
  <div className="mg-kpis">{cards.map((card,i)=>{const Icon=cardIcons[i];return <button key={card.label} className={'mg-kpi accent-'+i} onClick={card.onClick} disabled={!card.onClick}><span className="workbench-kpi-label">{card.label}</span><span className="workbench-kpi-icon" aria-hidden="true"><Icon size={19}/></span><strong>{card.value}</strong><small>{card.note}</small>{card.onClick&&<ArrowUpRight className="workbench-kpi-arrow" size={14} aria-hidden="true"/>}</button>})}</div>
  <section className="panel workbench-todos"><PanelTitle title={viewRole==='员工'?'我的待办':viewRole==='班组长'?`${personAt(s,viewerId).team} · 待办清单`:'待办与提醒'} sub={`${viewRole}视角 · 未设置期限的历史事项单独标识`} icon={<ListChecks size={20}/>}><span className="workbench-panel-caption">逐项办理，有序推进</span></PanelTitle><div className="mg-toolbar"><Segments value={category} onChange={setCategory} options={[{value:'all',label:`全部 ${items.length}`},{value:'overdue',label:`已逾期 ${items.filter(t=>t.due&&t.due<s.date).length}`},{value:'soon',label:'三日内到期'}]}/><SearchBox value={query} onChange={setQuery} placeholder="搜索事项、责任人或阶段"/></div><DataTable headers={['待办事项','当前阶段 / 下一步','责任人或责任角色','办理期限','操作']} rows={filtered.slice(0,limit).map(t=>[<div><b>{t.title}</b>{t.context.scenarioId&&<small className="cell-note">{nameOf(s,t.context.scenarioId)}</small>}</div>,<div><Badge tone="blue">{t.category}</Badge><small className="cell-note">{t.step}</small></div>,t.ownerLabel,<div><Badge tone={!t.due?'gray':t.due<s.date?'amber':'green'}>{t.due||'未设置期限'}</Badge>{t.due&&t.due<s.date&&<small className="cell-note">已逾期</small>}</div>,<Actions><button className="button primary" onClick={()=>onOpen(t.page,t.context)}>办理<ArrowUpRight size={14}/></button>{viewRole!=='员工'&&<button className="text-button" onClick={()=>{setEditing(t);setOwner(t.ownerId||viewerId);setDue(t.due)}}>分派</button>}</Actions>])}/>{filtered.length>limit&&<div className="mg-inset"><button className="button outline" onClick={()=>setLimit(limit+12)}>再显示 12 项 · 共 {filtered.length} 项</button></div>}</section>
 <section className="panel workbench-team" aria-label="队伍结构"><PanelTitle title="队伍结构" sub="队伍规模、登记职级与岗位能力概况"/><TeamStructureView onDetail={onDetail}/></section></div>
 <Modal open={!!editing} onClose={()=>setEditing(null)} title="分派办理责任与期限" sub={editing?.title||''}><Picker label="待办责任人" value={owner} onChange={setOwner} options={base.people.map(p=>({value:p.id,label:p.name}))}/><Field label="办理截止日期" type="date" value={due} onChange={e=>setDue(e.target.value)}/><Actions><button className="button primary" onClick={()=>{if(mutate(st=>{if(!editing||!due||!base.people.some(p=>p.id===owner))throw new Error('请填写责任人与期限');st.workspace!.todoAssignments[editing.id]={ownerId:owner,due,stage:`${editing.category}|${editing.step}`};if(editing.id.startsWith('action:')){const a=st.actions.find(a=>a.id===editing.context.recordId)!;a.due=due;if(a.status!=='已完成')a.ownerId=owner}if(editing.id.startsWith('development:'))st.development.find(d=>d.id===editing.context.recordId)!.due=due;addAudit(st,'分派待办',`${editing.title} / ${nameOf(st,owner)} / ${due}`)}))setEditing(null)}}>保存分派</button></Actions><Note>阶段与完成状态来自原业务记录；责任分派不会代替评价复核或授权审批。</Note></Modal></>;
}
