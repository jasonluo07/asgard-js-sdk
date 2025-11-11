import styles from './TestComponent.module.css';

interface TestComponentProps {
  message: string;
}

export default function TestComponent({ message }: TestComponentProps): JSX.Element {
  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Test Component</h2>
      <p className={styles.message}>{message}</p>
    </div>
  );
}
