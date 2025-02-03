import { ReactNode } from 'react';
import styles from './chatbot-loading.module.scss';
import { useAsgardContext } from 'src/context/asgard-service-context';

export function ChatbotLoading(): ReactNode {
  const { isResetting } = useAsgardContext();

  if (!isResetting) return null;

  return (
    <div className={styles.loading}>
      <div className={styles.spinner}>
        <svg className={styles.spinner_svg} viewBox="0 0 50 50">
          <circle className={styles.spinner_circle} cx="25" cy="25" r="20" />
        </svg>
      </div>
    </div>
  );
}
