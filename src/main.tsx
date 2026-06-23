/**
 * main.tsx — 应用入口
 *
 * 职责：挂载 React 应用到 DOM，启用 React.StrictMode 以在开发环境中
 * 检测潜在问题（副作用重复调用、已弃用 API 等）。
 *
 * 导出：无（副作用模块，仅执行 render）
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
