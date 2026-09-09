'use client';

import {useId,useMemo,useRef,useState} from 'react';
import {Search,Check,ChevronLeft,ChevronRight,Users,X} from 'lucide-react';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription,DialogTrigger} from '@/components/ui/dialog';
import {useManagement} from './management-context';
import {activeAssignments,base,type State} from './management-model';

export const PERSON_SEARCH_PAGE_SIZE=12;
export type PersonSearchAssignment={roleId:string;roleName:string;teamId:string;teamName:string;type:string};
export type PersonSearchRecord={id:string;name:string;assignments:PersonSearchAssignment[]};
export type PersonSearchFilters={query?:string;roleId?:string;teamId?:string;page?:number};
export type PersonSearchResult={items:PersonSearchRecord[];total:number;page:number;pageCount:number;start:number;end:number};

/** Build a read-only directory from effective assignments at the selected observation date. */
export function buildPersonSearchRecords(state:State,people:ReadonlyArray<{id:string;name:string}>=base.people):PersonSearchRecord[]{
 const positions=new Map(state.positions.map(position=>[position.id,position]));
 const names=new Map(state.catalog.nodes.filter(node=>node.kind==='role').map(node=>[node.id,node.name]));
 const teams=new Map(state.orgs.map(org=>[org.id,org.name]));
 const byPerson=new Map<string,PersonSearchAssignment[]>();
 for(const assignment of activeAssignments(state)){
  const position=positions.get(assignment.positionId);
  if(!position)continue;
  const item={roleId:position.roleId,roleName:names.get(position.roleId)||position.roleId,teamId:position.orgId,teamName:teams.get(position.orgId)||position.orgId,type:assignment.type};
  const rows=byPerson.get(assignment.personId)||[];
  if(!rows.some(row=>row.roleId===item.roleId&&row.teamId===item.teamId&&row.type===item.type))rows.push(item);
  byPerson.set(assignment.personId,rows);
 }
 const order:Record<string,number>={'主岗':0,'兼岗':1,'支援':2};
 return people.map(person=>({id:person.id,name:person.name,assignments:[...(byPerson.get(person.id)||[])].sort((a,b)=>(order[a.type]??3)-(order[b.type]??3))}));
}

const normalized=(value:string)=>value.normalize('NFKC').trim().toLocaleLowerCase();

/** Browser-side filtering, with a fixed upper bound of 12 rendered people per page. */
export function searchPersonRecords(records:ReadonlyArray<PersonSearchRecord>,{query='',roleId='',teamId='',page=1}:PersonSearchFilters={}):PersonSearchResult{
 const tokens=normalized(query).split(/\s+/).filter(Boolean);
 const matched=records.filter(person=>{
  if(tokens.length&&!tokens.every(token=>normalized(`${person.name} ${person.id}`).includes(token)))return false;
  return !roleId&&!teamId||person.assignments.some(assignment=>(!roleId||assignment.roleId===roleId)&&(!teamId||assignment.teamId===teamId));
 });
 const total=matched.length;
 const pageCount=Math.ceil(total/PERSON_SEARCH_PAGE_SIZE);
 const safePage=Math.max(1,Math.min(pageCount||1,Number.isFinite(page)?Math.floor(page):1));
 const offset=(safePage-1)*PERSON_SEARCH_PAGE_SIZE;
 return {items:matched.slice(offset,offset+PERSON_SEARCH_PAGE_SIZE),total,page:safePage,pageCount,start:total?offset+1:0,end:Math.min(offset+PERSON_SEARCH_PAGE_SIZE,total)};
}

export type PersonSearchPickerProps={value:string;onChange:(personId:string)=>void;label?:string};

