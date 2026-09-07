'use client';
import type { ReactNode } from 'react';
import { ArrowRight, Search, Info, Star } from 'lucide-react';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Progress } from '@/components/ui/progress';

export function Picker({label,value,onChange,options}:{label:string;value:string;onChange:(v:string)=>void;options:{value:string;label:string}[]}){return <Select value={value} onValueChange={v=>{if(v!==null)onChange(String(v))}} items={options}><SelectTrigger className="picker" aria-label={label}><SelectValue/></SelectTrigger><SelectContent>{options.map(o=><SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent></Select>}
export function Segments({value,onChange,options}:{value:string;onChange:(v:string)=>void;options:{value:string;label:string;icon?:ReactNode}[]}){return <Tabs value={value} onValueChange={v=>onChange(String(v))}><TabsList className="segmented">{options.map(o=><TabsTrigger key={o.value} value={o.value}>{o.icon}{o.label}</TabsTrigger>)}</TabsList></Tabs>}
export function SearchBox({value,onChange,placeholder}:{value:string;onChange:(v:string)=>void;placeholder:string}){return <label className="search-box"><Search size={16}/><input value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder} aria-label={placeholder}/></label>}
export function Badge({children,tone='green'}:{children:ReactNode;tone?:string}){return <span className={`badge ${tone}`}>{children}</span>}
export function Note({children}:{children:ReactNode}){return <div className="info-note"><Info size={16}/><div>{children}</div></div>}
export function Meter({value,label}:{value:number;label?:string}){return <div className="meter"><Progress value={value} aria-label={label||'达成进度'}/><b>{value.toFixed(1)}%</b></div>}
export function DataTable({headers,rows,empty='没有符合条件的数据'}:{headers:string[];rows:ReactNode[][];empty?:string}){return <Table className="data-table"><TableHeader><TableRow>{headers.map((h,i)=><TableHead key={h+i}>{h}</TableHead>)}</TableRow></TableHeader><TableBody>{rows.length?rows.map((r,i)=><TableRow key={i}>{r.map((c,j)=><TableCell key={j}>{c}</TableCell>)}</TableRow>):<TableRow><TableCell colSpan={headers.length}><div className="empty-state"><Search size={27}/><b>{empty}</b><span>尝试调整搜索内容或筛选条件</span></div></TableCell></TableRow>}</TableBody></Table>}
export function PanelTitle({title,sub,icon,children}:{title:string;sub?:string;icon?:ReactNode;children?:ReactNode}){return <div className="panel-heading"><div><h2>{icon}{title}</h2>{sub&&<span>{sub}</span>}</div>{children}</div>}
export function TextLink({children,onClick}:{children:ReactNode;onClick:()=>void}){return <button className="text-button" onClick={onClick}>{children}<ArrowRight size={14}/></button>}
export function Stars({value}:{value:number}){return <span className="stars" aria-label={`${value}星`}>{Array.from({length:5},(_,i)=><Star key={i} size={12} fill={i<value?'currentColor':'none'} className={i<value?'filled':'unfilled'}/>)}</span>}
export function TitleLine({title,sub,action}:{title:string;sub:string;action?:ReactNode}){return <div className="section-title"><div><h2>{title}</h2><p>{sub}</p></div>{action}</div>}
