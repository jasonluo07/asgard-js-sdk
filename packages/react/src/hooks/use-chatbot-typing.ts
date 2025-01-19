import { Message } from '@asgard-js/core';
import { useCallback, useState } from 'react';

export interface UseChatbotTypingReturn {
  isTyping: boolean;
  displayText: string | null;
  startTyping: () => void;
  onTyping: (message: Message) => void;
  stopTyping: () => void;
}

export function useChatbotTyping(): UseChatbotTypingReturn {
  const [isTyping, setIsTyping] = useState(false);
  const [displayText, setDisplayText] = useState<string | null>(null);

  const startTyping = useCallback(() => {
    setIsTyping(true);
  }, []);

  const onTyping = useCallback((message: Message) => {
    setDisplayText((prev) => (prev ?? '') + message.text);
  }, []);

  const stopTyping = useCallback(() => {
    setIsTyping(false);
    setDisplayText(null);
  }, []);

  return {
    isTyping,
    displayText,
    startTyping,
    onTyping,
    stopTyping,
  };
}
