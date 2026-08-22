import { A2_PROMPT } from './prompts.ts';
import { collectAllowedNumbers, findFlagged } from './guard.ts';

export interface AiResult { text: string; flagged: string[]; ok: boolean; }

/**
 * 해설 요청. 정적 배포에선 키 노출·CORS 때문에 본인 프록시(FastAPI 등)를 경유한다.
 * endpoint 가 비면 전송 페이로드만 문자열로 돌려준다.
 */
export async function explain(endpoint: string, data: unknown): Promise<AiResult> {
  const allowed = collectAllowedNumbers(data);
  if (!endpoint) {
    const payload = JSON.stringify({ system: A2_PROMPT, data }, null, 2);
    return { text: `// 전송 페이로드 (본인 프록시로 POST)\n${payload}`, flagged: [], ok: true };
  }
  const resp = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ system: A2_PROMPT, data }),
  });
  if (!resp.ok) throw new Error('HTTP ' + resp.status);
  const j = await resp.json();
  const text: string = j.text ?? j.content?.[0]?.text ?? j.completion ?? JSON.stringify(j);
  const flagged = findFlagged(text, allowed);
  return { text, flagged, ok: flagged.length === 0 };
}
