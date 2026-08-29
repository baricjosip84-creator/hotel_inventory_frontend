import type { CSSProperties } from 'react';
import { useAppTranslation } from '../i18n/I18nContext';

const START_YEAR = 2025;

export default function CopyrightNotice() {
  const { ui } = useAppTranslation();
  const currentYear = new Date().getFullYear();
  const yearLabel = currentYear > START_YEAR ? `${START_YEAR}–${currentYear}` : `${START_YEAR}`;

  return (
    <footer aria-label={ui('Copyright notice')} style={styles.notice}>
      © {yearLabel} Josip Barić. {ui('All rights reserved.')}
    </footer>
  );
}

const styles: Record<string, CSSProperties> = {
  notice: {
    padding: '18px 24px 22px',
    color: '#64748b',
    fontSize: '12px',
    lineHeight: 1.5,
    textAlign: 'center',
    flexShrink: 0
  }
};
