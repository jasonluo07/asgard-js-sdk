import { Message } from '@asgard-js/core';
import { useCallback, useState } from 'react';
import { useDebounce } from './use-debounce';

export interface UseChatbotTypingReturn {
  isTyping: boolean;
  displayText: string | null;
  startTyping: (message: Message) => void;
  onTyping: (message: Message) => void;
  stopTyping: () => void;
}

export function useChatbotTyping(): UseChatbotTypingReturn {
  const [isTyping, setIsTyping] = useState(false);
  const [displayText, setDisplayText] = useState<string | null>(null);

  const startTyping = useCallback(() => setIsTyping(true), [setIsTyping]);

  const onTyping = useCallback((message: Message) => {
    setDisplayText((prev) => (prev ?? '') + message.text);
  }, []);

  const stopTyping = useCallback(() => {
    setIsTyping(false);
    setDisplayText(null);
  }, [setIsTyping]);

  const debouncedIsTyping = useDebounce(isTyping, 300);

  return {
    isTyping: debouncedIsTyping,
    displayText,
    startTyping,
    onTyping,
    stopTyping,
  };
}
