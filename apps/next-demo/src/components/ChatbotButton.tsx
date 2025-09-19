'use client';

import { ChatIcon } from '~/icons';

interface ChatbotButtonProps {
  onClick?: () => void;
}

export default function ChatbotButton({ onClick }: ChatbotButtonProps) {
  return (
    <button
      onClick={onClick}
      className="
        w-12 h-12
        bg-blue-600 hover:bg-blue-700
        text-white
        rounded-full
        shadow-lg hover:shadow-xl
        transition-all duration-200 ease-in-out
        flex items-center justify-center
        focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2
        cursor-pointer
      "
      aria-label="開啟 AI 助手"
    >
      <ChatIcon />
    </button>
  );
}
