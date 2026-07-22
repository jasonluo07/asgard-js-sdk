import { ReactNode, useState } from 'react';
import { Chatbot, ChatbotTheme } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import {
  createTextTemplateExample,
  createButtonTemplateExample,
  createCarouselTemplateExample,
  createAttachmentTemplateExample,
} from '../../mocks/messages';
import styles from './theme.module.scss';

const presets: { name: string; config: ChatbotTheme }[] = [
  {
    name: 'Default',
    config: {},
  },
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

export function Theme(): ReactNode {
  const [selectedPreset, setSelectedPreset] = useState<string>('Default');
  const [theme, setTheme] = useState<ChatbotTheme>(presets[0].config);

  const initMessages = [
    createTextTemplateExample(),
    createButtonTemplateExample(),
    createCarouselTemplateExample(),
    createAttachmentTemplateExample(),
  ];

  // Same big-layout treatment as /all-features-wide: the <Chatbot> fills the remaining content area
  // instead of a narrow 420px card, so wide-layout templates (carousel, table, tool-call blocks) are
  // actually reviewable when judging a theme. The width/height override is layout-only and is kept out
  // of the `theme` state so "Current Theme Config" keeps showing the preset as authored.
  const layoutTheme: ChatbotTheme = {
    ...theme,
    chatbot: { ...theme.chatbot, width: '100%', height: '100%' },
  };

  const handlePresetChange = (presetName: string): void => {
    const preset = presets.find(p => p.name === presetName);
    if (preset) {
      setSelectedPreset(presetName);
      setTheme(preset.config);
    }
  };

  return (
    <DemoWrapper
      title="Theme Customization"
      description="Customize the chatbot appearance with theme configuration. Try the 'Crazy' preset to see all theme options in action."
    >
      <div className={styles.controls}>
        <h3>Presets</h3>
        <div className={styles.presets}>
          {presets.map(preset => (
            <button
              key={preset.name}
              className={`${styles.presetButton} ${selectedPreset === preset.name ? styles.active : ''}`}
              onClick={() => handlePresetChange(preset.name)}
            >
              {preset.name}
            </button>
          ))}
        </div>

        <h3>Current Theme Config</h3>
        <pre className={styles.themeCode}>{JSON.stringify(theme, null, 2)}</pre>
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          key={selectedPreset}
          title="Theme Demo"
          config={{ botProviderEndpoint: 'skip' }}
          customChannelId="theme-demo"
          initMessages={initMessages}
          theme={layoutTheme}
        />
      </div>
    </DemoWrapper>
  );
}
