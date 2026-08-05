// @vitest-environment jsdom
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { t } from '../../i18n';

/**
 * asgard-js-sdk#388 — the auth, error and drag-drop copy was hardcoded English in JSX and never went
 * through `t()`, so a `zh-TW` / `ja-JP` consumer got a mixed-language UI. Two things need pinning:
 * the literals must not come back, and the `en-US` catalog values must stay byte-identical to the
 * wording they replaced (FRONTEND_RULE_COMMON §5 — 對外文字不隨手改寫).
 */

const CHATBOT_DIR = join(__dirname);

/** The exact strings that used to sit in JSX, keyed by the catalog entry that now owns them. */
const MIGRATED_WORDING: Record<string, string> = {
  'auth.loading': 'Loading...',
  'auth.enterKey': 'Enter your key',
  'auth.invalidKey': 'Please check if the key is correct.',
  'error.generic': 'Something went wrong. Please try again later.',
  'error.serviceUnavailable':
    'The service is currently unavailable. Please contact the service representative for assistance.',
  'error.serviceNotFound': 'We couldn’t find the service. Please contact the service representative for assistance.',
  'dropZone.hint': 'Drop files here',
  // Found by this spec's own literal scan while fixing #388: ApiKeyInput's remaining copy was hardcoded
  // too, so a zh-TW consumer saw a Chinese shell around an English key form. Same defect, same file.
  'auth.title': 'Preview',
  'auth.keyLabel': 'Key',
  'auth.showPassword': 'Show password',
  'auth.hidePassword': 'Hide password',
  'auth.continue': 'Continue',
};

/** Every source file under `components/chatbot/`, tests and styles excluded. */
function sourceFiles(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const full = join(dir, entry.name);

    if (entry.isDirectory()) return sourceFiles(full);

    return (entry.name.endsWith('.tsx') || entry.name.endsWith('.ts')) && !entry.name.includes('.spec.') ? [full] : [];
  });
}

describe('#388 migrated strings', () => {
  it('keeps the en-US wording byte-identical to the literals it replaced', () => {
    for (const [key, wording] of Object.entries(MIGRATED_WORDING)) {
      expect(t('en-US', key), `${key} changed wording`).toBe(wording);
    }
  });

  it('resolves each key in every locale, with no fallback to the raw key', () => {
    for (const locale of ['en-US', 'ja-JP', 'zh-TW'] as const) {
      for (const key of Object.keys(MIGRATED_WORDING)) {
        const value = t(locale, key);

        expect(value, `${locale} / ${key} is missing`).not.toBe(key);
        expect(value.trim(), `${locale} / ${key} is blank`).not.toBe('');
      }
    }
  });

  /**
   * The literal is the regression: someone re-adding `placeholder="Enter your key"` would keep the
   * catalog green while putting English back on a zh-TW consumer's screen.
   */
  it('leaves none of those literals in the chatbot source', () => {
    const offenders: string[] = [];

    for (const file of sourceFiles(CHATBOT_DIR)) {
      const src = readFileSync(file, 'utf-8');

      for (const wording of Object.values(MIGRATED_WORDING)) {
        const escaped = wording.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        // Only a real string literal or a JSX text node counts. A bare `includes` would flag `apiKey`
        // for `Key` and any prose comment mentioning the old wording.
        const asLiteral = new RegExp(`['"\`]${escaped}['"\`]|>\\s*${escaped}\\s*<`);

        if (asLiteral.test(src)) offenders.push(`${file.replace(CHATBOT_DIR, '')}: ${wording}`);
      }
    }

    expect(offenders, 'these must resolve through t() instead').toEqual([]);
  });
});
