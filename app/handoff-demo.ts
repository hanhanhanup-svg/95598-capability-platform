import {checkHandoffs,type Catalog,type Handoff} from './management-model';

// Display-only examples; loading them never changes standards or saved records.
const samples:Handoff[]=[
 {id:'DEMO-HANDOFF-01',scenarioId:'SCN-01',taskId:'TASK-03',leadRoleId:'ROLE-01',supportRoleIds:['ROLE-05'],reviewRoleId:'ROLE-04',escalateRoleId:'ROLE-06',materials:'咨询摘要、账单核对结果、所引知识版本、未解决问题清单',acceptance:'咨询事项可定位，知识差异已标注，反馈责任人与处理安排已确认',deadlineHours:8,escalation:'知识解释与账单依据冲突，或到期未确认反馈责任人时，提交班长协调',owner:'热线服务专业（模拟）'},
 {id:'DEMO-HANDOFF-02',scenarioId:'SCN-02',taskId:'TASK-06',leadRoleId:'ROLE-01',supportRoleIds:['ROLE-03'],reviewRoleId:'ROLE-04',escalateRoleId:'ROLE-06',materials:'业务申请编号、进度查询记录、已告知事项、异常原因与客户诉求',acceptance:'办理节点与查询时间清楚，后续反馈责任人和反馈时间已确认',deadlineHours:4,escalation:'进度记录矛盾、重复反馈未解决或客户诉求升级时，提交班长协调',owner:'热线服务专业（模拟）'},
 {id:'DEMO-HANDOFF-03',scenarioId:'SCN-03',taskId:'TASK-09',leadRoleId:'ROLE-02',supportRoleIds:['ROLE-01'],reviewRoleId:'ROLE-04',escalateRoleId:'ROLE-06',materials:'报修工单、故障位置、影响范围、安全提示记录、专业接收回执',acceptance:'接收回执可核验，反馈联系人和时间已记录，客户解释口径一致',deadlineHours:1,escalation:'专业未确认接收、反馈超时或出现新增安全风险时，立即提交班长协调',owner:'报修服务专业（模拟）'},
 {id:'DEMO-HANDOFF-04',scenarioId:'SCN-04',taskId:'TASK-12',leadRoleId:'ROLE-02',supportRoleIds:['ROLE-05'],reviewRoleId:'ROLE-04',escalateRoleId:'ROLE-06',materials:'异常现象汇总、交叉核对结果、风险提示、专业处置进展与解释口径',acceptance:'已核实事实与待确认事项分开记录，处置进展有来源，客户告知留痕',deadlineHours:2,escalation:'故障范围信息不一致、专业反馈冲突或原解释口径不再适用时，提交班长协调',owner:'报修服务专业（模拟）'},
 {id:'DEMO-HANDOFF-05',scenarioId:'SCN-05',taskId:'TASK-15',leadRoleId:'ROLE-03',supportRoleIds:['ROLE-02'],reviewRoleId:'ROLE-04',escalateRoleId:'ROLE-06',materials:'投诉事实摘要、核心诉求、专业核查结论、承诺事项与历史沟通记录',acceptance:'专业结论有依据，未解决事项与责任人明确，回访及后续安排已留痕',deadlineHours:2,escalation:'结论冲突、承诺未兑现或到期仍无明确结论时，提交班长协调',owner:'诉求处置专业（模拟）'},
 {id:'DEMO-HANDOFF-06',scenarioId:'SCN-06',taskId:'TASK-18',leadRoleId:'ROLE-04',supportRoleIds:['ROLE-01'],reviewRoleId:'ROLE-06',escalateRoleId:'ROLE-06',materials:'质检问题记录、适用标准版本、整改说明、复测样本与辅导反馈',acceptance:'整改前后证据可对应，复核结论有依据，未闭环事项已有辅导安排',deadlineHours:24,escalation:'复测证据不足、同类问题反复出现或改进结论存在争议时，提交班长复核协调',owner:'服务质量专业（模拟）'},
 {id:'DEMO-HANDOFF-07',scenarioId:'SCN-07',taskId:'TASK-21',leadRoleId:'ROLE-05',supportRoleIds:['ROLE-01'],reviewRoleId:'ROLE-04',escalateRoleId:'ROLE-06',materials:'知识审核记录、版本差异清单、渠道同步回执、检索验证与使用反馈',acceptance:'版本与适用日期明确，各渠道可核对，检索验证通过或差异已登记',deadlineHours:8,escalation:'渠道版本不一致、发布与审核内容不符或差异影响客户解释时，提交班长协调',owner:'知识运营专业（模拟）'},
 {id:'DEMO-HANDOFF-08',scenarioId:'SCN-08',taskId:'TASK-24',leadRoleId:'ROLE-06',supportRoleIds:['ROLE-05'],reviewRoleId:'ROLE-04',escalateRoleId:'ROLE-04',materials:'辅导任务单、对应能力要求、训练记录、实操复测样本与员工反馈',acceptance:'目标与验证方式对应，知识材料适用，质检员独立确认复测依据',deadlineHours:24,escalation:'辅导复测结论与质检证据冲突时，转交质检员独立复核并记录结论',owner:'班组运营专业（模拟）'}
];

export function handoffDisplay(catalog:Catalog,roleId?:string){
 const synthetic=!catalog.handoffs?.length;
 const source=synthetic?samples.filter(h=>checkHandoffs({...catalog,handoffs:[h]}).length===0):catalog.handoffs!;
 return {synthetic,records:source.filter(h=>!roleId||[h.leadRoleId,...h.supportRoleIds,h.reviewRoleId,h.escalateRoleId].includes(roleId))};
}