export function PersonSearchPicker({value,onChange,label='选择人员'}:PersonSearchPickerProps){
 const {state}=useManagement();
 const [open,setOpen]=useState(false),[query,setQuery]=useState(''),[roleId,setRoleId]=useState(''),[teamId,setTeamId]=useState(''),[page,setPage]=useState(1);
 const inputRef=useRef<HTMLInputElement>(null);
 const resultRef=useRef<HTMLDivElement>(null);
 const id=useId();
 const records=useMemo(()=>buildPersonSearchRecords(state),[state]);
 const current=records.find(person=>person.id===value);
 const result=useMemo(()=>searchPersonRecords(records,{query,roleId,teamId,page}),[records,query,roleId,teamId,page]);
 const filterOptions=useMemo(()=>{
  const roles=new Map<string,string>(),teams=new Map<string,string>();
  for(const person of records)for(const assignment of person.assignments){roles.set(assignment.roleId,assignment.roleName);teams.set(assignment.teamId,assignment.teamName)}
  return {roles:[...roles].sort((a,b)=>a[1].localeCompare(b[1],'zh-CN')),teams:[...teams].sort((a,b)=>a[1].localeCompare(b[1],'zh-CN'))};
 },[records]);
 const reset=()=>{setQuery('');setRoleId('');setTeamId('');setPage(1)};
 const setDialogOpen=(next:boolean)=>{if(next)reset();setOpen(next)};
 const select=(personId:string)=>{onChange(personId);setOpen(false)};
 const changePage=(next:number)=>{setPage(next);resultRef.current?.scrollTo({top:0})};
 const currentLabel=current?`${current.name} · ${current.id}`:value?`未找到人员 · ${value}`:'尚未选择人员';
 return <Dialog open={open} onOpenChange={setDialogOpen}>
  <DialogTrigger render={<button type="button" className="psp-trigger" aria-label={label} title={`${label}：${currentLabel}`} aria-haspopup="dialog" aria-expanded={open}><span>{current?.name|| (value?'待核对人员':'选择人员')}</span><Search size={15} aria-hidden="true"/></button>}/>
  <DialogContent className="psp-dialog" initialFocus={inputRef} showCloseButton={false}>
   <DialogHeader className="psp-header"><DialogTitle>{label}</DialogTitle><DialogDescription>按姓名或编号查找，可结合岗位、班组缩小范围。</DialogDescription><button type="button" className="psp-close" aria-label="取消人员选择" onClick={()=>setOpen(false)}><X size={18}/></button></DialogHeader>
   <div className="psp-filters">
    <label className="psp-search" htmlFor={`${id}-query`}><Search size={17} aria-hidden="true"/><input id={`${id}-query`} ref={inputRef} type="search" value={query} onChange={event=>{setQuery(event.target.value);setPage(1)}} placeholder="输入姓名或人员编号" aria-label="搜索姓名或人员编号" autoComplete="off"/>{query&&<button type="button" onClick={()=>{setQuery('');setPage(1);inputRef.current?.focus()}} aria-label="清空人员搜索"><X size={14}/></button>}</label>
    <div className="psp-filter-row"><label htmlFor={`${id}-role`}><span>岗位</span><select id={`${id}-role`} value={roleId} onChange={event=>{setRoleId(event.target.value);setPage(1)}}><option value="">全部岗位</option>{filterOptions.roles.map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label><label htmlFor={`${id}-team`}><span>班组</span><select id={`${id}-team`} value={teamId} onChange={event=>{setTeamId(event.target.value);setPage(1)}}><option value="">全部班组</option>{filterOptions.teams.map(([key,name])=><option key={key} value={key}>{name}</option>)}</select></label>{(query||roleId||teamId)&&<button type="button" className="psp-reset" onClick={reset}>重置筛选</button>}</div>
   </div>
   <div className="psp-current"><Check size={14} aria-hidden="true"/><span>当前选择</span><b>{currentLabel}</b></div>
   <div className="psp-result-heading" role="status" aria-live="polite"><span>找到 <b>{result.total}</b> 人</span><small>{result.total?`显示 ${result.start}–${result.end} 人`:'可调整搜索内容或筛选条件'}</small></div>
   <div className="psp-results" ref={resultRef}>
    {result.items.length?<ul className="psp-person-list" aria-label="人员搜索结果">{result.items.map(person=><li key={person.id}><button type="button" className={`psp-person${person.id===value?' is-current':''}`} onClick={()=>select(person.id)} aria-pressed={person.id===value} aria-label={`选择${person.name}，编号${person.id}${person.assignments.length?'，'+person.assignments.map(assignment=>`${assignment.teamName} ${assignment.roleName} ${assignment.type}`).join('；'):'，暂无有效任职'}`}><span className="psp-avatar" aria-hidden="true">{person.name.slice(-1)}</span><span className="psp-person-content"><span className="psp-person-name"><strong>{person.name}</strong><code>{person.id}</code></span><span className="psp-assignments">{person.assignments.length?person.assignments.map((assignment,index)=><span key={`${assignment.roleId}:${assignment.teamId}:${assignment.type}:${index}`}><span>{assignment.teamName}</span><i aria-hidden="true">·</i><span>{assignment.roleName}</span>{(person.assignments.length>1||assignment.type!=='主岗')&&<em>{assignment.type}</em>}</span>):<span className="psp-no-assignment">当前观察日期暂无有效任职</span>}</span></span><span className="psp-selection-mark">{person.id===value?<><Check size={16}/><span>已选</span></>:<span>选择</span>}</span></button></li>)}</ul>:<div className="psp-empty"><Users size={28} aria-hidden="true"/><strong>没有符合条件的人员</strong><p>试试其他姓名或编号，或减少岗位、班组筛选。</p><button type="button" className="psp-reset" onClick={reset}>清除筛选</button></div>}
   </div>
   <div className="psp-pagination"><span>每页 {PERSON_SEARCH_PAGE_SIZE} 人</span><div><button type="button" aria-label="上一页人员" disabled={result.page<=1} onClick={()=>changePage(result.page-1)}><ChevronLeft size={15}/></button><span>{result.pageCount?`${result.page} / ${result.pageCount}`:'0 / 0'}</span><button type="button" aria-label="下一页人员" disabled={!result.pageCount||result.page>=result.pageCount} onClick={()=>changePage(result.page+1)}><ChevronRight size={15}/></button></div></div>
   <div className="psp-footer"><p>当前演示名单 · 按 {state.date} 的有效任职筛选</p><button type="button" onClick={()=>setOpen(false)}>取消</button></div>
  </DialogContent>
 </Dialog>;
}
