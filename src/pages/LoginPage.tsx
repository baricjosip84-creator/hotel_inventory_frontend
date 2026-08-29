import { useEffect, useState } from 'react';
import type { CSSProperties, FormEvent } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { InventoryBrand } from '../components/brand/InventoryBrand';
import { LanguageSelector } from '../components/i18n/LanguageSelector';
import { useAppTranslation } from '../i18n/I18nContext';
import { apiRequest, ApiError, restoreTenantSession } from '../lib/api';
import { saveAuthTokens } from '../lib/auth';
import type { AuthTokens } from '../types/auth';

function useCompact(breakpoint = 920) {
  const [compact, setCompact] = useState(() => window.innerWidth <= breakpoint);
  useEffect(() => {
    const update = () => setCompact(window.innerWidth <= breakpoint);
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [breakpoint]);
  return compact;
}

function Feature({ glyph, title, text }: { glyph: string; title: string; text: string }) {
  return <div style={styles.feature}><div style={styles.featureIcon}>{glyph}</div><div><div style={styles.featureTitle}>{title}</div><div style={styles.featureText}>{text}</div></div></div>;
}

export function LoginPage() {
  const { t } = useAppTranslation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const location = useLocation();
  const compact = useCompact();
  const skip = Boolean((location.state as { skipSessionRecovery?: boolean } | null)?.skipSessionRecovery);

  useEffect(() => {
    if (skip) return;
    let active = true;
    void restoreTenantSession().then((token) => {
      if (active && token) navigate('/dashboard', { replace: true });
    }).catch(() => {});
    return () => { active = false; };
  }, [navigate, skip]);

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const response = await apiRequest<AuthTokens>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: email.trim(), password })
      });
      saveAuthTokens(response);
      navigate('/dashboard');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : t('tenantLogin.errorFallback', 'Login failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ ...styles.page, ...(compact ? styles.pageCompact : {}) }}>
      <div style={{ ...styles.shell, ...(compact ? styles.shellCompact : {}) }}>
        <section aria-label={t('tenantLogin.aria', 'Inventory Operations platform')} style={{ ...styles.brandPanel, ...(compact ? styles.brandPanelCompact : {}) }}>
          <InventoryBrand tone="dark" />
          <div>
            <div style={styles.kicker}>{t('tenantLogin.kicker')}</div>
            <h1 style={{ ...styles.hero, ...(compact ? styles.heroCompact : {}) }}>{t('tenantLogin.hero')}</h1>
            <p style={styles.heroText}>{t('tenantLogin.heroText')}</p>
          </div>
          {!compact ? <div style={styles.features}>
            <Feature glyph="□" title={t('tenantLogin.featureInventoryTitle')} text={t('tenantLogin.featureInventoryText')} />
            <Feature glyph="↔" title={t('tenantLogin.featureWorkflowTitle')} text={t('tenantLogin.featureWorkflowText')} />
            <Feature glyph="↗" title={t('tenantLogin.featureVisibilityTitle')} text={t('tenantLogin.featureVisibilityText')} />
          </div> : null}
          <div style={styles.brandFooter}>{t('tenantLogin.footer')}</div>
        </section>
        <section style={{ ...styles.loginPanel, ...(compact ? styles.loginPanelCompact : {}) }}>
          <div style={styles.loginCard}>
            <div style={styles.languageRow}><LanguageSelector scope="local" compact /></div>
            <div style={styles.eyebrow}>{t('tenantLogin.eyebrow')}</div>
            <h2 style={styles.title}>{t('tenantLogin.title')}</h2>
            <p style={styles.subtitle}>{t('tenantLogin.subtitle')}</p>
            {error ? <div role="alert" style={styles.error}><strong>{t('tenantLogin.errorTitle')}</strong><div>{error}</div></div> : null}
            <form onSubmit={submit} style={styles.form} data-auth-form="true">
              <label style={styles.field}><span style={styles.label}>{t('tenantLogin.email')}</span><input id="login-email" type="email" placeholder={t('tenantLogin.emailPlaceholder')} value={email} onChange={(e) => setEmail(e.target.value)} style={styles.input} autoComplete="email" required /></label>
              <label style={styles.field}><span style={styles.label}>{t('tenantLogin.password')}</span><input id="login-password" type="password" placeholder={t('tenantLogin.passwordPlaceholder')} value={password} onChange={(e) => setPassword(e.target.value)} style={styles.input} autoComplete="current-password" required /></label>
              <button type="submit" disabled={busy} style={{ ...styles.button, ...(busy ? styles.disabled : {}) }}>{busy ? t('tenantLogin.signingIn') : t('tenantLogin.signIn')}</button>
            </form>
            <div style={styles.help}>{t('tenantLogin.help')}</div>
          </div>
        </section>
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {page:{minHeight:'100dvh',padding:24,display:'grid',placeItems:'center',background:'linear-gradient(145deg,#eef4ff 0%,#f8fafc 46%,#fff 100%)',color:'#0f172a'},pageCompact:{padding:0,placeItems:'stretch'},shell:{width:'100%',maxWidth:1180,minHeight:680,display:'grid',gridTemplateColumns:'minmax(0,.95fr) minmax(420px,.8fr)',border:'1px solid #e2e8f0',borderRadius:18,overflow:'hidden',background:'#fff',boxShadow:'0 28px 70px rgba(15,23,42,.12)'},shellCompact:{minHeight:'100dvh',gridTemplateColumns:'1fr',border:'none',borderRadius:0,boxShadow:'none'},brandPanel:{padding:'44px 48px',color:'#fff',background:'radial-gradient(circle at 12% 18%,rgba(37,99,235,.28),transparent 30%),linear-gradient(155deg,#081220 0%,#0f2749 52%,#0b1b32 100%)',display:'flex',flexDirection:'column',gap:42},brandPanelCompact:{padding:'26px 24px',gap:24,minHeight:250},kicker:{color:'#93c5fd',fontSize:12,fontWeight:800,letterSpacing:'.06em',textTransform:'uppercase',marginBottom:12},hero:{margin:0,fontSize:40,lineHeight:1.08,letterSpacing:'-.035em',fontWeight:800,maxWidth:540},heroCompact:{fontSize:30},heroText:{margin:'16px 0 0',color:'rgba(255,255,255,.72)',fontSize:15,lineHeight:1.7,maxWidth:520},features:{display:'grid',gap:18},feature:{display:'grid',gridTemplateColumns:'42px 1fr',gap:14},featureIcon:{width:42,height:42,borderRadius:12,display:'grid',placeItems:'center',color:'#bfdbfe',border:'1px solid rgba(147,197,253,.25)',background:'rgba(37,99,235,.14)',fontSize:20,fontWeight:800},featureTitle:{fontSize:14,fontWeight:800},featureText:{marginTop:4,color:'rgba(255,255,255,.60)',fontSize:13,lineHeight:1.55},brandFooter:{marginTop:'auto',color:'rgba(255,255,255,.42)',fontSize:12,fontWeight:600},loginPanel:{display:'grid',placeItems:'center',padding:48,background:'#fff'},loginPanelCompact:{padding:'34px 22px 42px'},loginCard:{width:'100%',maxWidth:410},languageRow:{display:'flex',justifyContent:'flex-end',marginBottom:18},eyebrow:{color:'#2563eb',fontWeight:800,fontSize:12,textTransform:'uppercase',letterSpacing:'.08em',marginBottom:10},title:{margin:0,fontSize:28,lineHeight:1.15,letterSpacing:'-.025em'},subtitle:{margin:'10px 0 26px',color:'#64748b',fontSize:14},form:{display:'grid',gap:17},field:{display:'grid',gap:7},label:{color:'#334155',fontSize:13,fontWeight:700},input:{width:'100%',height:44,padding:'0 13px',border:'1px solid #cbd5e1',borderRadius:9,background:'#fff',color:'#0f172a',outline:'none'},button:{width:'100%',height:44,border:'1px solid #2563eb',borderRadius:9,background:'#2563eb',color:'#fff',fontWeight:800,marginTop:2,boxShadow:'0 8px 18px rgba(37,99,235,.18)'},disabled:{opacity:.58,cursor:'not-allowed'},help:{borderTop:'1px solid #e2e8f0',marginTop:26,paddingTop:18,textAlign:'center',color:'#64748b',fontSize:12.5},error:{marginBottom:18,border:'1px solid #fecaca',borderRadius:9,background:'#fef2f2',color:'#991b1b',padding:'12px 13px',fontSize:13,display:'grid',gap:3}};
