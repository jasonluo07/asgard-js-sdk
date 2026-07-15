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
];
