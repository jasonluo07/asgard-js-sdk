// @vitest-environment jsdom
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { AsgardTemplateContextProvider } from '../../../context/asgard-template-context';
import { Chatbot } from '../chatbot';
import { ApiKeyInput } from './api-key-input';
import { t } from '../../../i18n';

/**
 * asgard-js-sdk#391 — `<Chatbot locale="zh-TW">` left half of the API-key screen in English.
 * `ApiKeyInput` resolved its copy from `useAsgardTemplateContext()`, but it only ever renders on the
 * non-authenticated path, which deliberately mounts without a service *or* template provider (it skips
 * the service provider so no SSE connection opens). Context therefore always returned the `en-US`
 * default, no matter what the consumer passed.
 *
 * That same design is what makes this testable without any SSE plumbing: `authState="needApiKey"`
 * mounts a plain tree.
 */

const CONFIG = { botProviderEndpoint: 'https://example.invalid/ns/x/bot-provider/y' } as const;

/** Strings ApiKeyInput renders itself — the half that #391 left untranslated. */
const selfRendered = (locale: 'en-US' | 'ja-JP' | 'zh-TW'): string[] => [
  t(locale, 'auth.keyLabel'),
  t(locale, 'auth.continue'),
];

describe('#391 ApiKeyInput follows the locale it is given', () => {
  afterEach(cleanup);

  it('renders the whole key screen in the locale passed to <Chatbot>', () => {
    render(<Chatbot authState="needApiKey" locale="zh-TW" config={CONFIG} customChannelId="c1" />);

    for (const text of selfRendered('zh-TW')) {
      expect(screen.getByText(text), `missing zh-TW string: ${text}`).toBeTruthy();
    }

    expect(screen.getByPlaceholderText(t('zh-TW', 'auth.enterKey'))).toBeTruthy();
  });

  it('localizes the invalid-key screen too', () => {
    render(<Chatbot authState="invalidApiKey" locale="zh-TW" config={CONFIG} customChannelId="c2" />);

    for (const text of selfRendered('zh-TW')) {
      expect(screen.getByText(text), `missing zh-TW string: ${text}`).toBeTruthy();
    }

    expect(screen.getByText(t('zh-TW', 'auth.invalidKey'))).toBeTruthy();
  });

  it('falls back to en-US when <Chatbot> is given no locale', () => {
    render(<Chatbot authState="needApiKey" config={CONFIG} customChannelId="c3" />);

    for (const text of selfRendered('en-US')) {
      expect(screen.getByText(text), `missing en-US string: ${text}`).toBeTruthy();
    }
  });

  /** The AC7-style standalone use — no prop, so the surrounding context must still win. */
  it('still reads the template context when used standalone without the prop', () => {
    render(
      <AsgardTemplateContextProvider locale="ja-JP">
        <ApiKeyInput onSubmit={(): void => undefined} />
      </AsgardTemplateContextProvider>,
    );

    for (const text of selfRendered('ja-JP')) {
      expect(screen.getByText(text), `missing ja-JP string: ${text}`).toBeTruthy();
    }
  });

  /** An explicit prop beats the context — that ordering is what fixes #391. */
  it('lets the prop override the surrounding context', () => {
    render(
      <AsgardTemplateContextProvider locale="ja-JP">
        <ApiKeyInput onSubmit={(): void => undefined} locale="zh-TW" />
      </AsgardTemplateContextProvider>,
    );

    for (const text of selfRendered('zh-TW')) {
      expect(screen.getByText(text), `missing zh-TW string: ${text}`).toBeTruthy();
    }
  });
});
