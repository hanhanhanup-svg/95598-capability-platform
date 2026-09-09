'use client';
import {Users,ArrowUpRight} from 'lucide-react';
import {roles,people,roleMetrics} from './model';
import {DataTable,Note,Meter} from './ui-parts';
import {rankLabel,foundation} from './foundation';
import type {DetailRef} from './graph-view';

export function TeamStructureView({onDetail}:{onDetail:(d:DetailRef)=>void}){return <div className="team-view"><div className="team-top"><div className="team-summary"><Users size={27}/><span>模拟队伍总人数</span><b>{people.length}</b><p>{new Set(foundation.profiles.map(p=>p.jobId)).size} 个参考岗位 · {roles.length} 个履职样本 · {new Set(people.map(p=>p.team)).size} 个班组</p></div><div className="star-distribution"><h3>登记职级分布 <small>模拟登记，按制度分别统计</small></h3>{['无星','一星','二星','三星','四星','五星','六星','一级','二级','三级'].map(v=>{const count=people.filter(p=>rankLabel(p.id)===v).length;return <div className="distribution-row" key={v}><span>{v}</span><Meter value={count/people.length*100} label={`${v}登记人员占全部模拟人员比例`}/><b>{count} 人</b></div>})}</div></div><DataTable headers={['岗位','人员规模','已确认达标项占比 / 三星能力对标','证据覆盖率','存在能力差距','查看']} rows={roles.map(r=>{const m=roleMetrics(r.id);return [r.name,`${m.count} 人`,<Meter value={m.score}/>,`${m.coverage}%`,`${m.gaps} 人`,<button className="text-button" onClick={()=>onDetail({type:'role',id:r.id})}>岗位画像<ArrowUpRight size={14}/></button>]})}/><Note>中心人数按唯一人员统计；岗位人数包括有效兼岗与支援，不可相加作为中心总人数。已确认达标项占比采用统一三星要求；独立供给还需结合场景授权与时段安排。</Note></div>}
