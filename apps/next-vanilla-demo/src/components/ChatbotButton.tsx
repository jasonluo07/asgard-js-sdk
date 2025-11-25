'use client';

import { ChatIcon } from '~/icons';
import styles from './ChatbotButton.module.css';

interface ChatbotButtonProps {
  onClick?: () => void;
}

export default function ChatbotButton({ onClick }: ChatbotButtonProps): JSX.Element {
  return (
    <button onClick={onClick} className={styles.button} aria-label="開啟 AI 助手">
      <ChatIcon />
    </button>
  );
}
