import type { FallbackRender } from '@sentry/react';

export const ApplicationErrorFallback: FallbackRender = ({ resetError }) => (
  <main style={{ minHeight: '100vh', display: 'grid', placeItems: 'center', padding: '24px', background: '#f8fafc' }}>
    <section role="alert" style={{ width: 'min(560px, 100%)', padding: '24px', borderRadius: '16px', border: '1px solid #fecaca', background: '#fff', boxShadow: '0 12px 32px rgba(15, 23, 42, 0.08)' }}>
      <p style={{ margin: '0 0 6px', color: '#b91c1c', fontWeight: 800, textTransform: 'uppercase', fontSize: '12px', letterSpacing: '0.08em' }}>Application error</p>
      <h1 style={{ margin: '0 0 10px', color: '#0f172a', fontSize: '28px' }}>This page could not continue safely.</h1>
      <p style={{ margin: '0 0 18px', color: '#475569', lineHeight: 1.6 }}>The error has been recorded. Retry the page; if it happens again, contact your platform administrator.</p>
      <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
        <button type="button" onClick={resetError} style={{ border: 0, borderRadius: '10px', padding: '10px 14px', background: '#2563eb', color: '#fff', fontWeight: 800, cursor: 'pointer' }}>Try again</button>
        <button type="button" onClick={() => window.location.reload()} style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '10px 14px', background: '#fff', color: '#334155', fontWeight: 800, cursor: 'pointer' }}>Reload application</button>
      </div>
    </section>
  </main>
);
