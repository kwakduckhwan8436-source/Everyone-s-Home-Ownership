import { useState, useRef, useEffect } from 'react';

/** 탭하면 뜨는 말풍선 툴팁 (모바일 대응) */
export function Tip({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener('click', close);
    return () => document.removeEventListener('click', close);
  }, [open]);
  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex' }}>
      <button className="tip" onClick={(e) => { e.stopPropagation(); setOpen(o => !o); }} aria-label={"도움말: " + text}>?</button>
      {open && (
        <span style={{ position: 'absolute', bottom: '150%', left: '50%', transform: 'translateX(-50%)', zIndex: 100,
          maxWidth: 260, width: 'max-content', background: 'var(--ink)', color: '#fff', fontSize: 13, lineHeight: 1.5,
          padding: '10px 13px', borderRadius: 11, boxShadow: 'var(--shadow-lg)', fontWeight: 400 }}>{text}</span>
      )}
    </span>
  );
}
