import { useStore } from '../../state/store.ts';

const DD = ['D-36~D-18', 'D-18~D-9', 'D-9~D-4', 'D-4~D-0', 'D-0~D+3'];

export function Roadmap() {
  const report = useStore(s => s.report), state = useStore(s => s.state);
  if (!report || !state) return null;
  const rm = report.roadmap, e5 = report.route, main = e5.routes[0], sub = e5.routes[1] ?? e5.routes[0];
  const compressed = rm.runway < 24, plan = state.savingMonthly || 0;
  const won = (v: number) => new Intl.NumberFormat('ko-KR').format(Math.round(v));
  return <>
    <div className="pane-intro">💡 이 화면은 <b>지금부터 집을 살 때까지 무엇을, 언제 하면 되는지</b>를 순서대로 알려줘요. 맨 위 <b>이번 달 할 일</b>부터 하나씩 체크하면 돼요.</div>
    <div className="card hi"><div className="ch"><span className="n">📌</span><h3>이번 달 할 일</h3></div>
      {rm.tasks.map((t, i) => <div key={i} className="task"><input type="checkbox" /><div style={{ flex: 1 }}>
        <div className="tt" dangerouslySetInnerHTML={{ __html: t.t }} /><div className="wy" dangerouslySetInnerHTML={{ __html: t.why }} /></div><div className="du">{t.due}</div></div>)}
      <div className="mgoal"><span>월 저축 목표</span><b>{won(plan)}만원/월</b><span className="tiny muted">현재 계획 기준 · '지름길' 탭에서 더 당길 수 있어요</span></div></div>

    <div className="card" style={{ marginTop: 16 }}><div className="ch"><span className="n">🗺️</span><h3>내 준비 로드맵 — 잔금일에서 거꾸로</h3></div>
      <div className="anchor"><div><div className="tiny" style={{ opacity: 0.75 }}>집 사는 목표일</div><div className="d">{rm.anchor}</div></div><div className="rw">지금부터 {rm.runway >= 0 ? rm.runway : 0}개월{compressed ? ' · ⚠ 2년 미만(빠듯)' : ''}</div></div>
      {compressed && <div className="warn-note" style={{ marginBottom: 12 }}>남은 기간이 2년 미만이라 준비가 빠듯해요. <b>계약금 확보</b>와 <b>대출 사전상담</b>을 앞당기세요.</div>}
      {rm.phases.map((p, i) => <div key={i} className="phase"><div className="h"><span className="dd">{DD[i]}</span><span className="pn">{p.name}</span>
        {p.past ? <span className="dd" style={{ color: 'var(--ink-3)', borderColor: 'var(--line)', background: '#f2f4f5' }}>지남</span> : p.started ? <span className="dd" style={{ color: 'var(--ok)', borderColor: 'var(--ok-soft)', background: '#f2faf7' }}>진행 중</span> : null}
        <span className="rg">{p.from} → {p.to}</span></div>
        <ul>{p.tasks.map((t, k) => { const star = t.startsWith('★'); return <li key={k} className={star ? 'star' : ''}>{star ? t.slice(1).trim() : t}</li>; })}</ul></div>)}</div>

    <div className="cols2" style={{ marginTop: 16 }}>
      <div className="card"><div className="ch"><span className="n">✅</span><h3>준비 체크포인트</h3></div>
        {rm.ms.map(m => <div key={m.code} className="ms"><div className="col"><div className={`g ${m.pass ? 'pass' : (m.code === 'M2' || m.code === 'M3' ? 'fail' : '')}`}>{m.pass ? '✓' : ''}</div><div className="stem" /></div>
          <div className="b"><div className="t"><span className="c">{m.code}</span>{m.name}</div><div className={`cd ${!m.pass && (m.code === 'M2' || m.code === 'M3') ? 'fail' : ''}`}>{m.cond}</div></div></div>)}</div>
      <div className="card"><div className="ch"><span className="n">🧭</span><h3>추천 경로 · 청약 가점</h3></div>
        <div className="route-cards">
          <div className="rc main"><div className="tiny" style={{ color: 'var(--ok)', fontWeight: 800 }}>이 방법을 추천</div><div style={{ fontWeight: 850, fontSize: 16, margin: '2px 0' }}>{main.name}</div><div className="tiny muted">{main.reason}</div></div>
          <div className="rc"><div className="tiny" style={{ color: 'var(--brass)', fontWeight: 800 }}>차선책</div><div style={{ fontWeight: 850, fontSize: 16, margin: '2px 0' }}>{sub.name}</div><div className="tiny muted">{sub.reason}</div></div>
        </div>
        <div className="stat-row" style={{ marginTop: 8 }}><span>예상 청약 가점</span><span className="v">{e5.score.total} / 84점</span></div>
        <div className="stat-row"><span className="tiny muted">무주택 {e5.score.homeless} · 부양 {e5.score.dep} · 통장 {e5.score.acct}</span><span /></div></div>
    </div>
  </>;
}
