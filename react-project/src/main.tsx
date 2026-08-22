import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './ui/App.tsx';
import { ErrorBoundary } from './ui/ErrorBoundary.tsx';
import './index.css';
try{ const _sky=localStorage.getItem('modu_sky')||'auto'; const h=new Date().getHours(); const t=_sky==='auto'?((h>=5&&h<10)?'morning':(h>=10&&h<17)?'day':(h>=17&&h<20)?'sunset':'night'):_sky; if(t==='day')document.body.classList.add('day'); else if(t==='night')document.body.classList.add('night'); else if(t==='morning')document.body.classList.add('morning'); }catch(e){}


const root = document.getElementById('root');
if (!root) {
  document.body.innerHTML = '<p style="padding:24px;font-family:system-ui">#root 요소를 찾지 못했습니다. index.html을 확인하세요.</p>';
} else {
  try {
    ReactDOM.createRoot(root).render(
      <React.StrictMode>
        <ErrorBoundary>
          <App />
        </ErrorBoundary>
      </React.StrictMode>,
    );
  } catch (e) {
    root.innerHTML = '<pre style="padding:24px;white-space:pre-wrap;font-family:system-ui">앱 시작에 실패했습니다:\n\n' + String((e as Error).stack || e) + '</pre>';
  }
}
