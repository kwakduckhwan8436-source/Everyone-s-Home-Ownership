import { useState, useEffect } from 'react';
import { useStore } from '../../state/store.ts';
import { won, nowYM } from '../../engines/util.ts';
import { Tip } from '../Tooltip.tsx';
import { LAWD_GROUPS } from '../../data/lawdCodes.ts';

export function Realprice() {
  const setField = useStore(s => s.setField);
  const [proxy, setProxy] = useState(() => { try { return localStorage.getItem('modu_proxy') || ''; } catch { return ''; } });
  useEffect(() => { try { localStorage.setItem('modu_proxy', proxy.trim()); } catch { /* noop */ } }, [proxy]);
  const accessKey = () => { try { const a = JSON.parse(localStorage.getItem('modu_access') || 'null'); return a && a.key ? a.key : ''; } catch { return ''; } };
  const AREA_BANDS: { label: string; min: number; max: number }[] = [
    { label: '전체 면적', min: 0, max: 0 },
    { label: '소형 ~60㎡ (~18평)', min: 0, max: 60 },
    { label: '중소형 60~85㎡ (18~25평)', min: 60, max: 85 },
    { label: '중대형 85~135㎡ (25~40평)', min: 85, max: 135 },
    { label: '대형 135㎡~ (40평~)', min: 135, max: 0 },
  ];
  const [areaBand, setAreaBand] = useState(0);
  const [aptQuery, setAptQuery] = useState('');
  const FLOOR_BANDS: { label: string; min: number; max: number }[] = [ { label: '전체 층', min: 0, max: 0 }, { label: '저층 1~5', min: 1, max: 5 }, { label: '중층 6~15', min: 6, max: 15 }, { label: '고층 16~', min: 16, max: 0 } ];
  const [floorBand, setFloorBand] = useState(0);
  const [trendMode, setTrendMode] = useState<'avg' | 'pyeong'>('avg');
  const M2_PER_PY = 3.3058;
  const toPy = (m2: number) => m2 / M2_PER_PY;
  const parseM2 = (s: string) => { const v = parseFloat(s); return isNaN(v) ? null : v; };
  const pyeongPrice = (amountMan: number | null, areaM2: string): number | null => {
    const a = parseM2(areaM2); if (a == null || a <= 0 || amountMan == null) return null;
    return Math.round(amountMan / toPy(a));
  };
  const median = (arr: number[]): number | null => { if (!arr.length) return null; const b = [...arr].sort((x, y) => x - y); const m = Math.floor(b.length / 2); return b.length % 2 ? b[m] : Math.round((b[m - 1] + b[m]) / 2); };
  const DistBar = ({ min, max, p25, p75, med }: { min?: number | null; max?: number | null; p25?: number | null; p75?: number | null; med?: number | null }) => {
    if (min == null || max == null || max <= min) return null;
    const span = max - min;
    const pos = (v: number) => `${((v - min) / span) * 100}%`;
    const wd = p25 != null && p75 != null ? `${((p75 - p25) / span) * 100}%` : '0%';
    return <div style={{ margin: '8px 2px 2px' }}>
      <div style={{ position: 'relative', height: 12, background: 'var(--line)', borderRadius: 7 }}>
        {p25 != null && p75 != null && <div style={{ position: 'absolute', left: pos(p25), width: wd, top: 0, bottom: 0, background: 'var(--accent-soft)', border: '1px solid var(--accent)', borderRadius: 7 }} title="중간 50% 구간" />}
        {med != null && <div style={{ position: 'absolute', left: pos(med), top: -2, bottom: -2, width: 2.5, background: 'var(--accent-ink)' }} title="중앙값" />}
      </div>
      <div className="tiny muted" style={{ display: 'flex', justifyContent: 'space-between', marginTop: 3 }}>
        <span>최저 {won(min)}만</span>
        {p25 != null && p75 != null && <span>중간 50% {won(p25)}~{won(p75)}만</span>}
        <span>최고 {won(max)}만</span>
      </div>
    </div>;
  };
  const OutlierNote = ({ n, low, high, total }: { n?: number; low?: number; high?: number; total?: number }) => {
    if (!n || !total) return null;
    const pct = Math.round((n / total) * 100);
    return <div className="tiny" style={{ marginTop: 4, color: 'var(--ink-2)' }}>
      ⚠️ 이상치 <b>{n}건</b>(전체의 {pct}%){(low || high) ? <> — 초저가 {low || 0} · 초고가 {high || 0}</> : null}. 초고가·초저가 거래가 섞여 있어 <b>평균보다 중앙값</b>이 안전해요.
    </div>;
  };
  const TrendMini = ({ pm }: { pm?: { ym: string; count: number; avgMan: number | null }[] }) => {
    if (!pm || pm.length < 2) return null;
    const data = [...pm].reverse();
    const W = 280, H = 96, padL = 4, padR = 4, baseY = H - 20, topY = 10;
    const n = data.length;
    const slot = (W - padL - padR) / n;
    const xAt = (i: number) => padL + (i + 0.5) * slot;
    const counts = data.map(d => d.count);
    const maxC = Math.max(1, ...counts);
    const val = (d: { avgMan: number | null; pyeongMan?: number | null }) => trendMode === 'pyeong' ? (d.pyeongMan ?? null) : d.avgMan;
    const avgs = data.map(val).filter((v): v is number => v != null);
    const minA = avgs.length ? Math.min(...avgs) : 0;
    const maxA = avgs.length ? Math.max(...avgs) : 1;
    const yC = (c: number) => baseY - (c / maxC) * (baseY - topY);
    const yA = (a: number) => baseY - (maxA === minA ? 0.5 : (a - minA) / (maxA - minA)) * (baseY - topY);
    const bw = Math.min(26, slot * 0.5);
    let path = ''; let started = false;
    data.forEach((d, i) => { const v = val(d); if (v != null) { path += `${started ? 'L' : 'M'}${xAt(i).toFixed(1)},${yA(v).toFixed(1)} `; started = true; } });
    return <div style={{ marginTop: 10 }}>
      <div className="tiny muted" style={{ marginBottom: 2, display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}><span>최근 {n}개월 추이 — <span style={{ color: 'var(--accent)' }}>■</span> 건수 · <span style={{ color: 'var(--brass)' }}>●</span> {trendMode === 'pyeong' ? '평당가' : '평균가'}</span><span style={{ display: 'inline-flex', gap: 4 }}><button className="btn" style={{ padding: '2px 8px', fontSize: 11.5, opacity: trendMode === 'avg' ? 1 : 0.55 }} onClick={() => setTrendMode('avg')}>평균</button><button className="btn" style={{ padding: '2px 8px', fontSize: 11.5, opacity: trendMode === 'pyeong' ? 1 : 0.55 }} onClick={() => setTrendMode('pyeong')}>평당</button></span></div>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: '100%', height: 'auto', maxWidth: 340 }}>
        {data.map((d, i) => <rect key={i} x={xAt(i) - bw / 2} y={yC(d.count)} width={bw} height={Math.max(0, baseY - yC(d.count))} rx={2} fill="var(--accent-soft)" stroke="var(--accent)" strokeWidth={1} />)}
        {data.map((d, i) => d.count > 0 ? <text key={'c' + i} x={xAt(i)} y={yC(d.count) - 3} fontSize="8.5" textAnchor="middle" fill="var(--ink-2)">{d.count}</text> : null)}
        {path && <path d={path} fill="none" stroke="var(--brass)" strokeWidth={2} />}
        {data.map((d, i) => { const v = val(d); return v != null ? <circle key={'a' + i} cx={xAt(i)} cy={yA(v)} r={3} fill="var(--brass)" stroke="#fff" strokeWidth={1.5} /> : null; })}
        {data.map((d, i) => <text key={'m' + i} x={xAt(i)} y={H - 6} fontSize="8.5" textAnchor="middle" fill="var(--ink-3)">{d.ym.slice(4)}월</text>)}
      </svg>
    </div>;
  };
  const areaQS = () => { const b = AREA_BANDS[areaBand]; const f = FLOOR_BANDS[floorBand]; let q = ''; if (b.min > 0) q += `&area_min=${b.min}`; if (b.max > 0) q += `&area_max=${b.max}`; if (aptQuery.trim()) q += `&apt_query=${encodeURIComponent(aptQuery.trim())}`; if (f.min > 0) q += `&floor_min=${f.min}`; if (f.max > 0) q += `&floor_max=${f.max}`; return q; };
  const [lawd, setLawd] = useState('11110');
  const [favs, setFavs] = useState<string[]>(() => { try { return JSON.parse(localStorage.getItem('modu_fav_regions') || '[]'); } catch (e) { return []; } });
  const saveFavs = (arr: string[]) => { setFavs(arr); try { localStorage.setItem('modu_fav_regions', JSON.stringify(arr)); } catch (e) { /* ignore */ } };
  const addFav = () => { if (lawd && !favs.includes(lawd)) saveFavs([...favs, lawd]); };
  const removeFav = (c: string) => saveFavs(favs.filter(x => x !== c));
  const [ym, setYm] = useState(nowYM().replace('-', ''));
  const [rp, setRp] = useState<{ avgMan?: number | null; medianMan?: number | null; minMan?: number | null; maxMan?: number | null; p25Man?: number | null; p75Man?: number | null; outlierCount?: number; outlierLow?: number; outlierHigh?: number; medianPyeongMan?: number | null; pyeongMinMan?: number | null; pyeongMaxMan?: number | null; pyeongP25Man?: number | null; pyeongP75Man?: number | null; pyeongOutlierCount?: number; pyeongOutlierLow?: number; pyeongOutlierHigh?: number; count?: number; deals?: { apt: string; amountMan: number | null; areaM2: string; floor: string; date: string }[]; error?: string; loading?: boolean } | null>(null);
  const [avg, setAvg] = useState<{ avgMan?: number | null; medianMan?: number | null; minMan?: number | null; maxMan?: number | null; p25Man?: number | null; p75Man?: number | null; outlierCount?: number; outlierLow?: number; outlierHigh?: number; medianPyeongMan?: number | null; pyeongMinMan?: number | null; pyeongMaxMan?: number | null; pyeongP25Man?: number | null; pyeongP75Man?: number | null; pyeongOutlierCount?: number; pyeongOutlierLow?: number; pyeongOutlierHigh?: number; count?: number; perMonth?: { ym: string; count: number; avgMan: number | null; pyeongMan?: number | null }[]; error?: string; loading?: boolean } | null>(null);
  const REGION_ALL = LAWD_GROUPS.flatMap(g => g.items);
  const nameByLawd = (c: string) => (REGION_ALL.find(x => x.code === c)?.name) || c;
  const exportCsv = () => {
    if (!rp?.deals?.length) return;
    const rows = [...rp.deals].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    const head = ['아파트', '거래가(만원)', '전용면적(㎡)', '평', '평당(만원)', '층', '계약일'];
    const esc = (v: string) => /[",\n]/.test(v) ? '"' + v.replace(/"/g, '""') + '"' : v;
    const lines = [head.join(',')];
    for (const d of rows) {
      const a = parseM2(d.areaM2);
      const py = a != null ? (a / M2_PER_PY).toFixed(1) : '';
      const pp = pyeongPrice(d.amountMan, d.areaM2);
      lines.push([d.apt, d.amountMan ?? '', d.areaM2, py, pp ?? '', d.floor, d.date].map(x => esc(String(x))).join(','));
    }
    const csv = '\uFEFF' + lines.join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const el = document.createElement('a');
    el.href = url; el.download = `실거래가_${nameByLawd(lawd)}_${ym}.csv`; el.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const [cA, setCA] = useState('11110'); const [cB, setCB] = useState('11680'); const [cC, setCC] = useState('');
  const [cmp, setCmp] = useState<{ loading?: boolean; error?: string; rows?: { code: string; name: string; avgMan: number | null; medianMan: number | null; medianPyeongMan: number | null; count: number; perMonth?: { ym: string; pyeongMan?: number | null }[] }[] } | null>(null);
  const loadCompare = async () => {
    if (!proxy) { setCmp({ error: 'ai-proxy 주소를 먼저 입력하세요.' }); return; }
    const codes = [cA, cB, cC].filter(Boolean);
    if (codes.length < 2) { setCmp({ error: '비교할 지역을 2곳 이상 선택하세요.' }); return; }
    setCmp({ loading: true });
    try {
      const base = proxy.replace(/\/$/, '');
      const rows = await Promise.all(codes.map(async (code) => {
        const res = await fetch(`${base}/realprice_avg?lawd_cd=${code}&months=3${areaQS()}&key=${encodeURIComponent(accessKey())}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        return { code, name: nameByLawd(code), avgMan: j.avgMan ?? null, medianMan: j.medianMan ?? null, medianPyeongMan: j.medianPyeongMan ?? null, count: j.count ?? 0, perMonth: j.perMonth ?? [] };
      }));
      setCmp({ rows });
    } catch (e) {
      setCmp({ error: '비교 실패: ' + (e instanceof Error ? e.message : String(e)) });
    }
  };
  const loadAvg = async () => {
    if (!proxy) { setAvg({ error: 'ai-proxy 주소를 입력하세요.' }); return; }
    setAvg({ loading: true });
    try {
      const base = proxy.replace(/\/$/, '');
      const res = await fetch(`${base}/realprice_avg?lawd_cd=${lawd}&months=3${areaQS()}&key=${encodeURIComponent(accessKey())}`);
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      setAvg(await res.json());
    } catch (e) {
      setAvg({ error: '조회 실패: ' + (e instanceof Error ? e.message : String(e)) });
    }
  };
  const loadRealPrice = async () => {
    if (!proxy) { setRp({ error: 'ai-proxy 주소를 입력하세요 (예: https://xxx.onrender.com). 무료 인증키로 백엔드 실행이 필요해요.' }); return; }
    setRp({ loading: true });
    try {
      const base = proxy.replace(/\/$/, '');
      const res = await fetch(`${base}/realprice?lawd_cd=${lawd}&deal_ymd=${ym}${areaQS()}&key=${encodeURIComponent(accessKey())}`);
      if (!res.ok) throw new Error((await res.text()) || `HTTP ${res.status}`);
      setRp(await res.json());
    } catch (e) {
      setRp({ error: '조회 실패: ' + (e instanceof Error ? e.message : String(e)) + ' (백엔드 실행·무료 인증키·CORS 허용 확인)' });
    }
  };
  return <>
    <div className="pane-intro">💡 관심 지역의 <b>실제 거래가</b>를 확인해 왼쪽 <b>목표 주택가격</b>에 반영하세요. 정부·공공기관 <b>공식 데이터</b>만 사용합니다(광고·가공 없음).</div>

    <div className="card"><div className="ch"><span className="n">🏷️</span><h3>실제 시세·실거래가로 목표가 정하기</h3><Tip text="이 앱의 목표가는 직접 입력값이에요. 아래 공식 사이트에서 관심 지역의 실제 가격을 확인해 목표가에 반영하세요." /></div>
      <p className="tiny muted" style={{ margin: '-4px 0 10px' }}>아래는 <b>정부·공공기관 공식 데이터</b>예요(광고·가공 없음). 왼쪽 <b>지역</b>을 고르면 규제·취득세가 함께 반영돼요.</p>
      <div className="link-list">
        <a className="olink" href="https://rt.molit.go.kr" target="_blank" rel="noopener noreferrer"><b>국토부 실거래가 공개시스템</b><span>실제 <b>체결가</b>(신고 기준) · 아파트·연립·단독 매매/전월세 최신 조회</span></a>
        <a className="olink" href="https://kbland.kr" target="_blank" rel="noopener noreferrer"><b>KB부동산 시세</b><span>은행 <b>대출한도(LTV)</b>의 기준이 되는 시세</span></a>
        <a className="olink" href="https://www.reb.or.kr" target="_blank" rel="noopener noreferrer"><b>한국부동산원</b><span>공식 <b>가격지수·통계</b>(시장 동향)</span></a>
      </div>
      <div className="tiny muted" style={{ marginTop: 8 }}>확인한 실제 시세를 왼쪽 <b>목표 주택가격</b>에 넣으면 계산이 더 정확해져요.</div></div>

    <div className="card" style={{ marginTop: 16 }}><div className="ch"><span className="n">🔗</span><h3>실거래가 자동조회 (무료 · 실험적)</h3><Tip text="공공데이터포털 국토교통부 아파트 매매 실거래가(무료)를 백엔드(ai-proxy)로 불러옵니다. 무료 인증키 발급 + 백엔드 실행이 필요해요." /></div>
      <p className="tiny muted" style={{ margin: '-4px 0 10px' }}>공공데이터포털 <b>무료</b> API를 씁니다(일 1,000회). 브라우저 직접호출은 CORS로 막혀 <b>ai-proxy(서버)</b> 경유가 필요해요. 자세한 준비는 <b>docs/realprice-usage.md</b> 참고.</p>
      <div className="region-row" style={{ flexWrap: 'wrap' }}>
        <div className="f" style={{ flexBasis: '100%' }}><label>ai-proxy 주소</label><input type="text" placeholder="https://내서비스.onrender.com" value={proxy} onChange={e => setProxy(e.target.value)} /></div>
        <div className="f"><label>지역 선택</label><select value={lawd} onChange={e => setLawd(e.target.value)}>{LAWD_GROUPS.map(g => <optgroup key={g.sido} label={g.sido}>{g.items.map(x => <option key={x.code} value={x.code}>{x.name}</option>)}</optgroup>)}</select></div>
        <div className="f" style={{ minWidth: 0 }}><label>관심 지역 <span className="h">즐겨찾기</span></label>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center' }}>
            <button className="btn" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={addFav} disabled={favs.includes(lawd)} title="현재 지역을 즐겨찾기에 추가">⭐ 추가</button>
            {favs.length === 0 && <span className="tiny muted">자주 보는 지역을 추가해 빠르게 선택하세요.</span>}
            {favs.map(c => <span key={c} className="fav-chip"><button type="button" onClick={() => setLawd(c)} title="이 지역 선택">{nameByLawd(c)}</button><button type="button" className="x" onClick={() => removeFav(c)} aria-label="즐겨찾기 삭제">×</button></span>)}
          </div>
        </div>
        <div className="f"><label>법정동코드 <span className="h">직접</span></label><input type="text" value={lawd} onChange={e => setLawd(e.target.value)} /></div>
        <div className="f"><label>계약년월 <span className="h">YYYYMM</span></label><input type="text" value={ym} onChange={e => setYm(e.target.value)} /></div>
        <div className="f"><label>면적대 <span className="h">전용</span></label><select value={areaBand} onChange={e => setAreaBand(Number(e.target.value))}>{AREA_BANDS.map((b, i) => <option key={i} value={i}>{b.label}</option>)}</select></div>
        <div className="f"><label>단지명 <span className="h">부분일치</span></label><input type="text" value={aptQuery} onChange={e => setAptQuery(e.target.value)} placeholder="예: 래미안" /></div>
        <div className="f"><label>층수 <span className="h">저/중/고</span></label><select value={floorBand} onChange={e => setFloorBand(Number(e.target.value))}>{FLOOR_BANDS.map((b, i) => <option key={i} value={i}>{b.label}</option>)}</select></div>
      </div>
      <div style={{ marginTop: 10 }}><button className="btn accent" onClick={loadRealPrice} disabled={rp?.loading}>{rp?.loading ? '불러오는 중…' : '실거래가 불러오기'}</button>
        <span className="tiny muted" style={{ marginLeft: 8 }}>서울 외 지역 코드는 <a href="https://www.code.go.kr/stdcode/regCodeL.do" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--accent-ink)', fontWeight: 700 }}>code.go.kr</a>에서 확인</span></div>
      <div style={{ marginTop: 8 }}><button className="btn ink" onClick={loadAvg} disabled={avg?.loading}>{avg?.loading ? '집계 중…' : '📊 최근 3개월 평균으로 목표가 제안'}</button></div>
      {avg?.error && <div className="warn-note" style={{ marginTop: 10 }}>{avg.error}</div>}
      {avg && !avg.error && !avg.loading && <div style={{ marginTop: 12 }}>
        {avg.count ? <>
          <div className="mgoal"><span>최근 3개월 실거래가 ({avg.count}건) · <b style={{ color: 'var(--accent-ink)' }}>중앙값 {won(avg.medianMan || 0)}만</b></span><b>평균 {won(avg.avgMan || 0)}만원</b>
            <button className="btn accent" style={{ marginLeft: 'auto', padding: '5px 10px', fontSize: 12.5 }} onClick={() => setField('priceNow', String(avg.medianMan || avg.avgMan || 0))}>중앙값으로 제안</button></div>
          <div className="tiny muted" style={{ marginTop: 4 }}>이상치(초고가·초저가)에 덜 흔들리는 <b>중앙값</b>을 기본 제안으로 씁니다.</div>
          <DistBar min={avg.minMan} max={avg.maxMan} p25={avg.p25Man} p75={avg.p75Man} med={avg.medianMan} /><OutlierNote n={avg.outlierCount} low={avg.outlierLow} high={avg.outlierHigh} total={avg.count} />
          {avg.pyeongMinMan != null && <><div className="tiny muted" style={{ marginTop: 8 }}>평당가 분포</div><DistBar min={avg.pyeongMinMan} max={avg.pyeongMaxMan} p25={avg.pyeongP25Man} p75={avg.pyeongP75Man} med={avg.medianPyeongMan} /><OutlierNote n={avg.pyeongOutlierCount} low={avg.pyeongOutlierLow} high={avg.pyeongOutlierHigh} total={avg.count} /></>}
          <TrendMini pm={avg.perMonth} />
          <div className="tiny muted" style={{ marginTop: 6 }}>{avg.perMonth!.map(m => `${m.ym.slice(0, 4)}.${m.ym.slice(4)} ${m.count ? won(m.avgMan || 0) + '만(' + m.count + '건)' : '신고없음'}`).join(' · ')}</div>
          <div className="tiny muted" style={{ marginTop: 2 }}>신고지연을 감안해 <b>지난달부터 3개월</b>을 평균했어요. 단지·면적에 따라 편차가 크니, <b>면적대</b>를 좁혀 보면 더 정확해요.</div>
        </> : <div className="tiny muted">최근 3개월 신고 건이 없어요.</div>}
      </div>}
      <div style={{ marginTop: 16, paddingTop: 14, borderTop: '1px solid var(--line)' }}>
        <div style={{ fontWeight: 800, fontSize: 14.5, marginBottom: 4 }}>📊 지역 비교 (2~3곳)</div>
        <p className="tiny muted" style={{ margin: '0 0 8px' }}>여러 지역의 <b>최근 3개월</b> 시세를 비교해요(백엔드 필요). 지역마다 평형이 달라, <b>평당가</b>로 보면 더 공정하게 비교됩니다.</p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select value={cA} onChange={e => setCA(e.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '6px 8px', fontSize: 13 }}>{LAWD_GROUPS.map(g => <optgroup key={g.sido} label={g.sido}>{g.items.map(x => <option key={x.code} value={x.code}>{x.name}</option>)}</optgroup>)}</select>
          <select value={cB} onChange={e => setCB(e.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '6px 8px', fontSize: 13 }}>{LAWD_GROUPS.map(g => <optgroup key={g.sido} label={g.sido}>{g.items.map(x => <option key={x.code} value={x.code}>{x.name}</option>)}</optgroup>)}</select>
          <select value={cC} onChange={e => setCC(e.target.value)} style={{ border: '1px solid var(--line)', borderRadius: 8, padding: '6px 8px', fontSize: 13 }}><option value="">(선택 안 함)</option>{LAWD_GROUPS.map(g => <optgroup key={g.sido} label={g.sido}>{g.items.map(x => <option key={x.code} value={x.code}>{x.name}</option>)}</optgroup>)}</select>
          <button className="btn ink" style={{ padding: '6px 12px', fontSize: 13 }} onClick={loadCompare} disabled={cmp?.loading}>{cmp?.loading ? '비교 중…' : '지역 비교하기'}</button>
          {favs.length >= 2 && <button className="btn" style={{ padding: '6px 12px', fontSize: 13 }} onClick={() => { setCA(favs[0]); setCB(favs[1]); setCC(favs[2] || ''); }} title="즐겨찾기 상위 3곳으로 채우기">⭐ 즐겨찾기로 채우기</button>}
        </div>
        {cmp?.error && <div className="warn-note" style={{ marginTop: 10 }}>{cmp.error}</div>}
        {cmp?.rows && (() => {
          const valid = cmp.rows.filter(r => r.medianMan != null && r.count > 0);
          const lo = valid.length ? Math.min(...valid.map(r => r.medianMan!)) : null;
          const hi = valid.length ? Math.max(...valid.map(r => r.medianMan!)) : null;
          return <table className="tbl" style={{ marginTop: 10 }}><thead><tr><th>지역</th><th className="n">중앙값</th><th className="n">평당</th><th className="n">건수</th></tr></thead><tbody>
            {cmp.rows!.map(r => <tr key={r.code}><td>{r.name}</td><td className="n">{r.medianMan != null && r.count > 0 ? <span className={`rate ${r.medianMan === lo ? 'good' : r.medianMan === hi ? 'bad' : ''}`}>{won(r.medianMan)}만{r.medianMan === lo ? ' ↓최저' : r.medianMan === hi ? ' ↑최고' : ''}</span> : '신고없음'}</td><td className="n">{(() => { const pv = cmp.rows!.map(x => x.medianPyeongMan).filter((v): v is number => v != null && (cmp.rows!.find(z => z.medianPyeongMan === v)!.count > 0)); const plo = pv.length ? Math.min(...pv) : null; const phi = pv.length ? Math.max(...pv) : null; return r.medianPyeongMan != null && r.count > 0 ? <span className={`rate ${r.medianPyeongMan === plo ? 'good' : r.medianPyeongMan === phi ? 'bad' : ''}`}>{won(r.medianPyeongMan)}만{r.medianPyeongMan === plo ? ' ↓최저' : r.medianPyeongMan === phi ? ' ↑최고' : ''}</span> : '-'; })()}</td><td className="n">{r.count}</td></tr>)}
          </tbody></table>;
        })()}
        {cmp?.rows && cmp.rows.some(r => (r.perMonth || []).some(m => m.pyeongMan != null)) && <div style={{ marginTop: 12 }}>
          <div className="tiny muted" style={{ marginBottom: 6 }}>지역별 평당가 추이(오래된→최신, 만원)</div>
          {cmp.rows.filter(r => (r.perMonth || []).some(m => m.pyeongMan != null)).map(r => {
            const data = [...(r.perMonth || [])].reverse().map(m => m.pyeongMan).filter((v): v is number => v != null);
            if (data.length < 2) return null;
            const W = 150, H = 30, mn = Math.min(...data), mx = Math.max(...data);
            const xA = (i: number) => (i / (data.length - 1)) * (W - 4) + 2;
            const yA = (v: number) => H - 3 - (mx === mn ? 0.5 : (v - mn) / (mx - mn)) * (H - 8);
            const path = data.map((v, i) => `${i ? 'L' : 'M'}${xA(i).toFixed(1)},${yA(v).toFixed(1)}`).join(' ');
            return <div key={r.code} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
              <span className="tiny" style={{ width: 92, color: 'var(--ink-2)', fontWeight: 700 }}>{r.name}</span>
              <svg viewBox={`0 0 ${W} ${H}`} style={{ width: W, height: H }}><path d={path} fill="none" stroke="var(--brass)" strokeWidth={1.8} /><circle cx={xA(data.length - 1)} cy={yA(data[data.length - 1])} r={2.6} fill="var(--brass)" /></svg>
              <span className="tiny muted">{won(data[data.length - 1])}만</span>
            </div>;
          })}
        </div>}
      </div>
      {rp?.error && <div className="warn-note" style={{ marginTop: 10 }}>{rp.error}</div>}
      {rp && !rp.error && !rp.loading && <div style={{ marginTop: 12 }}>
        {rp.count ? <>
          <div className="mgoal"><span>이 달 실거래가 · <b style={{ color: 'var(--accent-ink)' }}>중앙값 {won(rp.medianMan || 0)}만</b>{(() => { const pps = rp.deals!.map(d => pyeongPrice(d.amountMan, d.areaM2)).filter((v): v is number => v != null); const mp = median(pps); return mp != null ? <> · 평당 <b>{won(mp)}만</b></> : null; })()}</span><b>평균 {won(rp.avgMan || 0)}만원</b>
            <button className="btn ink" style={{ marginLeft: 'auto', padding: '5px 10px', fontSize: 12.5 }} onClick={() => setField('priceNow', String(rp.medianMan || rp.avgMan || 0))}>중앙값 반영</button>
            <button className="btn" style={{ padding: '5px 10px', fontSize: 12.5 }} onClick={exportCsv} title="이 달 거래를 CSV로 저장">⬇ CSV</button></div>
          <DistBar min={rp.minMan} max={rp.maxMan} p25={rp.p25Man} p75={rp.p75Man} med={rp.medianMan} /><OutlierNote n={rp.outlierCount} low={rp.outlierLow} high={rp.outlierHigh} total={rp.count} />
          {rp.pyeongMinMan != null && <><div className="tiny muted" style={{ marginTop: 8 }}>평당가 분포</div><DistBar min={rp.pyeongMinMan} max={rp.pyeongMaxMan} p25={rp.pyeongP25Man} p75={rp.pyeongP75Man} med={rp.medianPyeongMan} /><OutlierNote n={rp.pyeongOutlierCount} low={rp.pyeongOutlierLow} high={rp.pyeongOutlierHigh} total={rp.count} /></>}
          <table className="tbl" style={{ marginTop: 10 }}><thead><tr><th>아파트</th><th className="n">거래가(만)</th><th className="n">전용(㎡·평)</th><th className="n">평당(만)</th><th className="n">층</th><th className="n">계약일</th></tr></thead><tbody>
            {[...rp.deals!].sort((a, b) => (b.date || '').localeCompare(a.date || '')).slice(0, 12).map((d, i) => (() => { const a = parseM2(d.areaM2); const py = a != null ? toPy(a) : null; const pp = pyeongPrice(d.amountMan, d.areaM2); return <tr key={i}><td>{d.apt}</td><td className="n">{d.amountMan != null ? won(d.amountMan) : '-'}</td><td className="n">{d.areaM2}{py != null ? ` · ${py.toFixed(1)}평` : ''}</td><td className="n">{pp != null ? won(pp) : '-'}</td><td className="n">{d.floor}</td><td className="n">{d.date}</td></tr>; })())}
          </tbody></table>
          <div className="tiny muted" style={{ marginTop: 6 }}>총 {rp.count}건 중 <b>최근 12건</b>(계약일 최신순) · 국토교통부 신고 실거래가(공공데이터포털)</div>
        </> : <div className="tiny muted">해당 월 신고 건이 없어요. 다른 달을 시도해 보세요.</div>}
      </div>}</div>
  </>;
}
