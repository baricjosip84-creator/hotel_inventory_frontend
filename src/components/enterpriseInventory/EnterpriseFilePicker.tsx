import type { ChangeEvent, RefObject } from 'react';
import { useAppTranslation } from '../../i18n/I18nContext';
import { styles } from './EnterpriseInventoryStyles';

type Props = {
  fileInputRef: RefObject<HTMLInputElement | null>;
  file: File | null;
  accept: string;
  disabled: boolean;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  detail?: string;
};

/** Keep the browser's native file chooser; replace only its inconsistent visible control. */
export function EnterpriseFilePicker({ fileInputRef, file, accept, disabled, onChange, detail }: Props) {
  const { ui } = useAppTranslation();
  return (
    <div style={{ ...styles.field, marginBottom: 8, minWidth: 200 }}>
      <span style={styles.label}>{ui('File')}</span>
      <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: 10, minWidth: 0 }}>
        <input
          ref={fileInputRef}
          type="file"
          accept={accept}
          disabled={disabled}
          tabIndex={-1}
          aria-hidden="true"
          style={{ display: 'none' }}
          onChange={onChange}
        />
        <button
          type="button"
          data-skip-global-action-feedback="true"
          disabled={disabled}
          style={disabled ? styles.disabledButton : { ...styles.secondaryButton, marginTop: 0 }}
          onClick={() => fileInputRef.current?.click()}
        >
          {ui('Choose file')}
        </button>
        <span
          role="status"
          aria-live="polite"
          title={file?.name}
          style={{ ...styles.helper, minWidth: 0, overflowWrap: 'anywhere' }}
        >
          {file ? <>{file.name}{detail ? ` · ${detail}` : ''}</> : ui('No file selected')}
        </span>
      </div>
    </div>
  );
}
