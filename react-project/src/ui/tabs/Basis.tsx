import { useState } from 'react';
import { useStore } from '../../state/store.ts';
import { isPolicyStale } from '../../policy/loader.ts';
import { A2_PROMPT, buildEngineResult } from '../../ai/prompts.ts';
import { collectAllowedNumbers, findFlagged } from '../../ai/guard.ts';
import { explain } from '../../ai/client.ts';

function daysSince(ymd: string): number { return Math.floor((Date.now() - Date.parse(ymd)) / 86400000); }

import { Tip } from '../Tooltip.tsx';
export function Basis() {
  const policy = useStore(s => s.policy), state = useStore(s => s.state), report = useStore(s => s.report);
  const [ep, setEp] = useState(() => localStorage.getItem('modu_ai_ep') || '');
  const [status, setStatus] = useState(''); const [out, setOut] = useState<{ text: string; flagged: string[] } | null>(null); const [payload, setPayload] = useState('');
  if (!policy || !state || !report) return null;
  const stale = isPolicyStale(policy), d = daysSince(policy.verifiedAt);

  const data = () => buildEngineResult(state, report);
  const showPayload = () => { setStatus('아래 페이로드를 본인 프록시로 POST하세요.'); setPayload(JSON.stringify({ system: A2_PROMPT, data: data() }, null, 2)); setOut(null); };
  const runAI = async () => {
    localStorage.setItem('modu_ai_ep', ep);
    if (!ep) { showPayload(); return; }
    setStatus('해설 생성 중…'); setOut(null); setPayload('');
    try {
      const r = await explain(ep, { system: A2_PROMPT, data: data() });
      setStatus(r.flagged.length ? `⚠ 검증기: 엔진에 없는 숫자 ${r.flagged.length}개 — 신뢰하지 마세요` : '✓ 검증기 통과');
      setOut({ text: r.text, flagged: r.flagged });
    } catch (e) { setStatus('호출 실패: ' + (e as Error).message + ' (CORS/URL 확인). 아래는 페이로드.'); showPayload(); }
  };
  const allowed = collectAllowedNumbers(data());
  void findFlagged; void collectAllowedNumbers; void allowed;

  const renderOut = () => {
    if (!out) return null;
    let safe = out.text; out.flagged.forEach(f => { safe = safe.split(f).join(`⟪${f}⟫`); });
    const parts = safe.split(/(⟪.+?⟫)/g);
    return <div className="ai-out">{parts.map((p, i) => p.startsWith('⟪') ? <span key={i} className="flag">{p.slice(1, -1)}</span> : <span key={i}>{p}</span>)}</div>;
  };

  return <>
    <div className="lead-note">이 화면은 <b>계산에 쓰인 정책 수치</b>와 <b>지금 값을 직접 확인하는 공식 링크</b>를 모아둔 곳이에요.</div>
    <div className="card"><div className="ch"><span className="n">📐</span><h3>계산에 쓰인 가정·기준값 (투명 공개)</h3><Tip text="이 앱이 어떤 값으로 계산했는지 전부 공개해요. 법으로 정해진 값과 앱의 추정을 구분해서 보여드립니다." /></div>
      <p className="tiny muted" style={{ margin: '-4px 0 12px' }}>숫자의 <b>출처와 성격</b>을 투명하게 공개합니다. <span style={{ color: 'var(--ok-ink)' }}>법정·공식</span>은 검증된 값이고, <span style={{ color: 'var(--brass)' }}>가정</span>은 상황에 따라 달라질 수 있는 추정이에요.</p>
      <div className="asmp">
        <div className="asmp-g"><div className="asmp-h">⚖️ 법으로 정해진 값 <span className="badge-law">법정·규제</span></div>
          <div className="asmp-r"><span>DSR 상한</span><b>40%</b><i>은행권 개인 대출규제</i></div>
          <div className="asmp-r"><span>전월세전환율 상한</span><b>4.5%</b><i>= min(10%, 기준금리 2.5%+2%p) · 주택임대차보호법 §7의2</i></div>
          <div className="asmp-r"><span>LTV·취득세·중개보수</span><b>지역·가격별</b><i>규제지역 2025.10.16 기준 · 공식 요율</i></div>
          <div className="asmp-r"><span>규제지역 주담대 한도</span><b>6억 / 4억 / 2억</b><i>시가 15억↓ / 15~25억 / 25억↑ (2025.10.16 주택시장 안정화 대책)</i></div>
          <div className="asmp-r"><span>규제지역 범위</span><b>서울 전역 + 경기 12곳</b><i>과천·광명·성남(분당·수정·중원)·수원(영통·장안·팔달)·안양 동안·용인 수지·의왕·하남</i></div>
        </div>
        <div className="asmp-g"><div className="asmp-h">🏛️ 공식 통계·기준 <span className="badge-off">공식</span></div>
          <div className="asmp-r"><span>한국은행 기준금리</span><b>2.5%</b><i>2026 · ECOS</i></div>
          <div className="asmp-r"><span>공시가격 반영률(보유세용 근사)</span><b>69%</b><i>보유세 근사 계산에만 사용</i></div>
        </div>
        <div className="asmp-g"><div className="asmp-h">🎯 이 앱의 가정(추정) <span className="badge-est">가정</span></div>
          <div className="asmp-r"><span>전세보증금 기회수익률</span><b>3%</b><i>안전자산 수익 가정 · 월세vs전세 비교에만 사용</i></div>
          <div className="asmp-r"><span>전세→매매 브릿지 금리</span><b>5.5% · 최대 6개월</b><i>은행별 상이 · 상담 필요</i></div>
          <div className="asmp-r"><span>중도상환수수료</span><b>1.2%</b><i>근사 · 상품별 상이</i></div>
          <div className="asmp-r"><span>주거비 부담 가이드</span><b>30%</b><i>일반 권고(법적 강제 아님)</i></div>
        </div>
        <div className="asmp-g"><div className="asmp-h">✍️ 사용자가 직접 넣는 값 <span className="badge-usr">입력</span></div>
          <div className="asmp-r"><span>목표가·상승률·금리·소득·저축·자산·부채·지역</span><b>입력값</b><i>결과에 가장 크게 영향</i></div>
        </div>
      </div>
      <div className="tiny muted" style={{ marginTop: 10 }}>💡 <b>가정</b> 값은 실제와 다를 수 있어 참고용이며, <b>법정·공식</b> 값도 수시로 바뀌니 계약 전 아래 공식 링크에서 다시 확인하세요.</div></div>
    <div className="card"><div className="ch"><span className="n">🔄</span><h3>정책 실시간 확인 — 바뀌었을 수 있어요</h3></div>
      <p className="tiny muted" style={{ margin: '-4px 0 10px' }}>이 앱의 값은 <b>{policy.version} 스냅샷</b>(규제지역 <b>2025.10.16</b> 기준)이에요. 대출금리·세율·청약·규제는 <b>수시로 바뀌니</b>, 계약 전 아래에서 <b>지금 값</b>을 확인하세요.</p>
      <div className="link-list">
        <a className="olink" href="https://www.applyhome.co.kr" target="_blank" rel="noopener noreferrer"><b>청약 제도·일정</b><span>청약홈(한국부동산원) · 가점·특별공급·모집공고 최신</span></a>
        <a className="olink" href="https://nhuf.molit.go.kr" target="_blank" rel="noopener noreferrer"><b>정책대출 금리·요건</b><span>주택도시기금 · 디딤돌·버팀목 현재 금리</span></a>
        <a className="olink" href="https://finlife.fss.or.kr/finlife/ldng/houseMrtg/list.do?menuNo=700007" target="_blank" rel="noopener noreferrer"><b>주담대 금리 비교</b><span>금융감독원 금융상품 한눈에 · 은행별 현재 금리</span></a>
        <a className="olink" href="https://www.wetax.go.kr" target="_blank" rel="noopener noreferrer"><b>취득세·재산세</b><span>위택스 · 지방세 세율·감면 현재 기준</span></a>
        <a className="olink" href="https://www.reb.or.kr" target="_blank" rel="noopener noreferrer"><b>규제지역·공시가격</b><span>한국부동산원 · 조정대상·투기과열 최신 지정 현황</span></a>
      </div></div>
    <div className="card"><div className="ch"><span className="n">SRC</span><h3>이 계산에 쓰인 정책 수치</h3></div>
      <p className="tiny muted" style={{ margin: '-4px 0 12px' }}>엔진은 아래 값으로만 계산합니다. <b>low</b>는 출처 간 차이가 있어 계약 전 원문 확인이 필요합니다.</p>
      <table className="tbl"><thead><tr><th>항목</th><th>값</th><th>근거·비고</th><th>신뢰도</th></tr></thead><tbody>
        {policy.meta.map((m, i) => <tr key={i}><td><b>{m.k}</b></td><td>{m.v}</td><td className="tiny muted">{m.note}</td><td><span className={`conf ${m.conf}`}>{m.conf}</span></td></tr>)}
      </tbody></table>
      {stale ? <div className="warn-note">이 파일의 정책 스냅샷은 <b>{policy.version}</b> 기준(검증 {d}일 전)으로 <b>90일이 지났습니다</b>. 대출·세제·청약 수치가 바뀌었을 수 있으니 아래 원문에서 재확인하세요.</div>
        : <div className="ok-note">이 파일의 정책 스냅샷은 <b>{policy.version}</b> 기준(검증 {d}일 전)이며 90일 이내입니다. 그래도 계약 전에는 아래 원문으로 한 번 더 확인하는 것을 권합니다.</div>}</div>

    <div className="cols2" style={{ marginTop: 16 }}>
      <div className="card"><div className="ch"><span className="n">REF</span><h3>원문 확인처</h3></div>
        <div className="stat-row"><span>청약 자격·가점·특공</span><span className="v">applyhome.co.kr</span></div>
        <div className="stat-row"><span>정책대출</span><span className="v">nhuf.molit.go.kr</span></div>
        <div className="stat-row"><span>LTV·DSR·스트레스금리</span><span className="v">금융위·금감원</span></div>
        <div className="stat-row"><span>취득세·감면·중과</span><span className="v">위택스 / 시군구</span></div></div>
      <div className="card"><div className="ch"><span className="n">AI</span><h3>엔진 결과 해설</h3></div>
        <p className="tiny muted" style={{ margin: '-4px 0 10px' }}>AI는 숫자를 만들지 않습니다. 엔진 결과를 요약만 하고, 없는 숫자가 섞이면 <b>검증기</b>가 표시합니다. 정적 배포에선 본인 프록시(Render 등) 경유가 정석.</p>
        <div className="lform"><div className="f" style={{ flex: 1, minWidth: 220 }}><label>해설 엔드포인트 <span className="h">비우면 페이로드만</span></label><input placeholder="https://내프록시.onrender.com/explain" value={ep} onChange={e => setEp(e.target.value)} /></div>
          <button className="btn ink" onClick={runAI}>해설 생성</button><button className="btn" onClick={showPayload}>페이로드</button></div>
        <div className="tiny muted">{status}</div>
        {renderOut()}
        {payload && <div className="code">{payload}</div>}</div>
    </div>

    <div className="card" style={{ marginTop: 16 }}><div className="ch"><span className="n">⚖️</span><h3>이용 안내 · 면책 · 개인정보</h3></div>
      <div className="legal">
        <p><b>1. 성격</b> — 이 앱은 공개된 제도 정보를 바탕으로 한 <b>계산·교육용 시뮬레이터</b>입니다. 투자·금융·세무·법률 <b>자문이 아니며</b>, 특정 금융상품·부동산·거래를 <b>권유하지 않습니다.</b></p>
        <p><b>2. 개인정보</b> — 입력한 소득·자산 등 모든 값은 <b>이 브라우저에만</b> 저장(localStorage)되며, <b>서버로 전송·수집·공유하지 않습니다.</b> 지우려면 브라우저 저장소를 삭제하세요. (AI 해설을 켠 경우에만 해당 문장이 외부 AI로 전송될 수 있습니다.)</p>
        <p><b>3. 광고·제휴 없음</b> — 어떤 금융기관·중개사와도 제휴·수수료 관계가 없으며, 링크는 정부·공공기관 등 <b>공식 출처</b>로만 연결됩니다.</p>
        <p><b>4. 정확성·책임</b> — 정책·금리·세율·규제는 <b>수시로 바뀌고</b> 개인 상황에 따라 달라집니다. 대출 한도·금리, 청약 자격, 세액은 <b>금융기관 심사·관계기관 판단으로 최종 확정</b>됩니다. 최종 확인과 의사결정의 책임은 이용자에게 있으며, 본 앱 결과로 인한 손해에 대해 제작자는 책임지지 않습니다.</p>
        <p className="tiny muted">상업적 배포 시에는 전자상거래법·개인정보보호법 등에 따른 약관·개인정보처리방침을 별도로 갖추고 전문가 검토를 받는 것을 권합니다.</p>
      </div></div>
  </>;
}
