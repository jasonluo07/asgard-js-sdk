import { useState, FormEvent, ChangeEvent, type ReactNode } from 'react';
import clsx from 'clsx';
import { useAsgardThemeContext } from '../../../context/asgard-theme-context';
import { useAsgardContext } from '../../../context/asgard-service-context';
import { useAsgardTemplateContext } from '../../../context/asgard-template-context';
import { Locale, t } from '../../../i18n';
import { ProfileIcon } from '../profile-icon';
import EyeSvg from '../../../icons/eye.svg?react';
import EyeOffSvg from '../../../icons/eye-off.svg?react';
import styles from './api-key-input.module.scss';

export interface ApiKeyInputProps {
  onSubmit: (apiKey: string) => void | Promise<void>;
  loading?: boolean;
  error?: string;
  /** Defaults to the catalog's `auth.enterKey`. */
  placeholder?: string;
  /** Defaults to the catalog's `auth.title`. */
  title?: string;
  /**
   * UI language for this component's own copy. Takes priority over the surrounding
   * `AsgardTemplateContext`, and is **required** when `<Chatbot>` renders this: the
   * non-authenticated path deliberately mounts without a template provider (it skips the
   * service provider to avoid opening SSE), so context alone always resolves `en-US` (#391).
   */
  locale?: Locale;
  showToggle?: boolean;
  className?: string;
}

export function ApiKeyInput({
  onSubmit,
  loading = false,
  error,
  placeholder,
  title,
  locale,
  showToggle = true,
  className,
}: ApiKeyInputProps): ReactNode {
  const [apiKey, setApiKey] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { chatbot } = useAsgardThemeContext();
  const { avatar } = useAsgardContext();
  const { locale: contextLocale = 'en-US' } = useAsgardTemplateContext();
  const activeLocale = locale ?? contextLocale;
  const resolvedPlaceholder = placeholder ?? t(activeLocale, 'auth.enterKey');
  const resolvedTitle = title ?? t(activeLocale, 'auth.title');

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault();
    if (apiKey.trim() && !loading) {
      onSubmit(apiKey.trim());
    }
  };

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>): void => {
    setApiKey(e.target.value);
  };

  const togglePasswordVisibility = (): void => {
    setShowPassword(!showPassword);
  };

  return (
    <div
      className={clsx(styles.api_key_input, className)}
      style={{
        backgroundColor: chatbot.backgroundColor,
        borderColor: chatbot.borderColor,
      }}
    >
      <div className={styles.api_key_input__header}>
        <ProfileIcon avatar={avatar} />
        <h2 className={styles.api_key_input__title} style={chatbot?.header?.title?.style}>
          {resolvedTitle}
        </h2>
      </div>

      <form onSubmit={handleSubmit} className={styles.api_key_input__form}>
        <div>
          <label className={styles.api_key_input__label}>{t(activeLocale, 'auth.keyLabel')}</label>
          <div className={styles.api_key_input__input_wrapper}>
            <input
              type={showPassword ? 'text' : 'password'}
              value={apiKey}
              onChange={handleInputChange}
              placeholder={resolvedPlaceholder}
              className={clsx(styles.api_key_input__input, {
                [styles['api_key_input__input--error']]: error,
                [styles['api_key_input__input--disabled']]: loading,
              })}
              disabled={loading}
              autoComplete="off"
            />
            {showToggle && (
              <button
                type="button"
                onClick={togglePasswordVisibility}
                className={styles.api_key_input__toggle_button}
                disabled={loading}
                aria-label={t(activeLocale, showPassword ? 'auth.hidePassword' : 'auth.showPassword')}
              >
                {showPassword ? (
                  <EyeOffSvg className={styles.api_key_input__toggle_icon} />
                ) : (
                  <EyeSvg className={styles.api_key_input__toggle_icon} />
                )}
              </button>
            )}
          </div>
          {error && <div className={styles.api_key_input__error_message}>{error}</div>}
        </div>

        <button
          type="submit"
          disabled={!apiKey.trim() || loading}
          className={styles.api_key_input__submit_button}
          style={{
            backgroundColor: chatbot?.mainColor,
            color: chatbot?.secondaryColor,
          }}
        >
          {t(activeLocale, loading ? 'auth.loading' : 'auth.continue')}
        </button>
      </form>
    </div>
  );
}
