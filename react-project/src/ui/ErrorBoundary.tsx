import { Component, type ReactNode } from 'react';

/** 렌더 중 예외를 잡아 화면에 표시 (블랙 화면 방지 + 자가 진단) */
export class ErrorBoundary extends Component<{ children: ReactNode }, { err: Error | null }> {
  constructor(p: { children: ReactNode }) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err: Error) { return { err }; }
  componentDidCatch(err: Error) { console.error('[모두의내집마련] 렌더 오류:', err); }
  render() {
    if (this.state.err) {
      return (
        <div style={{ padding: 28, fontFamily: 'system-ui, sans-serif', maxWidth: 760, margin: '0 auto' }}>
          <h2 style={{ color: '#bf4d33' }}>화면을 그리는 중 오류가 발생했어요</h2>
          <p style={{ color: '#475569' }}>아래 메시지를 캡처해서 알려주시면 바로 고칠 수 있어요.</p>
          <pre style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word', background: '#fbe9e7', border: '1px solid #f0c4bb', padding: 14, borderRadius: 10, fontSize: 13, lineHeight: 1.5 }}>
            {String(this.state.err.stack || this.state.err.message || this.state.err)}
          </pre>
        </div>
      );
    }
    return this.props.children;
  }
}
