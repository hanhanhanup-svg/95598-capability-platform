'use client';
import {FileText} from 'lucide-react';
import {useManagement} from './management-context';
import {Badge} from './ui-parts';
import {LegacyGovernanceView} from './legacy-governance-view';
import {GovernanceOntologyView} from './governance-ontology-view';
export {LegacyGovernanceView};

export function GovernanceView({initialTab}:{initialTab?:string}={}){
 const {state:s}=useManagement();
 if(initialTab==='release'&&s.draft)return <section className="governance-data-usage"><div className="panel data-usage-intro"><span className="data-usage-intro-icon"><FileText size={25}/></span><div><h2>已有标准修订（演示）</h2><p>继续办理已创建的修订，完成后返回数据需求页面。</p></div><Badge tone="blue">{s.draft.status}</Badge></div><LegacyGovernanceView initialTab="release"/></section>;
 return <>{initialTab==='release'&&<div className="data-usage-release-note"><FileText size={16}/><span>当前没有待办理修订。以下展示岗位业务与数据对接需求。</span></div>}<GovernanceOntologyView/></>;
}
