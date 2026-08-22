import type { FormRaw } from '../state/buildState.ts';
import { addMonths } from '../engines/util.ts';

export interface Preset { key: string; label: string; emoji: string; raw: Partial<FormRaw> }

/** 오늘(ym) 기준 상대 날짜로 프리셋 생성 */
export function buildPresets(today: string): Preset[] {
  const A = (m: number) => addMonths(today, m);
  return [
    { key: 'newlywed', label: '신혼부부', emoji: '💑', raw: {
      householdType: '부부', children: '0', childBirth: '', income: '7000', saving: '250',
      cash: '4000', stock: '2000', jeonse: '15000', jeonseEnd: A(24), retire: '1500',
      debtBal: '0', debtRate: '5.5', debtTerm: '36', priceNow: '50000', targetDate: '', growth: '2.5', mortRate: '4.2',
      homelessSince: '2016', acctOpen: '2018-03', dependents: '1', homeCount: '0',
      firstTime: true, regulated: false, tempTwoHome: false, growthCurve: '', rateCurve: '' } },
    { key: 'single', label: '사회초년생', emoji: '🧑‍💼', raw: {
      householdType: '1인', children: '0', childBirth: '', income: '4200', saving: '150',
      cash: '2000', stock: '1000', jeonse: '8000', jeonseEnd: A(14), retire: '800',
      debtBal: '1000', debtRate: '5.5', debtTerm: '24', priceNow: '32000', targetDate: '', growth: '2.5', mortRate: '4.2',
      homelessSince: '2021', acctOpen: '2021-06', dependents: '0', homeCount: '0',
      firstTime: true, regulated: false, tempTwoHome: false, growthCurve: '', rateCurve: '' } },
    { key: 'family', label: '아이 있는 3~4인', emoji: '👨‍👩‍👧', raw: {
      householdType: '부부+자녀', children: '2', childBirth: A(-16), income: '6500', saving: '220',
      cash: '3000', stock: '3000', jeonse: '12000', jeonseEnd: A(19), retire: '2000',
      debtBal: '1500', debtRate: '5.5', debtTerm: '36', priceNow: '52000', targetDate: '', growth: '2.5', mortRate: '4.2',
      homelessSince: '2009', acctOpen: '2011-04', dependents: '3', homeCount: '0',
      firstTime: true, regulated: false, tempTwoHome: false, growthCurve: '', rateCurve: '' } },
    { key: 'upgrade', label: '1주택 갈아타기', emoji: '🔁', raw: {
      householdType: '부부+자녀', children: '1', childBirth: '', income: '9000', saving: '300',
      cash: '8000', stock: '5000', jeonse: '0', jeonseEnd: A(12), retire: '3000',
      debtBal: '0', debtRate: '5.5', debtTerm: '36', priceNow: '90000', targetDate: '', growth: '2.5', mortRate: '4.2',
      homelessSince: '2015', acctOpen: '2015-01', dependents: '2', homeCount: '1',
      firstTime: false, regulated: true, tempTwoHome: true, growthCurve: '', rateCurve: '' } },
  ];
}
