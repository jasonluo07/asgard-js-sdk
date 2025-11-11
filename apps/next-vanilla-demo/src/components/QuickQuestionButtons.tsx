import styles from './QuickQuestionButtons.module.css';

interface QuickQuestionButtonsProps {
  onQuestionClick: (question: string) => void;
}

export default function QuickQuestionButtons({ onQuestionClick }: QuickQuestionButtonsProps): JSX.Element {
  return (
    <div className={styles.container}>
      <button
        onClick={() => onQuestionClick('死侍有上映嗎？')}
        className={`${styles.button} ${styles.buttonBlue}`}
      >
        死侍有上映嗎？
      </button>
      <button
        onClick={() => onQuestionClick('哪邊可以找得到哺乳室？')}
        className={`${styles.button} ${styles.buttonGreen}`}
      >
        哪邊可以找得到哺乳室？
      </button>
    </div>
  );
}
