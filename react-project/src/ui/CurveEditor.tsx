import { useRef, useState } from 'react';
import { useStore } from '../state/store.ts';

/** 드래그로 연도별 곡선을 그리는 편집기 (값 → "5,4,3" CSV로 입력필드에 반영) */
export function CurveEditor({ id, min, max, def, years = 6 }: { id: string; min: number; max: number; def: number; years?: number }) {
  const formRaw = useStore(s => s.formRaw);
  const setField = useStore(s => s.setField);
  const svgRef = useRef<SVGSVGElement>(null);
  const drag = useRef(-1);
  const W = 300, H = 110, pad = { l: 8, r: 8, t: 10, b: 18 };
  const iw = W - pad.l - pad.r, ih = H - pad.t - pad.b;

  const parse = (): number[] => {
    const cur = String(formRaw[id] || '').trim();
    let v = cur ? cur.split(',').map(x => Number(x.trim())).filter(x => !Number.isNaN(x)) : [];
    while (v.length < years) v.push(v.length ? v[v.length - 1] : def);
    return v.slice(0, years);
  };
  const [vals, setVals] = useState<number[]>(parse);
  const X = (i: number) => pad.l + (years === 1 ? 0 : i / (years - 1) * iw);
  const Y = (v: number) => pad.t + ih - ((v - min) / (max - min)) * ih;
  const toVal = (e: { clientY: number }) => {
    const r = svgRef.current!.getBoundingClientRect();
    const y = (e.clientY - r.top) / r.height * H;
    return Math.max(min, Math.min(max, Math.round((min + (pad.t + ih - y) / ih * (max - min)) * 10) / 10));
  };
  const commit = (v: number[]) => setField(id, v.join(','));
  const pts = vals.map((v, i) => [X(i), Y(v)] as const);
  const pl = pts.map((p, i) => `${i ? 'L' : 'M'}${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' ');
  const grid = [0, 1, 2].map(k => { const vv = min + (max - min) * k / 2, y = Y(vv); return (
    <g key={k}><line x1={pad.l} y1={y} x2={W - pad.r} y2={y} stroke="var(--line-2)" /><text className="lbl" x={pad.l} y={y - 2}>{vv.toFixed(0)}%</text></g>); });
  return (
    <div className="ced"><svg ref={svgRef} viewBox={`0 0 ${W} ${H}`} width="100%"
      onPointerMove={e => { if (drag.current < 0) return; const nv = [...vals]; nv[drag.current] = toVal(e); setVals(nv); }}
      onPointerUp={() => { if (drag.current >= 0) { drag.current = -1; commit(vals); } }}
      onPointerLeave={() => { drag.current = -1; }}>
      {grid}<path className="pl" d={pl} />
      {pts.map((p, i) => <circle key={i} className="pt" cx={p[0].toFixed(1)} cy={p[1].toFixed(1)} r={7}
        onPointerDown={e => { drag.current = i; (e.target as Element).setPointerCapture?.(e.pointerId); }} />)}
      {vals.map((_, i) => <text key={'l' + i} className="lbl" x={X(i)} y={H - 5} textAnchor="middle">+{i}년</text>)}
    </svg></div>
  );
}
