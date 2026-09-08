'use client';
import {createContext,useContext,useState,useEffect,useMemo,type ReactNode} from 'react';
import {syncLegacyModel,type State} from './management-model';
import {createWorkspaceState,decodeWorkspace} from './workflow-model';
import {loadFoundationSession,exportPreviousSessions,foundationStorageKey} from './foundation-storage';
const storageKey=foundationStorageKey;
type Context={state:State;mutate:(fn:(s:State)=>void)=>boolean;message:string;notify:(s:string)=>void;storageStatus:string;reset:()=>void;legacyAvailable:boolean;exportLegacy:()=>void};
const ManagementContext=createContext<Context|null>(null);
export function ManagementProvider({children}:{children:ReactNode}){
 const [state,setState]=useState(createWorkspaceState);const [ready,setReady]=useState(false);const [message,notify]=useState('');const [storageStatus,setStorageStatus]=useState('正在载入演示记录');const [legacyAvailable,setLegacyAvailable]=useState(false);
 useEffect(()=>{try{const session=loadFoundationSession(localStorage);if(session.saved)setState(decodeWorkspace(session.saved));setLegacyAvailable(session.hasPrevious);if(session.hasPrevious&&!session.saved)notify('已载入附件参考版的新合成案例。旧版演示记录原样保留，可在演示说明中导出；未将旧结论换算为新标准结果。');setReady(true)}catch{setStorageStatus('历史记录未能载入，原记录已保留；当前会话不自动保存');notify('历史演示记录读取失败，已保留原记录。当前展示初始案例，本次操作仅在当前会话使用。')}},[]);
 useEffect(()=>{if(!ready)return;try{localStorage.setItem(storageKey,JSON.stringify(state));setStorageStatus('演示操作保存于此浏览器')}catch{setStorageStatus('保存失败，本次操作仅在当前页面保留')}},[state,ready]);
 useMemo(()=>syncLegacyModel(state),[state]);
 const mutate=(fn:(s:State)=>void)=>{try{const next=structuredClone(state);fn(next);const latestDate=[...state.versions.map(v=>v.date),...state.assessments.filter(a=>a.status==='已生效').map(a=>a.effective)].sort().at(-1)!;if(state.date<latestDate&&next.date===state.date&&JSON.stringify(next)!==JSON.stringify(state))throw new Error(`当前为历史查看时点，请将演示日期切换至 ${latestDate} 或之后再办理`);setState(next);notify('操作已记录，关联视图已更新。');return true}catch(e){notify(e instanceof Error?e.message:'操作未完成，请检查输入。');return false}};
 const exportLegacy=()=>{try{const payload=exportPreviousSessions(localStorage);const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)],{type:'application/json'}));const link=document.createElement('a');link.href=url;link.download='95598_旧版演示记录_原样归档.json';link.click();setTimeout(()=>URL.revokeObjectURL(url),500)}catch{notify('旧版记录导出失败，原记录未修改。')}};
 return <ManagementContext.Provider value={{state,mutate,message,notify,storageStatus,legacyAvailable,exportLegacy,reset:()=>{setState(createWorkspaceState());notify('已恢复附件参考版初始合成案例，旧版归档保留。')}}}>{children}</ManagementContext.Provider>;
}
export function useManagement(){const c=useContext(ManagementContext);if(!c)throw new Error('ManagementProvider missing');return c;}
