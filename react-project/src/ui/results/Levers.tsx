import { useStore } from '../../state/store.ts';

export function Levers({ activeId, onPreview }: { activeId: string | null; onPreview: (id: string) => void }) {
  const report = useStore(s => s.report);
  if (!report) return null;
  const levers = report.levers, maxSave = Math.max(1, ...levers.map(l => Math.abs(l.monthsSaved)));
  return <div className="lev-grid">
    {levers.slice(0, 6).map((l, i) => {
      const pos = l.monthsSaved > 0, cls = pos ? 'pos' : (l.monthsSaved < 0 ? 'neg' : 'zero');
      return <button key={l.id} className={`lev${activeId === l.id ? ' on' : ''}`} onClick={() => onPreview(l.id)}>
        <div className="top"><span className="rk">{i + 1}</span><span className="nm">{l.name}</span>
          <span className={`sv ${cls}`}>{pos ? '−' : (l.monthsSaved < 0 ? '+' : '')}{Math.abs(l.monthsSaved)}개월</span></div>
        <div className="bar"><i style={{ width: `${Math.abs(l.monthsSaved) / maxSave * 100}%` }} /></div>
        <div className="ds">{l.desc}</div>
      </button>;
    })}
  </div>;
}
