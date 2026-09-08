// A new sample edition is not a migration or reassessment of saved people.
export const foundationStorageKey='sg95598-management-demo-ref-20260908';
const previousKeys=['sg95598-management-demo-v3','sg95598-management-demo-v2'];
type Reader={getItem:(key:string)=>string|null};
export function loadFoundationSession(storage:Reader){return {saved:storage.getItem(foundationStorageKey),hasPrevious:previousKeys.some(key=>storage.getItem(key)!==null)}}
export function exportPreviousSessions(storage:Reader){return {description:'旧版浏览器记录原样归档。此文件不导入附件参考版，不将旧能力结论解释为新标准结果。配套原始数据见源码包 reference/legacy-catalog-v3.json。',sessions:previousKeys.flatMap(key=>{const raw=storage.getItem(key);return raw===null?[]:[{storageKey:key,raw}]})}}
