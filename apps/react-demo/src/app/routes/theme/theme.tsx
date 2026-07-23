import { ReactNode, useMemo, useState } from 'react';
import { Chatbot, ChatbotTheme } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import { createThemeGalleryMessages } from '../../mocks/theme-gallery';
import styles from './theme.module.scss';

// Crazy first, and therefore selected on load: a preset that flips every color at once is the fastest
// way to spot a surface that is not following the theme. Default sits last as the neutral baseline.
const presets: { name: string; config: ChatbotTheme }[] = [
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
  {
    name: 'Default',
    config: {},
  },
];

export function Theme(): ReactNode {
  const [selectedPreset, setSelectedPreset] = useState<string>(presets[0].name);
  const [theme, setTheme] = useState<ChatbotTheme>(presets[0].config);
  const [showDockedPanels, setShowDockedPanels] = useState(true);

  // Rebuilt only when the docked panels are toggled: the creators mint nanoid message ids, so
  // regenerating on every render would churn the whole thread each time a preset button is clicked.
  const initMessages = useMemo(() => createThemeGalleryMessages(showDockedPanels), [showDockedPanels]);

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
      description="以主題設定調整 chatbot 外觀。對話串刻意塞滿所有可套主題的表面 —— 全部 message template、markdown / 程式碼、thinking、tool-call 群組（完成 / 執行中 / 失敗）、錯誤訊息，以及 docked 的任務清單與 subagent 面板 —— 這樣才看得出哪些地方沒跟著主題走。預設就開在 'Crazy'（一次翻掉所有顏色，最容易抓漏），'Default' 是對照用的基準。"
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

        <h3>Thread</h3>
        <label className={styles.toggle}>
          <input type="checkbox" checked={showDockedPanels} onChange={e => setShowDockedPanels(e.target.checked)} />
          顯示 docked 面板（Tasks / Subagents）
        </label>

        <h3>Current Theme Config</h3>
        <pre className={styles.themeCode}>{JSON.stringify(theme, null, 2)}</pre>
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          key={`${selectedPreset}-${showDockedPanels}`}
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
