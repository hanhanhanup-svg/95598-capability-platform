'use client';
import type {ReactNode,InputHTMLAttributes} from 'react';
import {Input} from '@/components/ui/input';
import {Textarea} from '@/components/ui/textarea';
import {Dialog,DialogContent,DialogHeader,DialogTitle,DialogDescription} from '@/components/ui/dialog';
export function Field({label,...props}:InputHTMLAttributes<HTMLInputElement>&{label:string}){return <label className="mg-field"><span>{label}</span><Input {...props} aria-label={label}/></label>}
export function TextField({label,value,onChange}:{label:string;value:string;onChange:(v:string)=>void}){return <label className="mg-field"><span>{label}</span><Textarea value={value} onChange={e=>onChange(e.target.value)} aria-label={label}/></label>}
export function Modal({open,onClose,title,sub,children}:{open:boolean;onClose:()=>void;title:string;sub:string;children:ReactNode}){return <Dialog open={open} onOpenChange={v=>{if(!v)onClose()}}><DialogContent className="mg-modal"><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{sub}</DialogDescription></DialogHeader><div className="mg-modal-body">{children}</div></DialogContent></Dialog>}
export function KPI({items}:{items:{label:string;value:string|number;note:string;onClick?:()=>void}[]}){return <div className="mg-kpis">{items.map((x,i)=><button key={x.label} className={`mg-kpi accent-${i}`} onClick={x.onClick} disabled={!x.onClick}><span>{x.label}</span><strong>{x.value}</strong><small>{x.note}</small></button>)}</div>}
export function Actions({children}:{children:ReactNode}){return <div className="mg-actions">{children}</div>}
