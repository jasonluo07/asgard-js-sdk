// @vitest-environment jsdom
import { ReactNode, useContext, useRef } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from 'vitest';
import { AsgardServiceContext, AsgardServiceContextValue } from '../../../context/asgard-service-context';
import { AsgardTemplateContextProvider } from '../../../context/asgard-template-context';
import { FileDropContextProvider } from '../../../context/file-drop-context';
import { Locale, t } from '../../../i18n';
import { ChatComposer } from './chat-composer';

/**
 * F-028 — the next-turn suggestion is offered as the composer's placeholder and adopted with Tab.
 * The rules that matter are all about *not* getting in the way: the suggestion never paints over text
 * the user has written, Tab keeps its native focus-move behavior unless there is genuinely something
 * to adopt, and adopting is not sending.
 */

/**
 * Renders the composer with the real context default (so a field added later is inherited rather than
 * silently missing) plus the overrides a case needs. `sendMessage` is always supplied — without it the
 * composer is in preview mode and disables the textarea.
 */
function Harness({
  override,
  locale = 'en-US',
}: {
  override: Partial<AsgardServiceContextValue>;
  locale?: Locale;
}): ReactNode {
  const base = useContext(AsgardServiceContext);
  const footerRef = useRef<HTMLDivElement | null>(null);

  return (
    <AsgardServiceContext.Provider value={{ ...base, sendMessage: vi.fn(), ...override }}>
      <AsgardTemplateContextProvider locale={locale}>
        <FileDropContextProvider>
          <div ref={footerRef}>
            <ChatComposer enableUpload={false} enableDocumentUpload={false} footerRef={footerRef} />
          </div>
        </FileDropContextProvider>
      </AsgardTemplateContextProvider>
    </AsgardServiceContext.Provider>
  );
}

function mount(override: Partial<AsgardServiceContextValue>, locale?: Locale): HTMLTextAreaElement {
  render(<Harness override={override} locale={locale} />);

  return screen.getByRole('textbox') as HTMLTextAreaElement;
}

/** `fireEvent` returns false when a handler called `preventDefault()` — i.e. the key was intercepted. */
function pressTab(el: HTMLElement, init: { shiftKey?: boolean } = {}): boolean {
  return !fireEvent.keyDown(el, { key: 'Tab', ...init });
}

const SUGGESTION = '接著幫我加上退款流程';

// The composer watches its container to cap the textarea's growth; jsdom has no ResizeObserver.
beforeAll(() => {
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe(): void {
        return undefined;
      }
      unobserve(): void {
        return undefined;
      }
      disconnect(): void {
        return undefined;
      }
    },
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
});

afterEach(cleanup);

describe('F-028 composer — offering the suggestion', () => {
  it('R1: shows the suggestion plus the ⇥ Tab hint while the textarea is empty', () => {
    const textarea = mount({ promptSuggestion: SUGGESTION });

    expect(textarea.placeholder).toBe(`${SUGGESTION} ⇥ Tab`);
  });

  it('R3: with no suggestion, the consumer placeholder is rendered untouched', () => {
    const textarea = mount({ inputPlaceholder: '輸入你的問題' });

    expect(textarea.placeholder).toBe('輸入你的問題');
    expect(textarea.placeholder).not.toContain('⇥');
  });

  it('R3: with no suggestion and no consumer placeholder, the existing default is unchanged', () => {
    expect(mount({}).placeholder).toBe('Enter message');
  });

  it('R4: a suggestion yields to text the user has already typed', () => {
    const textarea = mount({ promptSuggestion: SUGGESTION, inputPlaceholder: '輸入你的問題' });

    fireEvent.change(textarea, { target: { value: '我自己想問的' } });

    expect(textarea.placeholder).toBe('輸入你的問題');
  });

  it('R7: exposes the full explanation on title and aria-description only while offering', () => {
    const offered = mount({ promptSuggestion: SUGGESTION });

    expect(offered.getAttribute('title')).toBe('Press Tab to use this suggestion');
    expect(offered.getAttribute('aria-description')).toBe('Press Tab to use this suggestion');

    cleanup();

    const idle = mount({});

    expect(idle.getAttribute('title')).toBeNull();
    expect(idle.getAttribute('aria-description')).toBeNull();
  });

  it('R12: renders the hint and explanation in the active locale', () => {
    const textarea = mount({ promptSuggestion: SUGGESTION }, 'zh-TW');

    expect(textarea.placeholder).toBe(`${SUGGESTION} ⇥ Tab`);
    expect(textarea.getAttribute('title')).toBe('按 Tab 採用這句建議');
  });

  it('R12: the ⇥ Tab hint is identical in every locale — Tab is a keycap legend, not prose', () => {
    for (const locale of ['en-US', 'ja-JP', 'zh-TW'] as const) {
      expect(t(locale, 'composer.suggestionHint')).toBe('⇥ Tab');
      expect(t(locale, 'composer.suggestionTitle')).not.toBe('composer.suggestionTitle');
    }
  });
});

