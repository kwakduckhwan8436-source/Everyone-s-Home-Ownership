import { useEffect, useState, useRef } from 'react';
import { useStore } from '../state/store.ts';
import { crossover } from '../engines/e3_crossover.ts';
import type { Crossover } from '../types.ts';
import { ctxOf, applyLever, bindKo } from './uiutil.ts';
import { won, eok } from '../engines/util.ts';
import { Summary } from './results/Summary.tsx';
import { Hero } from './results/Hero.tsx';
import { Stats } from './results/Stats.tsx';
import { Levers } from './results/Levers.tsx';
import { CrossoverChart } from './CrossoverChart.tsx';
import { Detail } from './tabs/Detail.tsx';
import { Roadmap } from './tabs/Roadmap.tsx';
import { Ledger } from './tabs/Ledger.tsx';
import { Basis } from './tabs/Basis.tsx';
import { Compare } from './tabs/Compare.tsx';
import { Cheongyak } from './tabs/Cheongyak.tsx';
import { Official } from './tabs/Official.tsx';
import { Buyguide } from './tabs/Buyguide.tsx';
import { Shortcut } from './tabs/Shortcut.tsx';
import { Realprice } from './tabs/Realprice.tsx';
import { Tools } from './tabs/Tools.tsx';

const TABS: [string, string, boolean?][] = [['detail', '🏠 언제 살까'], ['road', '📝 준비하기'], ['shortcut', '🚀 지름길', true], ['tools', '🧮 계산기'], ['realprice', '🏷️ 실거래가'], ['buyguide', '📖 집 사는 법'], ['cheongyak', '🎟️ 청약', true], ['official', '🏦 서류·대출', true], ['basis', '💬 정책·근거', true], ['ledger', '📊 저축 점검', true], ['compare', '🔀 플랜 비교', true]];

