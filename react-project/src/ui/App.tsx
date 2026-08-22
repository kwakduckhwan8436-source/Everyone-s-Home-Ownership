import { useEffect, useState } from 'react';
import { useStore } from '../state/store.ts';
import { loadManifest, loadPolicy, isPolicyStale } from '../policy/loader.ts';
import { InputPanel } from './InputPanel.tsx';
import { Results } from './Results.tsx';

export default function App() {
  const policy = useStore(s => s.policy);
  const [skyMode, setSkyMode] = useState<'auto' | 'morning' | 'day' | 'sunset' | 'night'>(() => {
    try { return (localStorage.getItem('modu_sky') as 'auto' | 'morning' | 'day' | 'sunset' | 'night') || 'auto'; } catch (e) { return 'auto'; }
  });
  const applyTheme = (t: string) => { const b = document.body.classList; b.remove('day', 'night', 'morning'); if (t === 'day') b.add('day'); else if (t === 'night') b.add('night'); else if (t === 'morning') b.add('morning'); };
  const skyByHour = (h: number) => (h >= 5 && h < 10) ? 'morning' : (h >= 10 && h < 17) ? 'day' : (h >= 17 && h < 20) ? 'sunset' : 'night';
  useEffect(() => {
    try { localStorage.setItem('modu_sky', skyMode); } catch (e) { /* ignore */ }
    if (skyMode === 'auto') {
      const upd = () => applyTheme(skyByHour(new Date().getHours()));
      upd();
      const id = setInterval(upd, 300000);
      return () => clearInterval(id);
    }
    applyTheme(skyMode);
  }, [skyMode]);
  const cycleSky = () => {
    const order = ['auto', 'morning', 'day', 'sunset', 'night'] as const;
    setSkyMode(order[(order.indexOf(skyMode) + 1) % order.length]);
  };
  const SKY_EMOJI: Record<string, string> = { auto: '⏰', morning: '🌅', day: '☀️', sunset: '🌇', night: '🌙' };
  const SKY_KO: Record<string, string> = { auto: '자동(시간대)', morning: '아침', day: '낮', sunset: '노을', night: '밤' };
  const setPolicy = useStore(s => s.setPolicy);
  const [visitors, setVisitors] = useState<string>('');
  useEffect(() => {
    let total = 1, today = 1;
    try {
      total = (parseInt(localStorage.getItem('modu_visits') || '0', 10) || 0) + 1; localStorage.setItem('modu_visits', String(total));
      const d = new Date().toISOString().slice(0, 10);
      const last = localStorage.getItem('modu_visit_date');
      today = ((last === d) ? (parseInt(localStorage.getItem('modu_today') || '0', 10) || 0) : 0) + 1;
      localStorage.setItem('modu_visit_date', d); localStorage.setItem('modu_today', String(today));
    } catch { total = 1; today = 1; }
    setVisitors('👥 총 ' + total.toLocaleString() + ' · 오늘 ' + today.toLocaleString());
    (async () => {
      try {
        const proxy = (localStorage.getItem('modu_proxy') || '').replace(/\/$/, '');
        if (proxy) {
          const r = await fetch(proxy + '/stats', { method: 'POST' });
          if (r.ok) { const j = await r.json(); if (j && j.total != null) setVisitors('👥 총 ' + (+j.total).toLocaleString() + ' · 오늘 ' + (+j.today || 1).toLocaleString()); }
        }
      } catch { /* offline */ }
    })();
  }, []);
  const [versions, setVersions] = useState<string[]>(['2026-08']);
  const [ver, setVer] = useState('2026-08');

  useEffect(() => { loadManifest().then(m => { setVersions(m.versions); setVer(m.latest); }).catch(() => {}); }, []);
  useEffect(() => { loadPolicy(ver).then(setPolicy).catch(() => {}); }, [ver, setPolicy]);

  const stale = policy ? isPolicyStale(policy) : false;
  const days = policy ? Math.floor((Date.now() - Date.parse(policy.verifiedAt)) / 86400000) : 0;

  return <>
    <div className="bg-anim" aria-hidden="true"><div className="cloud c1" /><div className="cloud c2" /><div className="cloud c3" /><div className="tl t1" /><div className="tl t2" /><div className="tl t3" /><div className="tl t4" /><div className="tl t5" /><div className="tl t6" /><div className="train"><div className="tbody" /></div><div className="car cA"><div className="body" /><div className="w w1" /><div className="w w2" /><div className="hl" /></div><div className="car cB"><div className="body" /><div className="w w1" /><div className="w w2" /><div className="hl" /></div><div className="car cC"><div className="body" /><div className="w w1" /><div className="w w2" /><div className="hl" /></div><div className="walker wA"><div className="person"><div className="head" /><div className="torso" /><div className="leg l" /><div className="leg r" /></div></div><div className="walker wB"><div className="person"><div className="head" /><div className="torso" /><div className="leg l" /><div className="leg r" /></div></div><div className="walker wC"><div className="person"><div className="head" /><div className="torso" /><div className="leg l" /><div className="leg r" /></div></div><div className="walker wD"><div className="person"><div className="head" /><div className="torso" /><div className="leg l" /><div className="leg r" /></div></div><div className="walker wE"><div className="person"><div className="head" /><div className="torso" /><div className="leg l" /><div className="leg r" /></div></div></div>
    <header><div className="head-in">
      <div className="logo"><span className="mark"><svg viewBox="0 0 24 24" width="17" height="17" fill="none" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" strokeLinejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v9h14v-9"/><rect x="10" y="13" width="4" height="6"/></svg></span>모두의 내집마련</div>
      {visitors && <span className="visitors" aria-live="polite">{visitors}</span>}
      <button className="sky-btn" aria-label="배경 분위기 전환(자동/아침/낮/노을/밤)" title={`배경: ${SKY_KO[skyMode]} (눌러서 전환)`} onClick={cycleSky}>{SKY_EMOJI[skyMode]}</button>
      <div className="head-spacer" />
      {policy && <span className={`badge${stale ? ' stale' : ''}`}><span className="dot" /><span>{stale ? `정책 확인 필요 · 검증 후 ${days}일` : `정책 ${policy.version} · 검증 ${days}일 전`}</span></span>}
      <select className="vsel" value={ver} onChange={e => setVer(e.target.value)} title="정책 버전">{versions.map(v => <option key={v} value={v}>{v}</option>)}</select>
    </div></header>
      <nav className="linkbar" aria-label="관련 서비스 바로가기">
        <a href="https://cafe.naver.com/aiprogram1" target="_blank" rel="noopener noreferrer">🏛️ AI재테크연구소</a>
        <a href="https://ai-app-tech.onrender.com/" target="_blank" rel="noopener noreferrer">🗺️ 부의 로드맵</a>
        <a href="https://shared-research-monitor.onrender.com/" target="_blank" rel="noopener noreferrer">🔎 모두의 리서치</a>
        <a href="https://calculator-9zyb.onrender.com/" target="_blank" rel="noopener noreferrer">🧮 모두의 계산기</a>
        <a href="https://product-sourcing-1.onrender.com/" target="_blank" rel="noopener noreferrer">📦 소싱 작업대</a>
        <a href="https://ai-app-tech.onrender.com/portfolio.html" target="_blank" rel="noopener noreferrer">💼 월급 포트폴리오</a>
      </nav>

    <div className="app"><InputPanel /><Results /></div>
  </>;
}
