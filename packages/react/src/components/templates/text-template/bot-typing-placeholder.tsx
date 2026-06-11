import { ReactNode, useMemo } from 'react';
import { BotTypingBox } from './bot-typing-box';
import { useAsgardContext } from '../../../context/asgard-service-context';

interface BotTypingPlaceholderProps {
  placeholder: string;
}

export function BotTypingPlaceholder(props: BotTypingPlaceholderProps): ReactNode {
  const { placeholder } = props;

  const { isConnecting, messages, pendingConsent } = useAsgardContext();

  const { hasTypingMessage, lastMessageIsCompletedBot } = useMemo(() => {
    const all = Array.from(messages?.values() ?? []);
    const last = all[all.length - 1];

    return {
      hasTypingMessage: all.some(message => message.type === 'bot' && message.isTyping),
      // A finished bot message as the latest entry means the bot has delivered
      // its answer; the run can linger briefly afterwards (the backend keeps it
      // open between `message.complete` and `run.done`), so suppress the
      // placeholder to stop it flashing under the already-rendered answer.
      // Tool-call messages are intentionally NOT treated this way — after a tool
      // runs the bot is still working toward its reply, so the indicator must
      // keep showing while we wait for it (otherwise the chat looks frozen).
      lastMessageIsCompletedBot: last?.type === 'bot' && !last.isTyping,
    };
  }, [messages]);

  // `isConnecting` only signals that an SSE run is open, not that the bot is
  // producing output. Show the indicator whenever genuinely waiting for the
  // bot's next output (including after a consent reply, while tools run), but
  // not behind an open consent modal, not while a message is already streaming,
  // and not once the bot has finished its reply.
  if (isConnecting && !hasTypingMessage && !pendingConsent && !lastMessageIsCompletedBot) {
    return <BotTypingBox isTyping typingText={placeholder} />;
  }

  return null;
}
