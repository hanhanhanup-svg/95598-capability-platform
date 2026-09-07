'use client';
import {createContext,useContext,useState,useEffect,useMemo,type ReactNode} from 'react';
import {createInitialState,syncLegacyModel,type State} from './management-model';
const storageKey='sg95598-management-demo-v2';
type Context={state:State;mutate:(fn:(s:State)=>void)=>void;message:string;notify:(s:string)=>void;storageStatus:string;reset:()=>void};
const ManagementContext=createContext<Context|null>(null);
export function ManagementProvider({children}:{children:ReactNode}){
 const [state,setState]=useState(createInitialState);const [ready,setReady]=useState(false);const [message,notify]=useState('');const [storageStatus,setStorageStatus]=useState('正在载入演示记录');
 useEffect(()=>{try{const saved=localStorage.getItem(storageKey);if(saved){const parsed=JSON.parse(saved);if(parsed.schema===2&&Array.isArray(parsed.versions)&&Array.isArray(parsed.facts)&&parsed.catalog?.nodes)setState(parsed);else notify('演示数据格式已更新，已载入新的合成案例。')}setStorageStatus('演示操作保存于此浏览器')}catch{setStorageStatus('浏览器存储不可用，本次操作仅在当前页面保留')}setReady(true)},[]);
 useEffect(()=>{if(!ready)return;try{localStorage.setItem(storageKey,JSON.stringify(state));setStorageStatus('演示操作保存于此浏览器')}catch{setStorageStatus('保存失败，本次操作仅在当前页面保留')}},[state,ready]);
 useMemo(()=>syncLegacyModel(state),[state]);
 const mutate=(fn:(s:State)=>void)=>{try{const next=structuredClone(state);fn(next);const latestDate=[...state.versions.map(v=>v.date),...state.assessments.filter(a=>a.status==='已生效').map(a=>a.effective)].sort().at(-1)!;if(state.date<latestDate&&next.date===state.date&&JSON.stringify(next)!==JSON.stringify(state))throw new Error(`当前为历史查看时点，请将演示日期切换至 ${latestDate} 或之后再办理`);setState(next);notify('操作已记录，关联视图已更新。')}catch(e){notify(e instanceof Error?e.message:'操作未完成，请检查输入。')}};
 return <ManagementContext.Provider value={{state,mutate,message,notify,storageStatus,reset:()=>{setState(createInitialState());notify('已恢复初始合成案例。')}}}>{children}</ManagementContext.Provider>;
}
export function useManagement(){const c=useContext(ManagementContext);if(!c)throw new Error('ManagementProvider missing');return c;}
