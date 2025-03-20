import { ReactNode, useMemo } from 'react';
import { BotTypingBox } from './bot-typing-box';
import { useAsgardContext } from 'src/context/asgard-service-context';

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

  if (isConnecting && !hasTypingMessage)
    return <BotTypingBox isTyping typingText={placeholder} />;

  return null;
}
