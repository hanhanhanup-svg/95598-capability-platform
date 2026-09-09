import {capById,roleById,statusLabel,targetsFor,type Person,type EvidenceStatus} from './model';

export type CapabilityPlanRow={
 capabilityId:string;name:string;family:string;roleId:string;targetStars:number;
 currentLevel:number|null;targetLevel:number;difference:number|null;achieved:boolean;
 currentText:string;targetText:string;gapText:string;statusText:string;statusTone:string;
 evidenceStatus:EvidenceStatus;evidenceText:string;targetBehavior:string;nextAction:string;
 required:boolean;standardVersion:string;
};

// Legacy callers may use the stored personal target. The live view passes the
// active assignment's target explicitly, including null when it is not set.
export function personCapabilityPlan(person:Person,targetStars:number|null=person.targetStars,activeFamily:string|null=null):CapabilityPlanRow[]{
 if(targetStars===null||!Number.isInteger(targetStars)||targetStars<1||targetStars>5)return [];
 return targetsFor(person.roleId,targetStars).flatMap(target=>{
  const capability=capById(target.capabilityId);
  if(!capability||(activeFamily!==null&&capability.category!==activeFamily))return [];
  const record=person.capabilities[target.capabilityId];
  const evidenceStatus=record?.evidenceStatus??'missing';
  const known=evidenceStatus==='admissible'&&typeof record?.level==='number'&&Number.isInteger(record.level)&&record.level>=1&&record.level<=5;
  const currentLevel=known?record!.level!:null;
  const difference=currentLevel===null?null:Math.max(0,target.targetLevel-currentLevel);
  const achieved=difference===0;
  const targetBehavior=target.behavior?.trim()||capability.levels.find(level=>level.level===target.targetLevel)?.behavior?.trim()||'';
  const behavior=targetBehavior.replace(/[。；;\s]+$/,'');
  const gapText=achieved?'已达标':difference===null?'当前水平待确认':`还差 ${difference} 级`;
  const evidenceText=evidenceStatus==='admissible'&&!known?'等级待确认':statusLabel[evidenceStatus];
  const statusText=achieved?'达标':difference===null?'待确认':'未达标';
  const nextAction=achieved
   ?`在日常业务中保持运用${behavior?`：${behavior}`:''}，持续保留实操记录。`
   :difference!==null
    ?`开展情境练习${behavior?`，重点做到：${behavior}`:'，对照本岗位目标要求完善处理方法'}；完成后提交实操材料复核。`
    :`${evidenceStatus==='expired'?'更新已过期的实操依据':evidenceStatus==='review'?'先完成现有材料复核':evidenceStatus==='missing'?'补齐本岗位有效实操材料':'补充等级评价依据'}，确认当前水平${behavior?`；按目标要求核验：${behavior}`:''}。`;
  return [{capabilityId:target.capabilityId,name:capability.name,family:capability.category,roleId:person.roleId,targetStars,
   currentLevel,targetLevel:target.targetLevel,difference,achieved,currentText:currentLevel===null?'未确认':`L${currentLevel}`,
   targetText:`L${target.targetLevel}`,gapText,statusText,statusTone:achieved?'green':difference===null?'gray':'amber',
   evidenceStatus,evidenceText,targetBehavior,nextAction,required:target.required,standardVersion:target.standardVersion}];
 });
}

export function capabilityPlanExport(person:Person,rows=personCapabilityPlan(person),activeFamily:string|null=null){
 const visibleRows=activeFamily===null?rows:rows.filter(row=>row.family===activeFamily);
 return {
  filename:`${person.name}_${activeFamily?`${activeFamily}_`:''}能力差距与行动清单_模拟数据.csv`,
  headers:['人员','人员编号','岗位','成长目标星级','能力分类','能力','目标行为要求','当前等级','证据状态','目标等级','达标状态','差距','下一步工作','要求属性','标准版本','数据性质'],
  rows:visibleRows.map(row=>[person.name,person.id,roleById(row.roleId)?.name||row.roleId,row.targetStars,row.family,row.name,row.targetBehavior||'目标行为要求待维护',row.currentText,row.evidenceText,row.targetText,row.statusText,row.gapText,row.nextAction,row.required?'必选要求':'发展要求',row.standardVersion,'模拟数据'])
 };
}
