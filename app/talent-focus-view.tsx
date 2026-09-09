'use client';
import {Target,BookOpen,ClipboardCheck,ArrowRight} from 'lucide-react';
import {Badge} from './ui-parts';
import {nameOf,type Development,type State} from './management-model';
import {talentFocus,type TalentFocusItem} from './talent-focus';

export function TalentFocus({state,plan,onConfigure}:{state:State;plan:Development;onConfigure:()=>void}){
  const focus=talentFocus(state,plan);
  const priorities=focus.items.filter(item=>item.state!=='met');
  const met=focus.items.filter(item=>item.state==='met');
  const card=(item:TalentFocusItem)=><article key={item.capabilityId} className={'talent-focus-card is-'+item.state}>
    <header><div><Badge tone={item.state==='evidence'?'gray':item.state==='met'?'green':'amber'}>{item.state==='evidence'?'先补证核验':item.state==='met'?'已符合目标':'需要提升'}</Badge><h3>{item.name}</h3></div><div className="talent-focus-level"><span><small>{item.state==='evidence'?'原记录':'当前'}</small><b>{item.currentLevel===null?'待核验':'L'+item.currentLevel}</b></span><ArrowRight size={17}/><span><small>目标</small><b>L{item.targetLevel}</b></span></div></header>
    {item.state==='evidence'&&<p className="talent-focus-evidence">{item.reason}。先补充或核验有效材料，再确认具体差距。</p>}
    <div className="talent-focus-behavior"><span>目标要做到</span><p>{item.targetBehavior}</p></div>
    <div className="talent-focus-work">
      <div><h4><BookOpen size={15}/>学什么、练什么</h4>{item.resources.length?<ul>{item.resources.map(resource=><li key={resource.id}><b>{resource.name}</b><small>{resource.type} · {resource.minutes} 分钟{resource.planned?resource.trained?' · 已完成训练':' · 已列入计划':' · 可选关联资源'}</small></li>)}</ul>:<p>当前尚未配置适用学习资源，由导师补充安排。</p>}{item.tasks.length>0&&<p className="talent-focus-practice"><strong>在场景中练习：</strong>{item.tasks.map(task=>task.name).join('；')}。</p>}</div>
      <div><h4><ClipboardCheck size={15}/>提交什么、怎样验证</h4>{item.tasks.some(task=>task.output)?<ul>{item.tasks.filter(task=>task.output).map(task=><li key={task.id}>{task.output}</li>)}</ul>:<p>按本计划实践要求提交案例产出和导师观察记录。</p>}<p className="talent-focus-verify">在 {focus.minSamples} 个独立业务事件中，对照本项目标 L{item.targetLevel} 行为核验，由评价人员复核。</p></div>
    </div>
  </article>;
  return <div className="talent-focus">
    <header className="talent-focus-heading"><div><span className="talent-focus-kicker"><Target size={15}/>本次培养重点</span><h2>{nameOf(state,plan.personId)}需要培养什么</h2><p>{focus.ready?focus.roleName+' · '+focus.scenarioName:'先明确目标，再安排对应学习和实践'}</p></div>{focus.ready&&<div className="talent-focus-count"><strong>{priorities.length}</strong><span>项需要跟进</span></div>}</header>
    {!focus.ready?<div className="talent-focus-empty"><b>{plan.targetConfirmed?'当前目标场景已停用或与岗位不匹配':'当前计划尚未具备完整目标'}</b><p>{plan.targetConfirmed?'已有过程记录保留，请建立适用的新培养计划。':'已有训练与实践记录保留。确认目标岗位、场景和导师后，展示对应培养内容。'}</p>{!plan.targetConfirmed&&<button className="button primary" onClick={onConfigure}>完善培养目标</button>}</div>:<>
      {priorities.length?<div className="talent-focus-cards">{priorities.map(card)}</div>:<div className="talent-focus-empty"><b>当前目标能力与证据已符合要求</b><p>继续完成本计划约定的训练、实践和培养确认。</p></div>}
      {focus.practice.length>0&&<section className="talent-focus-plan-practice"><div><h3>本计划共同实践</h3><p>导师：{focus.mentorName}</p></div><ul>{focus.practice.map((practice,index)=><li key={index}><span>{practice.done?'已确认':'待完成'}</span>{practice.name}</li>)}</ul></section>}
      <p className="talent-focus-note">关联资源用于学习和练习；结果按上方目标行为验证。完成训练后，在下方记录产出与导师观察。</p>
      {met.length>0&&<details className="talent-focus-met"><summary>已符合目标的 {met.length} 项能力</summary><div className="talent-focus-cards">{met.map(card)}</div></details>}
    </>}
  </div>;
}
