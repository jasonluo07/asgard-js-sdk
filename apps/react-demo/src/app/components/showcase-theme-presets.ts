import { ChatbotTheme } from '@asgard-js/react';

// Mirrors the /theme route's presets — Default + one "Crazy" preset that flips every theme color at once
// — so the all-features showcase can sanity-check that the theme (including the primary color) propagates
// across every rendered feature. Relies on the SDK wiring `primaryComponent.mainColor` → the
// `--asg-color-primary` CSS variable (so the run indicator / input / chrome theme too).
export interface ShowcaseThemePreset {
  name: string;
  config: ChatbotTheme;
}

export const SHOWCASE_THEME_PRESETS: ShowcaseThemePreset[] = [
  { name: 'Default', config: {} },
  {
    name: 'Crazy',
    config: {
      chatbot: {
        backgroundColor: '#3c1d3b',
        borderColor: '#92ff8c',
        inactiveColor: '#ff00e6',
        primaryComponent: {
          mainColor: '#ff0000',
          secondaryColor: '#aba400',
        },
      },
      botMessage: {
        color: '#00f0ff',
        backgroundColor: '#ff7a00',
        carouselButtonBackgroundColor: '#00622a',
      },
      userMessage: {
        color: '#522801',
        backgroundColor: '#060081',
      },
    },
  },
  {
    // Mirrors the Heimdall product's dark design tokens — the same values the Heimdall chatbot
    // extension ships (`asgard-auto-post-chatbot-extension`, webview theme), so this preset shows
    // how the SDK actually looks in a real consumer rather than in a synthetic palette.
    //   --primary #f6c814 (brand gold) · --primary-dark #ae8d0e
    //   --background #141414 · --border #434343 · --foreground #fafafa
    // Useful for debugging the muted tier: `inactiveColor` drives both --asg-color-text-secondary
    // and --asg-color-action-inactive, so chevrons, tool-call variant icons, timestamps and the
    // "N 個步驟" summary all take the dimmed gold here instead of Crazy's magenta.
    name: 'Heimdall',
    config: {
      chatbot: {
        backgroundColor: '#141414',
        borderColor: '#434343',
        inactiveColor: '#ae8d0e',
        primaryComponent: {
          mainColor: '#f6c814',
          secondaryColor: '#fafafa',
        },
      },
      userMessage: {
        backgroundColor: '#f6c814',
        color: '#000000',
      },
    },
  },
];
