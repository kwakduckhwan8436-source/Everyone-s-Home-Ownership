import { useStore } from '../state/store.ts';
import { Tip } from './Tooltip.tsx';

interface Base { id: string; label: string; hint?: string; tip?: string }
type NumProps = Base & { type?: 'number'; step?: string; slider?: { min: number; max: number; step: number } };
type TextProps = Base & { type: 'text' | 'month'; placeholder?: string };
type SelectProps = Base & { type: 'select'; options: string[] };

export function Field(p: NumProps | TextProps | SelectProps) {
  const formRaw = useStore(s => s.formRaw);
  const setField = useStore(s => s.setField);
  const val = formRaw[p.id];
  const labelEl = (
    <label>{p.label}{p.hint && <span className="h">{p.hint}</span>}{p.tip && <Tip text={p.tip} />}</label>
  );
  if (p.type === 'select') {
    return <div className="f"><label>{p.label}</label>
      <select aria-label={p.label} value={String(val)} onChange={e => setField(p.id, e.target.value)}>{p.options.map(o => <option key={o}>{o}</option>)}</select></div>;
  }
  if (p.type === 'text' || p.type === 'month') {
    return <div className="f wide">{labelEl}
      <input type={p.type} aria-label={p.label} value={String(val ?? '')} placeholder={p.placeholder} onChange={e => setField(p.id, e.target.value)} /></div>;
  }
  const np = p as NumProps;
  const slider = np.slider;
  return <div className={slider ? 'f wide' : 'f'}>{labelEl}
    <input className="n" type="number" aria-label={p.label} step={np.step} value={String(val ?? '')} onChange={e => setField(p.id, e.target.value)} />
    {slider && <input className="rng" type="range" min={slider.min} max={slider.max} step={slider.step}
      value={Number(val) || 0} onChange={e => setField(p.id, e.target.value)} />}
  </div>;
}

export function Check({ id, label }: { id: string; label: string }) {
  const formRaw = useStore(s => s.formRaw);
  const setField = useStore(s => s.setField);
  return <label><input type="checkbox" checked={!!formRaw[id]} onChange={e => setField(id, e.target.checked)} /> {label}</label>;
}
