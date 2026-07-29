import { ReactNode, useCallback, useEffect, useRef, useState } from 'react';
import { Chatbot, ChatbotRef, useAsgardContext } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import { createTextTemplateExample } from '../../mocks/messages';
import styles from './render-footer.module.scss';

const QUICK_PROMPTS = ['Hello from menu', 'What is Asgard?', 'Tell me a joke'];

function CustomFooter(): ReactNode {
  const { sendMessage, isConnecting, pendingInputValue, setPendingInputValue, inputPlaceholder } = useAsgardContext();
  const [value, setValue] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (pendingInputValue === null) return;

    setValue(pendingInputValue);
    setPendingInputValue(null);
    textareaRef.current?.focus();
  }, [pendingInputValue, setPendingInputValue]);

  const isPreview = !sendMessage;
  const trimmed = value.trim();
  const disabled = isPreview || isConnecting || !trimmed;

  const submit = useCallback((): void => {
    if (isPreview || isConnecting) return;

    const text = value.trim();

    if (!text) return;

    sendMessage?.({ text });
    setValue('');
  }, [isPreview, isConnecting, value, sendMessage]);

  return (
    <div className={styles.footer}>
      <textarea
        ref={textareaRef}
        className={styles.textarea}
        placeholder={inputPlaceholder ?? 'Type a message...'}
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) {
            e.preventDefault();
            submit();
          }
        }}
        disabled={isPreview}
        rows={1}
      />
      <button type="button" className={styles.sendButton} onClick={submit} disabled={disabled}>
        Send
      </button>
    </div>
  );
}

// BUILD-034 — this route is also the regression case for heimdall-pm#200: a consumer that takes the footer
// over with `renderFooter` must still get the run seam, which used to live inside the ChatbotFooter this
// prop replaces. It runs against the local `/mock-asgard` stream on the `run-indicator-demo` channel (the
// same ~10s scripted run F-003 uses) rather than a real endpoint, so the seam is observable for long enough
// to check that it sweeps for the whole run and stops at run.done — and so the route works with no `.env`.
const config = {
  botProviderEndpoint: `${typeof window !== 'undefined' ? window.location.origin : ''}/mock-asgard`,
};

export function RenderFooter(): ReactNode {
  const chatbotRef = useRef<ChatbotRef>(null);
  const initMessages = [createTextTemplateExample()];

  const handlePromptClick = useCallback((prompt: string): void => {
    chatbotRef.current?.setInputValue?.(prompt);
  }, []);

  const startRun = useCallback((): void => {
    chatbotRef.current?.serviceContext?.sendMessage?.({ text: '開始一段多訊息 run' });
  }, []);

  return (
    <DemoWrapper
      title="Render Footer"
      description="Demonstrates renderFooter prop. The default ChatbotFooter is fully replaced by a minimal custom textarea + Send button that talks to useAsgardContext(). Click a quick prompt (in renderMenu) to verify pendingInputValue is forwarded into the custom textarea via ChatbotRef.setInputValue. 「開始 run」送出一段約 10 秒的 run：交界的進度線應整段持續流動、run.done 才熄 —— 自訂 footer 不該讓 run indicator 消失（heimdall-pm#200 / BUILD-034）。"
    >
      <div className={styles.controls}>
        <button type="button" className={styles.startButton} onClick={startRun}>
          開始 run（約 10 秒）
        </button>
      </div>
      <div className={styles.chatbotContainer}>
        <Chatbot
          ref={chatbotRef}
          title="Render Footer Demo"
          config={config}
          customChannelId="run-indicator-demo"
          initMessages={initMessages}
          renderMenu={() => (
            <div className={styles.menu}>
              {QUICK_PROMPTS.map(prompt => (
                <button
                  key={prompt}
                  type="button"
                  className={styles.menuItem}
                  onClick={() => handlePromptClick(prompt)}
                >
                  {prompt}
                </button>
              ))}
            </div>
          )}
          renderFooter={() => <CustomFooter />}
        />
      </div>
    </DemoWrapper>
  );
}
