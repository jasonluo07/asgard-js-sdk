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

  it('colors accent-backed surfaces when set, without moving the primary text tier', () => {
    const theme = resolveTheme({
      chatbot: {
        primaryComponent: { mainColor: '#f6c814', secondaryColor: '#ffffff', onMainColor: '#000000' },
      },
    });

    expect(theme.template?.ButtonMessageTemplate?.button?.style.color).toBe('#000000');
    expect(theme.template?.CarouselMessageTemplate?.card?.button?.style.color).toBe('#000000');
    expect(theme.template?.quickReplies?.button?.style.color).toBe('#000000');
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