export function Results() {
  const report = useStore(s => s.report), state = useStore(s => s.state), policy = useStore(s => s.policy);
  const setField = useStore(s => s.setField);
  const [curr, setCurr] = useState(1);
  const [tab, setTab] = useState('detail');
  const [preview, setPreview] = useState<{ id: string; name: string; res: Crossover; saved: number } | null>(null);
  const [introHidden, setIntroHidden] = useState(() => !!localStorage.getItem('modu_intro_hidden'));
  const tabsRef = useRef<HTMLElement>(null);
  const [simpleView, setSimpleView] = useState<boolean>(() => { try { return localStorage.getItem('modu_simple') !== '0'; } catch { return true; } });
  useEffect(() => { document.body.classList.toggle('simple', simpleView); try { localStorage.setItem('modu_simple', simpleView ? '1' : '0'); } catch { /* noop */ } }, [simpleView]);
  const scrollTabs = (dir: number) => { tabsRef.current?.scrollBy({ left: dir * 170, behavior: 'smooth' }); };

  if (!report || !state || !policy) return <div className="results">
    <div className="print-head"><h1>모두의 내집마련 — 내 계획 요약</h1><div className="pd">{new Date().toLocaleDateString('ko-KR')} 기준{policy ? ' · 정책 ' + policy.version : ''}</div></div><div className="hero"><div className="hero-in"><div className="lead">정책 불러오는 중…</div></div></div></div>;

  const baseSc = { name: '기본', growth: state.market.priceGrowth, returnMul: 1, mortgageRate: state.market.mortgageRate };
  const doPreview = (id: string) => {
    if (preview?.id === id) { setPreview(null); return; }
    const l = report.levers.find(x => x.id === id); if (!l) return;
    const { s, opts } = applyLever(state, id);
    setPreview({ id, name: l.name, res: crossover(s, baseSc, ctxOf(policy), opts), saved: l.monthsSaved });
  };
  const applyToInputs = () => {
    if (!preview) return;
    const id = preview.id;
    if (id === 'L1') setField('saving', String(state.savingMonthly + 30));
    else if (id === 'L2') setField('priceNow', String(Math.round(state.target.priceNow * 0.9)));
    else if (id === 'L4') setField('debtBal', '0');
    else if (id === 'L5') setField('mortRate', '2.0');
    else if (id === 'L7') { alert('전세 브릿지는 상황에 따라 쓰는 옵션이라 입력값으로 고정하지 않습니다. 미리보기로 효과만 확인하세요.'); return; }
    setPreview(null);
  };
  const dismissIntro = () => { setIntroHidden(true); localStorage.setItem('modu_intro_hidden', '1'); };

  let pvSuffix = '';
  if (preview) {
    if (!preview.res.reachable) pvSuffix = ' → 여전히 미도달';
    else if (preview.saved > 0) pvSuffix = ` → ${preview.res.targetYm} · ${preview.saved}개월 빠름`;
    else if (preview.saved < 0) pvSuffix = ` → ${preview.res.targetYm} · ${Math.abs(preview.saved)}개월 느림`;
    else pvSuffix = ` → ${preview.res.targetYm} · 변화 없음`;
  }
  const r = report.scenarios[1].res;
  const gotoLever = (id: string) => { setTab('detail'); doPreview(id); window.scrollTo({ top: 0, behavior: 'smooth' }); };
  const pane = tab === 'detail' ? <Detail /> : tab === 'road' ? <Roadmap /> : tab === 'shortcut' ? <Shortcut onGoto={gotoLever} /> : tab === 'tools' ? <Tools /> : tab === 'realprice' ? <Realprice /> : tab === 'cheongyak' ? <Cheongyak /> : tab === 'official' ? <Official /> : tab === 'buyguide' ? <Buyguide /> : tab === 'ledger' ? <Ledger /> : tab === 'basis' ? <Basis /> : <Compare />;
  const switchTab = (k: string) => { setTab(k); window.scrollTo({ top: 0, behavior: 'smooth' }); };

  return <div className="results">
    <div className="print-head"><h1>모두의 내집마련 — 내 계획 요약</h1>
      <div className="pd">{new Date().toLocaleDateString('ko-KR')} 기준{policy ? ' · 정책 ' + policy.version : ''}</div>
      <div className="print-sum">{r.reachable
        ? <>내집마련 예상 시점 <b>{r.targetYm}</b> · 목표가 <b>{eok(state.target.priceNow)}</b> · 월 저축 <b>{won(state.savingMonthly)}만원</b> · 병목 <b>{bindKo(report.cap.bindingConstraint)}</b></>
        : <>현재 계획으로는 <b>도달 어려움</b> · 목표가 <b>{eok(state.target.priceNow)}</b> · 월 저축 <b>{won(state.savingMonthly)}만원</b></>}</div></div>
    <div className="view-toggle" role="group" aria-label="보기 모드">
      <button className={simpleView ? 'on' : ''} type="button" onClick={() => setSimpleView(true)}>🔰 쉽게 보기</button>
      <button className={!simpleView ? 'on' : ''} type="button" onClick={() => setSimpleView(false)}>📊 자세히 보기</button>
      <span className="vt-hint">{simpleView ? '초보자용 핵심만 · 더 많은 분석은 "자세히 보기"' : '모든 분석·도구를 표시하고 있어요'}</span>
    </div>
    <div className="tabbar"><button className="tabnav" aria-label="이전 메뉴" onClick={() => scrollTabs(-1)}>‹</button><nav className="tabs" ref={tabsRef} role="tablist" aria-label="주요 메뉴">{TABS.map(([k, label, adv]) => <button key={k} {...(adv ? { 'data-adv': '' } : {})} role="tab" id={`tab-${k}`} aria-selected={tab === k} aria-controls="activePane" className={tab === k ? 'on' : ''} onClick={() => switchTab(k)}>{label}</button>)}</nav><button className="tabnav" aria-label="다음 메뉴" onClick={() => scrollTabs(1)}>›</button></div>
    <div className="livebar" aria-live="polite" aria-atomic="true"><span className="d">{r.reachable ? r.targetYm : '미도달'}</span><span className="s">병목 {bindKo(report.cap.bindingConstraint)}</span></div>
    {!introHidden && <div className="guide">
      <button className="x" onClick={dismissIntro} aria-label="닫기">✕</button>
      <div className="g-h">🏠 처음이세요? <b>3단계면 끝나요</b> — 계산 버튼도, 가입도 없어요</div>
      <div className="g-steps">
        <div className="g-step"><span className="g-n">1</span><div><b>내 상황 고르기</b><span>왼쪽 위 <b>빠른 시작</b>에서 비슷한 유형을 눌러요 (신혼·사회초년생·아이있는집·갈아타기)</span></div></div>
        <div className="g-step"><span className="g-n">2</span><div><b>목표·저축 맞추기</b><span>목표 집값·월 저축을 <b>슬라이더</b>로 밀면 결과가 실시간으로 바뀌어요</span></div></div>
        <div className="g-step"><span className="g-n">3</span><div><b>결과·할 일 보기</b><span>아래에서 <b>언제 살 수 있는지</b>, <b>이번 달 할 일</b>, <b>청약·공식서류</b>까지 확인해요</span></div></div>
      </div>
    </div>}
    <div id="analysisCore" style={{ display: tab === 'detail' ? undefined : 'none' }}>
    <Hero />
    <Summary />
    <div className="card">
      <div className="ch"><h3>언제 살 수 있나 — 두 선이 만나는 때</h3><span className="sp" />
        <div className="scn">{['보수', '기본', '낙관'].map((n, i) => <button key={i} className={curr === i ? 'on' : ''} onClick={() => { setCurr(i); setPreview(null); }}>{n}</button>)}</div></div>
      <div className="legend">
        <span className="k"><span className="sw" style={{ background: 'var(--ink)' }} />필요 자기자본</span>
        <span className="k"><span className="sw" style={{ background: 'var(--brass)' }} />가용 자기자본</span>
        <span className="k"><span className="sw" style={{ background: 'var(--ok)', width: 9, height: 9, borderRadius: '50%' }} />내집마련 가능 시점</span>
        <span className="plain">쉽게: <b>검은 선(필요한 돈)</b>보다 <b>금색 선(모은 돈)</b>이 위로 올라오는 순간 = 집을 살 수 있는 때예요.</span>
      </div>
      <CrossoverChart scenarios={report.scenarios} curr={curr} preview={preview?.res ?? null} />
      {preview && <div className="pv-bar on"><span className="t">{preview.name}{pvSuffix}</span>
        {preview.id !== 'L7' && <button className="apply" onClick={applyToInputs}>이대로 적용</button>}
        <button className="x" onClick={() => setPreview(null)}>닫기 ✕</button></div>}
    </div>
    <div data-adv><Stats /></div>
    <div className="card" data-adv><div className="ch"><h3>더 빨리 사려면? — 카드를 탭해 미리보기</h3></div>
      <Levers activeId={preview?.id ?? null} onPreview={doPreview} /></div>
    </div>
    <div className="pane on" id="activePane" role="tabpanel" aria-labelledby={`tab-${tab}`} tabIndex={0}>{pane}</div>
    <details className="disc-d"><summary>ℹ️ 면책 고지 · 데이터 재확인 안내 (탭하여 펼치기)</summary><div className="disc">본 도구는 공개된 제도 정보를 바탕으로 한 <b>계산 시뮬레이터</b>이며 투자·금융·세무 자문이 아닙니다. 대출 한도·금리, 청약 자격, 세액은 금융기관 심사와 관계기관 판단에 따라 달라집니다. 정책대출·다주택 중과 등 <b>low</b> 표시 항목은 계약 전 청약홈·주택도시기금·위택스·해당 금융기관 원문으로 반드시 재확인하세요.</div></details>
  </div>;
}
