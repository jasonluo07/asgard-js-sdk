import { ReactNode, useMemo } from 'react';
import { BotTypingBox } from './bot-typing-box';
import { useAsgardContext } from '../../../context/asgard-service-context';

interface BotTypingPlaceholderProps {
  placeholder: string;
}

export function BotTypingPlaceholder(
  props: BotTypingPlaceholderProps
): ReactNode {
  const { placeholder } = props;

  const { isConnecting, messages } = useAsgardContext();

  const hasTypingMessage = useMemo(
    () =>
      Array.from(messages?.values() ?? []).some(
        (message) => message.type === 'bot' && message.isTyping
      ),
    [messages]
  );

  const hasCompleteBotMessage = useMemo(
    () => {
      const allMessages = Array.from(messages?.values() ?? []);
      const lastBotMessage = allMessages
        .filter((message) => message.type === 'bot')
        .pop();
      return lastBotMessage && !lastBotMessage.isTyping;
    },
    [messages]
  );

  if (isConnecting && !hasTypingMessage && !hasCompleteBotMessage)
    return <BotTypingBox isTyping typingText={placeholder} />;

  return null;
}
