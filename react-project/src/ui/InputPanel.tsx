import { useState, useEffect, type ChangeEvent } from 'react';
import { useStore } from '../state/store.ts';
import { Field, Check } from './Field.tsx';
import { CurveEditor } from './CurveEditor.tsx';
import { RegionPicker } from './RegionPicker.tsx';
import { buildPresets } from '../data/presets.ts';
import { nowYM } from '../engines/util.ts';

function toast(msg: string) {
  let t = document.getElementById('toast');
  if (!t) { t = document.createElement('div'); t.id = 'toast'; document.body.appendChild(t); }
  t.textContent = msg; t.className = 'on';
  clearTimeout((window as unknown as { __tt: number }).__tt);
  (window as unknown as { __tt: number }).__tt = setTimeout(() => { if (t) t.className = ''; }, 2600) as unknown as number;
}
export function InputPanel() {
  const applyRaw = useStore(s => s.applyRaw);
  const formRaw = useStore(s => s.formRaw);
  const plans = useStore(s => s.plans);
  const savePlan = useStore(s => s.savePlan);
  const loadPlan = useStore(s => s.loadPlan);
  const delPlan = useStore(s => s.delPlan);
  const [drawCurve, setDrawCurve] = useState(false);
  const [simple, setSimple] = useState(true);
  useEffect(() => { document.body.classList.toggle('simple', simple); }, [simple]);
  const presets = buildPresets(nowYM());

  const shareLink = () => {
    try {
      const enc = btoa(unescape(encodeURIComponent(JSON.stringify(formRaw))));
      const url = location.origin + location.pathname + '#p=' + enc;
      if (navigator.clipboard && navigator.clipboard.writeText)
        navigator.clipboard.writeText(url).then(() => toast('🔗 링크를 복사했어요 · 붙여넣기로 공유하세요'), () => window.prompt('아래 링크를 복사하세요', url));
      else window.prompt('아래 링크를 복사하세요', url);
    } catch { alert('링크 생성 실패'); }
  };
  const exportJSON = () => {
    const blob = new Blob([JSON.stringify(formRaw, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = '모두의내집마련-계획.json'; a.click();
  };
  const importJSON = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader(); r.onload = () => { try { applyRaw(JSON.parse(String(r.result))); } catch { alert('불러오기 실패'); } }; r.readAsText(f);
  };

  return (
    <aside className={"inputs" + (simple ? " simple" : "")}>
      <div className="grp"><div className="grp-b" style={{ display: 'block' }}>
        <div className="preset-h">빠른 시작 — 비슷한 상황을 눌러 채우고 조정하세요</div>
        <div className="presets">
          {presets.map(p => <button key={p.key} className="preset" onClick={() => applyRaw(p.raw)}><span className="em">{p.emoji}</span>{p.label}</button>)}
        </div>
      </div>
      <label className="simple-toggle"><input type="checkbox" checked={simple} onChange={e => setSimple(e.target.checked)} /> 🔰 <b>간단 모드</b> <span>핵심만 보기 · 끄면 자산·부채·청약 상세가 열려요</span></label>
      </div>

      <div className="grp"><div className="grp-b" style={{ display: 'block' }}>
        <div className="preset-h">내 시나리오 — 지금 입력을 저장/불러오기</div>
        <div style={{ display: 'flex', gap: 7, flexWrap: 'wrap', alignItems: 'center' }}>
          <button className="preset" style={{ flex: '0 0 auto', padding: '7px 12px' }} onClick={() => { const n = (window.prompt('시나리오 이름 (예: 지금 계획, 저축 늘린 안)', '내 계획') || '').trim().replace(/[<>'"]/g, '').slice(0, 20); if (n) savePlan(n); }}><span className="em">💾</span>현재 저장</button>
          {plans.length ? plans.map((p, i) => <span key={i} className="scen-chip"><button type="button" onClick={() => loadPlan(i)} title="이 시나리오 불러오기">{p.name}</button><button type="button" className="x" onClick={() => delPlan(i)} aria-label="삭제">×</button></span>) : <span className="tiny muted">저장한 시나리오가 여기에 표시돼요.</span>}
        </div>
      </div></div>

      <div className="grp"><div className="grp-h"><span className="n">01</span><span className="t">👨‍👩‍👧 우리 가족·소득</span></div>
        <div className="grp-b">
          <Field id="householdType" label="가구 유형" type="select" options={['1인', '부부', '부부+자녀', '한부모', '예비신혼']} />
          <Field id="children" label="자녀 수" />
          <Field id="childBirth" label="막내 출생연월" hint="특례" type="month" />
          <Field id="income" label="연소득" hint="만원·부부합산" />
          <Field id="saving" label="월 저축 가능액" hint="만원" />
        </div>
      </div>

      <div className="grp" data-adv><div className="grp-h"><span className="n">02</span><span className="t">💰 가진 돈·빚 <span className="h" style={{ fontWeight: 500, color: 'var(--ink-3)' }}>만원</span></span></div>
        <div className="grp-b">
          <Field id="cash" label="현금·예금" />
          <Field id="stock" label="주식·펀드" />
          <Field id="jeonse" label="전세보증금" hint="회수시점 자산" />
          <Field id="jeonseEnd" label="전세 만기" type="month" />
          <Field id="retire" label="퇴직연금" hint="비유동" />
          <Field id="debtBal" label="신용대출 잔액" />
          <Field id="debtRate" label="대출 금리" hint="%" step="0.1" />
          <Field id="debtTerm" label="남은 기간" hint="개월" />
        </div>
      </div>

      <div className="grp"><div className="grp-h"><span className="n">03</span><span className="t">🏠 사고 싶은 집</span></div>
        <div className="grp-b">
          <RegionPicker />
          <Field id="priceNow" label="목표 주택가격" hint="만원 · 1억=10000" />
          <Field id="targetDate" label="희망 시점" hint="비우면 자동" type="month" />
          <Field id="growth" label="집값 상승률" hint="연 %" step="0.1" />
          <Field id="mortRate" label="주담대 금리" hint="%" step="0.1" />
        </div>
      </div>

      <details className="grp" data-adv><summary><span className="n">04</span><span className="t">🎟️ 청약·세금</span><span className="chev">▸</span></summary>
        <div className="grp-b">
          <Field id="homelessSince" label="무주택 시작연도" />
          <Field id="acctOpen" label="청약통장 가입" type="month" />
          <Field id="dependents" label="부양가족 수" />
          <Field id="homeCount" label="보유 주택 수" hint="0=무주택" />
          <div className="checks">
            <Check id="firstTime" label="생애최초" />
            <Check id="regulated" label="규제지역" />
            <Check id="tempTwoHome" label="일시적 2주택" />
          </div>
          <Field id="growthCurve" label="집값 상승률 곡선" hint="연%, 쉼표 · 비우면 상수" type="text" placeholder="예: 5,4,3,2.5" />
          <Field id="rateCurve" label="주담대 금리 곡선" hint="연%, 쉼표 · 비우면 상수" type="text" placeholder="예: 4.5,4.2,4,4" />
          <div className="checks"><label><input type="checkbox" checked={drawCurve} onChange={e => setDrawCurve(e.target.checked)} /> 곡선을 손으로 그리기 ✍️</label></div>
          {drawCurve && <div className="f wide">
            <div className="ced"><div className="ced-h">집값 상승률 (연 %) — 점을 위아래로 끌어보세요</div><CurveEditor id="growthCurve" min={-1} max={9} def={2.5} /></div>
            <div className="ced"><div className="ced-h">주담대 금리 (연 %)</div><CurveEditor id="rateCurve" min={2} max={7} def={4.2} /></div>
          </div>}
        </div>
      </details>

      <div className="io">
        <button className="btn" onClick={exportJSON}>계획 저장</button>
        <button className="btn accent" onClick={shareLink}>🔗 링크 공유</button>
        <label className="btn" style={{ display: 'inline-block' }}>불러오기<input type="file" accept="application/json" onChange={importJSON} hidden /></label>
        <span className="tiny muted" style={{ marginLeft: 'auto' }}>브라우저에만 저장 · 서버 전송 없음</span>
      </div>
    </aside>
  );
}
