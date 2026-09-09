import {base,currentVersion,evidenceCheck,type Assessment,type Fact,type State} from './management-model';

export type AssessmentSummary={
  check:ReturnType<typeof evidenceCheck>;
  facts:Fact[];
  targetBehavior:string;
  observedBehavior:string;
  reviewer:string;
  stage:0|1|2;
  canSubmit:boolean;
  canApprove:boolean;
};

/** Keep the short evaluation view aligned with the lifecycle and frozen review basis. */
export function assessmentSummary(s:State,a:Assessment):AssessmentSummary{
  const effective=a.status==='已生效';
  const submitted=a.status==='待复核';
  const editable=a.status==='草稿'||a.status==='已退回';
  const version=s.versions.find(v=>v.id===a.version);
  const minSamples=(effective?version?.policies:s.policies)?.find(p=>p.scenarioId===a.scenarioId)?.minSamples||2;
  const scope=(f:Fact)=>f.personId===a.personId&&f.capabilityId===a.capabilityId&&f.scenarioId===a.scenarioId;
  const facts=effective
    ?(a.evidenceSnapshot??s.facts.filter(f=>a.factIds.includes(f.id))).filter(scope)
    :s.facts.filter(f=>scope(f)&&(!submitted||a.factIds.includes(f.id)));
  const historicalState=effective?{...s,date:a.effective||a.created,facts}:s;
  const check=evidenceCheck(historicalState,a.personId,a.capabilityId,a.scenarioId,minSamples,submitted?a.factIds:undefined);
  const catalog=(effective||submitted)&&version?version.catalog:s.catalog;
  const standard=(effective||submitted)&&a.standardSnapshot
    ?a.standardSnapshot
    :catalog.nodes.filter(n=>catalog.edges.some(e=>e.type==='capabilityBehavior'&&e.from===a.capabilityId&&e.to===n.id));
  const roleEdge=a.targetRoleId&&a.targetStar?catalog.edges.find(e=>e.type==='roleCapability'&&e.from===a.targetRoleId&&e.to===a.capabilityId):undefined;
  const roleBehavior=roleEdge&&a.targetStar
    ?roleEdge.behaviors?.[a.targetStar-1]??base.capabilityTargets.find(t=>t.roleId===a.targetRoleId&&t.capabilityId===a.capabilityId&&t.star===a.targetStar)?.behavior
    :undefined;
  const policies=(effective||submitted)&&version?version.policies:s.policies;
  const policyBehavior=policies.find(p=>p.scenarioId===a.scenarioId)?.requirements.find(r=>r.capabilityId===a.capabilityId&&r.level===a.targetLevel)?.behavior;
  const targetBehavior=((effective||submitted)?a.roleBehaviorSnapshot:undefined)||roleBehavior||policyBehavior||standard.find(n=>n.level===a.targetLevel)?.description||'该等级行为要求待补充';
  const observedLevel=effective||submitted?a.resultLevel:check.level;
  const observedBehavior=observedLevel===null?'':standard.find(n=>n.level===observedLevel)?.description||'';
  const reviewer=a.submitter==='专业复核员（模拟）'?'质量复核员（模拟）':'专业复核员（模拟）';
  return {check,facts,targetBehavior,observedBehavior,reviewer,stage:effective?2:submitted?1:0,canSubmit:editable&&check.ok&&check.level!==null,canApprove:submitted&&a.version===currentVersion(s)&&check.ok&&check.level!==null&&check.level===a.resultLevel};
}