describe('F-028 composer — the Tab key', () => {
  it('R2: adopts the suggestion into the textarea without sending it', () => {
    const sendMessage = vi.fn();
    const clearPromptSuggestion = vi.fn();
    const textarea = mount({ promptSuggestion: SUGGESTION, sendMessage, clearPromptSuggestion });

    expect(pressTab(textarea)).toBe(true);
    expect(textarea.value).toBe(SUGGESTION);
    expect(sendMessage).not.toHaveBeenCalled();
    expect(clearPromptSuggestion).toHaveBeenCalledTimes(1);
  });

  it('R2: the adopted text stays editable', () => {
    const textarea = mount({ promptSuggestion: SUGGESTION });

    pressTab(textarea);
    fireEvent.change(textarea, { target: { value: `${SUGGESTION}，順便說明期限` } });

    expect(textarea.value).toBe(`${SUGGESTION}，順便說明期限`);
  });

  it('R3: with nothing to adopt, Tab keeps its native focus-move behavior', () => {
    const textarea = mount({ inputPlaceholder: '輸入你的問題' });

    expect(pressTab(textarea)).toBe(false);
    expect(textarea.value).toBe('');
  });

  it('R4: with text already typed, Tab is not intercepted and never overwrites it', () => {
    const clearPromptSuggestion = vi.fn();
    const textarea = mount({ promptSuggestion: SUGGESTION, clearPromptSuggestion });

    fireEvent.change(textarea, { target: { value: '我自己想問的' } });

    expect(pressTab(textarea)).toBe(false);
    expect(textarea.value).toBe('我自己想問的');
    expect(clearPromptSuggestion).not.toHaveBeenCalled();
  });

  it('R5: Shift+Tab is never intercepted, so focus can move backwards', () => {
    const textarea = mount({ promptSuggestion: SUGGESTION });

    expect(pressTab(textarea, { shiftKey: true })).toBe(false);
    expect(textarea.value).toBe('');
  });

  it('R6: a Tab during IME composition belongs to the input method', () => {
    const clearPromptSuggestion = vi.fn();
    const textarea = mount({ promptSuggestion: SUGGESTION, clearPromptSuggestion });

    fireEvent.compositionStart(textarea);

    expect(pressTab(textarea)).toBe(false);
    expect(textarea.value).toBe('');
    expect(clearPromptSuggestion).not.toHaveBeenCalled();
  });

  /**
   * Regression: the adopt used to size the textarea inside the keydown handler, which reads the DOM
   * *before* React commits the new value — a multi-line suggestion was therefore left clipped to one
   * row with `overflow: hidden`, invisible and unscrollable. Measured in a headed browser as
   * clientHeight 36px against scrollHeight 108px. jsdom reports 0 for every layout property, so
   * `scrollHeight` is stubbed as a function of the content to make the ordering observable.
   */
  it('R2: sizes the box to the adopted text, not to the empty box it replaced', () => {
    const scrollHeight = Object.getOwnPropertyDescriptor(HTMLElement.prototype, 'scrollHeight');

    Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', {
      configurable: true,
      get(this: HTMLTextAreaElement): number {
        return 36 + this.value.length * 6;
      },
    });

    try {
      const long = '把三個通路的回購率與客單價一起拉出來，並按週比較過去六週的走勢';
      const textarea = mount({ promptSuggestion: long });

      pressTab(textarea);

      expect(textarea.style.height).toBe(`${36 + long.length * 6}px`);
    } finally {
      // `scrollHeight` is declared readonly, so restore it through Reflect rather than `delete`.
      if (scrollHeight) Object.defineProperty(HTMLTextAreaElement.prototype, 'scrollHeight', scrollHeight);
      else Reflect.deleteProperty(HTMLTextAreaElement.prototype, 'scrollHeight');
    }
  });

  it('R2: after adopting, the offer is gone — a second Tab moves focus instead', () => {
    const textarea = mount({ promptSuggestion: SUGGESTION });

    pressTab(textarea);

    // The store clear is the provider's job; here the textarea is no longer empty, which is the other
    // half of the same guard — either way Tab must stop being swallowed.
    expect(pressTab(textarea)).toBe(false);
  });
});

describe('F-028 composer — staying out of the way', () => {
  it('R3: an awaiting-consent composer keeps its own placeholder, not the suggestion', () => {
    const textarea = mount({
      promptSuggestion: SUGGESTION,
      pendingConsent: { processId: 'proc-1' } as AsgardServiceContextValue['pendingConsent'],
    });

    expect(textarea.placeholder).toBe(t('en-US', 'composer.awaitingConsent'));
    expect(pressTab(textarea)).toBe(false);
  });

  it('R3: preview mode (no sendMessage) never offers a suggestion', () => {
    render(
      <PreviewHarness>
        <span />
      </PreviewHarness>,
    );

    const textarea = screen.getByRole('textbox') as HTMLTextAreaElement;

    expect(textarea.placeholder).toBe('Preview mode - input disabled');
    expect(textarea.getAttribute('title')).toBeNull();
  });
});

/** Preview mode is defined by the absence of `sendMessage`, so it cannot go through `Harness`. */
function PreviewHarness({ children }: { children: ReactNode }): ReactNode {
  const base = useContext(AsgardServiceContext);
  const footerRef = useRef<HTMLDivElement | null>(null);

  return (
    <AsgardServiceContext.Provider value={{ ...base, promptSuggestion: SUGGESTION, sendMessage: undefined }}>
      <AsgardTemplateContextProvider locale="en-US">
        <FileDropContextProvider>
          <div ref={footerRef}>
            <ChatComposer enableUpload={false} enableDocumentUpload={false} footerRef={footerRef} />
            {children}
          </div>
        </FileDropContextProvider>
      </AsgardTemplateContextProvider>
    </AsgardServiceContext.Provider>
  );
}
