'use client';
import {ArrowRight,Download} from 'lucide-react';
import {exportCsv,roleById,statusTone,type Person} from './model';
import type {DetailRef} from './graph-view';
import {Badge} from './ui-parts';
import {useManagement} from './management-context';
import {roleGrowthTarget} from './management-model';
import {personCapabilityPlan,capabilityPlanExport} from './person-capability-plan';

export function PersonCapabilityPlan({person,targetStars,activeFamily=null,onDetail}:{person:Person;targetStars?:number|null;activeFamily?:string|null;onDetail:(detail:DetailRef)=>void}){
 const {state}=useManagement();
 const goal=targetStars===undefined?roleGrowthTarget(state,person.id,person.roleId):targetStars;
 const rows=personCapabilityPlan(person,goal,activeFamily);
 const families=[...new Set(rows.map(row=>row.family))];
 const download=()=>{const file=capabilityPlanExport(person,rows,activeFamily);exportCsv(file.filename,file.headers,file.rows)};
 return <section className="person-capability-plan capability-plan-aligned" aria-label="能力差距与下一步工作">
  <div className="detail-section-heading capability-plan-heading">
   <div><h3>能力差距与下一步工作</h3><p className="capability-plan-context">{roleById(person.roleId)?.name||'当前主岗'} · {goal===null?'成长目标待确认':`${goal} 星成长目标`}</p></div>
   <button className="button outline" onClick={download} disabled={!rows.length}><Download size={15}/>下载能力清单</button>
  </div>
  {!!rows.length&&<div className="capability-plan-summary"><span>{activeFamily||'全部分类'} · {rows.length} 项目标要求</span><small>{activeFamily?'与上方所选雷达分类一致':'按目标要求的分类展开'}</small></div>}
  {!rows.length?<div className="capability-plan-empty">{goal===null?'当前主岗尚未设置成长目标，确认目标后展示对应的能力要求。':activeFamily?'该分类在当前岗位和成长目标下暂无能力要求。':'当前岗位在此成长目标下暂无能力要求。'}</div>:families.map(family=>{
   const familyRows=rows.filter(row=>row.family===family);
   return <section className="capability-plan-family" key={family} aria-label={`${family}目标要求`}>
    <div className="capability-plan-family-heading"><h4>{family}</h4><span>{familyRows.length} 项 · {goal} 星目标</span></div>
    <div className="capability-plan-items">{familyRows.map(row=><article className="capability-plan-item" key={row.capabilityId}>
     <div className="capability-plan-item-heading"><button className="text-button capability-plan-name" onClick={()=>onDetail({type:'capability',id:row.capabilityId,level:row.targetLevel,roleId:row.roleId,star:row.targetStars})}>{row.name}<ArrowRight size={14}/></button><Badge tone={row.required?'amber':'gray'}>{row.required?'必选要求':'发展要求'} · {row.targetText}</Badge></div>
     <div className="capability-plan-target"><span>目标 {row.targetText} 要求</span><p>{row.targetBehavior||'目标行为要求待维护'}</p></div>
     <div className="capability-plan-work">
      <div className="capability-plan-gap">
       <div className="capability-plan-levels"><span><small>当前可采信等级</small><b>{row.currentText}</b></span><ArrowRight size={14} aria-hidden="true"/><span><small>目标等级</small><b>{row.targetText}</b></span></div>
       <div className="capability-plan-status"><Badge tone={row.statusTone}>{row.statusText}{row.difference!==null&&!row.achieved?` · ${row.gapText}`:''}</Badge><Badge tone={statusTone[row.evidenceStatus]}>{row.evidenceText}</Badge></div>
       {row.difference===null&&<small className="capability-plan-pending">依据确认后再判断能力差距</small>}
      </div>
      <div className="capability-plan-next"><h5>下一步工作</h5><p className="capability-plan-action">{row.nextAction}</p></div>
     </div>
    </article>)}</div>
   </section>;
  })}
 </section>;
}
