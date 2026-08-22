import { useState } from 'react';
import { useStore } from '../state/store.ts';
import { REGIONS, isRegulated } from '../data/regions.ts';

export function RegionPicker() {
  const setField = useStore(s => s.setField);
  const [sido, setSido] = useState('');
  const [gugun, setGugun] = useState('');
  const list = sido ? REGIONS[sido] : [];
  const pending = sido === '경기' && !gugun;
  const reg = isRegulated(sido, gugun);

  const onSido = (v: string) => { setSido(v); setGugun(''); if (v !== '경기') setField('regulated', v === '서울'); };
  const onGugun = (v: string) => { setGugun(v); setField('regulated', isRegulated(sido, v)); };

  return <div className="f wide">
    <label>지역 <span className="h">주소로 규제·취득세 자동 반영</span></label>
    <div className="region-row">
      <select value={sido} onChange={e => onSido(e.target.value)}><option value="">시/도 선택</option>{Object.keys(REGIONS).map(k => <option key={k}>{k}</option>)}</select>
      <select value={gugun} onChange={e => onGugun(e.target.value)}><option value="">{list.length ? '시/군/구' : '—'}</option>{list.map(x => <option key={x}>{x}</option>)}</select>
    </div>
    {sido && !pending && <div className={`reg-note on ${reg ? 'reg' : 'free'}`}>
      {reg
        ? <><b>{sido} {gugun} · 조정대상지역+투기과열지구</b><br />취득세 <b>2주택 8%·3주택+ 12%</b> 중과, 주담대 <b>LTV 50%</b> 상한, 청약 규제 강화가 자동 반영됩니다.</>
        : <><b>{sido}{gugun && !gugun.startsWith('전 지역') ? ' ' + gugun : ''} · 비규제지역</b><br />취득세 <b>3주택까지 표준(1~3%)</b>, 주담대 <b>LTV 70%</b>. (다주택 중과는 3주택 8%·4주택+ 12%)</>}
    </div>}
  </div>;
}
