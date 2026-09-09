'use client';
import {useState} from 'react';
import {ChevronDown,Database,FileText,FolderOpen,Search} from 'lucide-react';
import {useManagement} from './management-context';
import {currentVersion} from './management-model';
import {Badge,SearchBox} from './ui-parts';
import {dataUsageCatalog,filterDataUsage,localDataSources} from './governance-data-usage';


export function GovernanceSourceReference({initialTab}:{initialTab?:string}={}){
 const {state:s,storageStatus}=useManagement();
 const [query,setQuery]=useState('');
 const catalog=dataUsageCatalog(s);
 const rows=filterDataUsage(catalog,query);
 const sources=localDataSources(s);
 return <section className="governance-data-usage">
  <div className="panel data-usage-intro">
   <span className="data-usage-intro-icon"><Database size={25}/></span>
   <div><h2>数据使用目录</h2><p>查看用了哪些数据、来自哪里，以及用在什么地方。</p></div>
   <Badge tone="blue">本地演示数据</Badge>
  </div>
  <div className="data-usage-status"><span className="data-usage-status-dot" aria-hidden="true"/><p>当前使用内置资料与本次演示记录。以下来源已列入目录，真实数据库尚未接入。</p></div>
  {initialTab==='release'&&<div className="data-usage-release-note"><FileText size={16}/><div>当前标准版本 <b>{currentVersion(s)}</b>{s.draft?`，已有修订记录（${s.draft.status}）已保留。`:'。'} 本页仅查看数据来源，标准与数据库维护由后续管理平台承担。</div></div>}
  <div className="panel data-usage-directory">
   <div className="data-usage-toolbar"><div><h3>业务数据来源</h3><span>{rows.length===catalog.length?`${catalog.length} 类数据`:`找到 ${rows.length} 类数据`}</span></div><SearchBox value={query} onChange={setQuery} placeholder="搜索数据、来源或用途"/></div>
   <div className="data-usage-list">{rows.length?rows.map(row=><details className="data-usage-card" key={row.id}>
    <summary>
     <span className="data-usage-row-icon"><Database size={20}/></span>
     <div className="data-usage-row-name"><h4>{row.name}</h4><span>{row.system}</span></div>
     <div className="data-usage-row-purpose"><p>{row.purpose}</p><div>{row.pages.map(page=><span key={page}>{page}</span>)}</div></div>
     <div className="data-usage-row-more"><span>{row.fields.length} 个字段</span><b>查看详情<ChevronDown size={15}/></b></div>
    </summary>
    <div className="data-usage-expanded">
     <div className="data-usage-reading"><b>当前实际使用</b><p>{row.currentReading}</p><span>{row.currentSummary}</span></div>
     <div className="data-usage-source-meta"><div><span>来源目录中的接口</span><b>{row.interfaceName}</b></div><div><span>来源目录中的表</span><code>{row.tableName}</code></div><div><span>责任专业</span><b>{row.owner}</b></div><div><span>接入情况</span><Badge tone="gray">{row.status}</Badge></div></div>
     <div className="data-usage-fields"><h5>目录中约定的字段</h5><p>这里列出接入参考字段，实际表结构由你们的数据平台维护。</p><div className="data-usage-field-grid">{row.fields.map(field=><div key={field.name}><b>{field.label}</b><code>{field.name}</code><span>{field.type}{field.required?' · 必填':''}</span></div>)}</div></div>
     {!!row.scenarios.length&&<div className="data-usage-related"><h5>当前样本关联的业务场景</h5><div>{row.scenarios.map(sc=><span key={sc.id}>{sc.name}</span>)}</div></div>}
     <details className="data-usage-technical"><summary>查看本地读取位置<ChevronDown size={13}/></summary><dl>{row.locations.map(location=><div key={location.source}><dt>{location.source}</dt><dd>{location.fields.join('、')}</dd></div>)}</dl>{!!row.capabilities.length&&<p>关联能力：{row.capabilities.map(cap=>cap.name).join('、')}</p>}</details>
    </div>
   </details>):<div className="data-usage-empty"><Search size={27}/><b>没有找到相关数据</b><span>可以搜索“任职”“工单”“知识”或字段名称。</span><button type="button" className="text-button" onClick={()=>setQuery('')}>清空搜索</button></div>}</div>
  </div>
  <details className="panel data-usage-local-sources"><summary><FolderOpen size={18}/><span>当前演示的数据存放位置</span><small>内置资料与浏览器记录</small><ChevronDown size={16}/></summary><div className="data-usage-local-grid">{sources.map(source=><article key={source.id}><h4>{source.name}</h4><p>{source.description}</p><span>{source.contents}</span><details><summary>文件与数据项</summary><code>{source.path}</code><p>{source.fields.join('、')}</p></details></article>)}</div><p className="data-usage-storage-status">{storageStatus}</p></details>
  <p className="data-usage-footer">后续由你们在数据治理平台和具体数据库中管理数据，本页保留数据来源与用途说明。</p>
 </section>;
}
