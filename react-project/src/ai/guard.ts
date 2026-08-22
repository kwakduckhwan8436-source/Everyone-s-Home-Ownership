// 숫자 guard — AI 응답에 엔진 결과에 없는 숫자가 섞였는지 검증
export function collectAllowedNumbers(obj: unknown): Set<string> {
  const set = new Set<string>();
  const s = JSON.stringify(obj);
  (s.match(/\d[\d.]*/g) ?? []).forEach(x => set.add(x.replace(/\.$/, '')));
  return set;
}

export function findFlagged(text: string, allowed: Set<string>): string[] {
  const found = text.match(/\d[\d,]*\.?\d*/g) ?? [];
  return [...new Set(
    found.map(x => x.replace(/,/g, '').replace(/\.$/, ''))
      .filter(x => x.length > 1 && !allowed.has(x)),
  )];
}
