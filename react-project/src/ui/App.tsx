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
  // ===== 회원 전용 접속 게이트 =====
  const GATE_ENABLED = true;
  const [gated, setGated] = useState<boolean>(() => { if (!GATE_ENABLED) return false; try { const a = JSON.parse(localStorage.getItem('modu_access') || 'null'); return !(a && a.tier); } catch { return true; } });
  const [gProxy, setGProxy] = useState<string>(() => { try { return localStorage.getItem('modu_proxy') || ''; } catch { return ''; } });
  const [gCode, setGCode] = useState('');
  const [gMsg, setGMsg] = useState<{ t: string; c: string }>({ t: '', c: '' });
  useEffect(() => {
    try { const a = JSON.parse(localStorage.getItem('modu_access') || 'null'); const tier = (a && a.tier) ? a.tier : (GATE_ENABLED ? 'basic' : 'premium'); document.body.classList.remove('tier-basic', 'tier-premium'); document.body.classList.add(tier === 'premium' ? 'tier-premium' : 'tier-basic'); document.body.classList.toggle('gated', gated); } catch { /* noop */ }
  }, [gated]);
  const submitGate = async () => {
    const proxy = (gProxy || localStorage.getItem('modu_proxy') || '').trim().replace(/\/$/, '');
    const code = gCode.trim();
    if (!proxy) { setGMsg({ t: '서버 주소를 입력하세요.', c: 'err' }); return; }
    if (!code) { setGMsg({ t: '접속 코드를 입력하세요.', c: 'err' }); return; }
    setGMsg({ t: '확인 중…', c: '' });
    try {
      try { localStorage.setItem('modu_proxy', proxy); } catch { /* noop */ }
      const r = await fetch(proxy + '/verify?key=' + encodeURIComponent(code));
      if (!r.ok) { setGMsg({ t: '서버 응답 오류(' + r.status + '). 주소를 확인하세요.', c: 'err' }); return; }
      const j = await r.json();
      if (j && j.valid) {
        const tier = j.tier || 'basic';
        try { localStorage.setItem('modu_access', JSON.stringify({ key: code, tier, ts: Date.now() })); } catch { /* noop */ }
        document.body.classList.remove('tier-basic', 'tier-premium'); document.body.classList.add(tier === 'premium' ? 'tier-premium' : 'tier-basic');
        setGMsg({ t: '환영합니다! (' + (tier === 'premium' ? '정회원' : '회원') + ')', c: 'ok' });
        setGated(false);
      } else { setGMsg({ t: '유효하지 않은 코드예요. 카페에서 받은 코드를 확인하세요.', c: 'err' }); }
    } catch { setGMsg({ t: '서버 연결 실패. 인터넷·서버 주소를 확인하세요.', c: 'err' }); }
  };
  const [versions, setVersions] = useState<string[]>(['2026-08']);
  const [ver, setVer] = useState('2026-08');

  useEffect(() => { loadManifest().then(m => { setVersions(m.versions); setVer(m.latest); }).catch(() => {}); }, []);
  useEffect(() => { loadPolicy(ver).then(setPolicy).catch(() => {}); }, [ver, setPolicy]);

  const stale = policy ? isPolicyStale(policy) : false;
  const days = policy ? Math.floor((Date.now() - Date.parse(policy.verifiedAt)) / 86400000) : 0;

  return <>
    {gated && <div className="gate" role="dialog" aria-modal="true" aria-label="회원 전용 접속">
      <div className="gate-box">
        <div className="gate-logo">🏠 모두의 내집마련</div>
        <h2>AI재테크연구소 회원 전용</h2>
        <p className="gate-desc">회원 등급별로 제공되는 프로그램입니다. 카페에서 받은 <b>접속 코드</b>를 입력하세요.</p>
        {!localStorage.getItem('modu_proxy') && <div className="gate-f"><label>서버 주소</label><input type="text" placeholder="https://내프록시.onrender.com" value={gProxy} onChange={e => setGProxy(e.target.value)} /></div>}
        <div className="gate-f"><label>접속 코드</label><input type="text" placeholder="카페에서 받은 코드" autoComplete="off" value={gCode} onChange={e => setGCode(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') submitGate(); }} /></div>
        <div className={'gate-msg ' + gMsg.c} aria-live="polite">{gMsg.t}</div>
        <button className="btn accent gate-btn" type="button" onClick={submitGate}>입장하기</button>
        <a className="gate-link" href="https://cafe.naver.com/aiprogram1" target="_blank" rel="noopener noreferrer">코드 문의 · AI재테크연구소 카페 →</a>
      </div>
    </div>}
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
