import { renderToStaticMarkup } from 'react-dom/server';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  AsgardThemeContextProvider,
  useAsgardThemeContext,
  type AsgardThemeContextValue,
} from './asgard-theme-context';

let captured: AsgardThemeContextValue | null = null;

function ThemeProbe(): null {
  captured = useAsgardThemeContext();

  return null;
}

function resolveTheme(theme?: Partial<AsgardThemeContextValue>): AsgardThemeContextValue {
  renderToStaticMarkup(
    <AsgardThemeContextProvider theme={theme}>
      <ThemeProbe />
    </AsgardThemeContextProvider>,
  );

  if (!captured) throw new Error('theme context was not captured');

  return captured;
}

function chatbotVars(theme: AsgardThemeContextValue): Record<string, string> {
  return (theme.chatbot?.style ?? {}) as Record<string, string>;
}

describe('primaryComponent.onMainColor', () => {
  beforeEach(() => {
    captured = null;
  });

  it('falls back to secondaryColor when unset, keeping the pre-onMainColor behavior', () => {
    const theme = resolveTheme({
      chatbot: {
        primaryComponent: { mainColor: '#f6c814', secondaryColor: '#ffffff' },
      },
    });

    expect(theme.template?.ButtonMessageTemplate?.button?.style.color).toBe('#ffffff');
    expect(theme.template?.CarouselMessageTemplate?.card?.button?.style.color).toBe('#ffffff');
    expect(theme.template?.quickReplies?.button?.style.color).toBe('#ffffff');
    expect(theme.template?.AttachmentMessageTemplate?.iconBox?.style.color).toBe('#ffffff');
  });

  it('colors accent-backed surfaces when set, without moving text on non-accent surfaces', () => {
    const theme = resolveTheme({
      chatbot: {
        primaryComponent: { mainColor: '#f6c814', secondaryColor: '#ffffff', onMainColor: '#000000' },
      },
    });

    expect(theme.template?.ButtonMessageTemplate?.button?.style.color).toBe('#000000');
    expect(theme.template?.CarouselMessageTemplate?.card?.button?.style.color).toBe('#000000');
    // Quick replies sit on the translucent bot-message surface, not on mainColor.
    expect(theme.template?.quickReplies?.button?.style.color).toBe('#ffffff');
    expect(theme.template?.AttachmentMessageTemplate?.iconBox?.style.color).toBe('#000000');

    // The text tier stays on secondaryColor — that is the whole point of the split.
    expect(chatbotVars(theme)['--asg-color-text-primary']).toBe('#ffffff');
  });

  it('publishes --asg-color-primary-on-primary only when onMainColor is given', () => {
    const withField = resolveTheme({
      chatbot: {
        primaryComponent: { mainColor: '#f6c814', secondaryColor: '#ffffff', onMainColor: 'var(--primary-foreground)' },
      },
    });
    const withoutField = resolveTheme({
      chatbot: {
        primaryComponent: { mainColor: '#f6c814', secondaryColor: '#ffffff' },
      },
    });

    expect(chatbotVars(withField)['--asg-color-primary-on-primary']).toBe('var(--primary-foreground)');
    expect(chatbotVars(withoutField)).not.toHaveProperty('--asg-color-primary-on-primary');
  });

  it('leaves accent-backed surfaces untouched when neither field is given', () => {
    const theme = resolveTheme({ chatbot: { primaryComponent: { mainColor: '#f6c814' } } });

    expect(theme.template?.ButtonMessageTemplate?.button?.style.color).toBeUndefined();
    expect(chatbotVars(theme)).not.toHaveProperty('--asg-color-primary-on-primary');
  });
});

/**
 * BUILD-039 (asgard-sdk-pm#31 defect 3) — these eight `--asgard-*` custom properties were read by SCSS
 * but never written by the provider, so they always resolved to a hardcoded fallback that no theme could
 * reach. Every one of those fallbacks is dark-only (a blue link, a near-white text, washes of white),
 * so a light-themed chatbot rendered them unreadable.
 *
 * The other nine phantom names from that audit are deliberately NOT wired: their fallback chains already
 * pass through `--asg-color-*` (e.g. `var(--asgard-consent-modal-bg, var(--asg-color-surface, #1f1f1f))`),
 * so they follow the theme today and writing them would be redundant.
 */
describe('phantom --asgard-* tokens', () => {
  beforeEach(() => {
    captured = null;
  });

  it('derives the link, on-accent, inset and wash tokens from the matching theme fields', () => {
    const vars = chatbotVars(
      resolveTheme({
        chatbot: {
          backgroundColor: '#101014',
          borderColor: '#2a2a33',
          primaryComponent: { mainColor: '#f6c814', secondaryColor: '#ffffff', onMainColor: '#000000' },
        },
      }),
    );

    expect(vars['--asgard-markdown-link']).toBe('#f6c814');
    expect(vars['--asgard-markdown-link-hover']).not.toBe('#f6c814');
    expect(vars['--asgard-consent-modal-primary-fg']).toBe('#000000');
    expect(vars['--asgard-consent-modal-code-bg']).toBe('#101014');
    expect(vars['--asgard-consent-modal-code-border']).toBe('#2a2a33');
    expect(vars['--asgard-json-viewer-text']).toBe('color-mix(in srgb, #ffffff 83%, transparent)');
    expect(vars['--asgard-thinking-reasoning']).toBe('color-mix(in srgb, #ffffff 80%, transparent)');
    expect(vars['--asgard-tool-call-hover']).toBe('color-mix(in srgb, #ffffff 10%, transparent)');
  });

  it('writes none of them for an unthemed chatbot, so every SCSS fallback stays in effect', () => {
    const vars = chatbotVars(resolveTheme());

    for (const token of [
      '--asgard-markdown-link',
      '--asgard-markdown-link-hover',
      '--asgard-consent-modal-primary-fg',
      '--asgard-consent-modal-code-bg',
      '--asgard-consent-modal-code-border',
      '--asgard-json-viewer-text',
      '--asgard-thinking-reasoning',
      '--asgard-tool-call-hover',
    ]) {
      expect(vars).not.toHaveProperty(token);
    }
  });

  it('keeps the two inset tokens off when the theme passes a var() through, not a concrete color', () => {
    const vars = chatbotVars(
      resolveTheme({
        chatbot: { backgroundColor: 'var(--host-bg)', borderColor: 'var(--host-border)' },
      }),
    );

    expect(vars).not.toHaveProperty('--asgard-consent-modal-code-bg');
    expect(vars).not.toHaveProperty('--asgard-consent-modal-code-border');
  });
});
