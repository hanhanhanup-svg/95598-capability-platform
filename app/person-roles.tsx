'use client';
import {useManagement} from './management-context';
import {activeAssignments,nameOf,roleGrowthTarget,type State} from './management-model';
import {rankLabel} from './foundation';
import {Badge} from './ui-parts';

export function personRoleRows(s:State,personId:string){
 const order={'主岗':0,'兼岗':1,'支援':2};
 return activeAssignments(s).filter(a=>a.personId===personId).map(a=>{
  const position=s.positions.find(p=>p.id===a.positionId)!;
  return {...a,roleId:position.roleId,roleName:nameOf(s,position.roleId),team:nameOf(s,position.orgId),rank:rankLabel(personId,position.roleId),growthTarget:roleGrowthTarget(s,personId,position.roleId)};
 }).sort((a,b)=>order[a.type]-order[b.type]);
}
export function PersonRoles({personId}:{personId:string}){
 const {state:s}=useManagement();const rows=personRoleRows(s,personId);
 const roleCount=new Set(rows.map(r=>r.roleId)).size;
 return <section className="person-roles" aria-label="当前任职岗位"><div className="person-roles-heading"><h3>当前任职</h3><span>{roleCount} 个岗位{roleCount>1?' · 一人多岗':''}</span></div><div className="person-role-list">{rows.map(r=><div className="person-role-item" key={r.id}><Badge tone={r.type==='主岗'?'green':'blue'}>{r.type}</Badge><div><b>{r.roleName}</b><small>{r.team}{r.end?` · 至 ${r.end}`:''}</small><small>{r.growthTarget?`成长目标：${r.growthTarget} 星能力要求`:'本岗成长目标待确认'}</small></div><span className="person-role-rank">{r.rank}<small>本岗登记（模拟）</small></span></div>)}</div></section>;
}
export function MultiRoleHint({personId,roleId}:{personId:string;roleId:string}){
 const {state:s}=useManagement();const rows=personRoleRows(s,personId);const count=new Set(rows.map(r=>r.roleId)).size;
 if(count<2)return null;const current=rows.find(r=>r.roleId===roleId);
 return <span className="person-multirole-hint">{current?.type||'在岗'} · 共 {count} 岗</span>;
}
