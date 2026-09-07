import type { Metadata } from 'next';
import './globals.css';
import './platform.css';
export const metadata: Metadata = {title:'95598 岗位能力图谱',description:'贯通业务架构、岗位能力与数据治理的交互原型。全部数据均为模拟。'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="zh-CN"><body>{children}</body></html>}
import './extras.css';

import './management.css';
