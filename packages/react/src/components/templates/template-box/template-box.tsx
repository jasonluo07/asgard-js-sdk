import { ReactNode, useMemo } from 'react';
import styles from './template-box.module.scss';
import clsx from 'clsx';

type TemplateBoxProps =
  | {
      type: 'user';
      direction: 'horizontal';
      children: ReactNode;
    }
  | {
      type: 'bot';
      direction: 'horizontal' | 'vertical';
      children: ReactNode;
    };

export function TemplateBox(props: TemplateBoxProps): ReactNode {
  const { type, direction = 'horizontal', children } = props;

  const boxClassName = useMemo(() => {
    switch (type) {
      case 'user':
        return clsx(styles.template_box, styles['template_box--user']);
      case 'bot':
      default:
        return clsx(
          styles.template_box,
          styles['template_box--bot'],
          direction === 'horizontal'
            ? styles['template_box--horizontal']
            : styles['template_box--vertical']
        );
    }
  }, [direction, type]);

  // const boxStyles = useMemo<CSSProperties>(() => {
  //   switch (type) {
  //     case 'user':
  //       return {
  //         color: theme?.userMessage?.color,
  //         backgroundColor: theme?.userMessage?.backgroundColor,
  //       };
  //     case 'bot':
  //       return {
  //         color: theme?.botMessage?.color,
  //         backgroundColor: theme?.botMessage?.backgroundColor,
  //       };
  //     default:
  //       return {};
  //   }
  // }, [type, theme]);

  return <div className={boxClassName}>{children}</div>;
}
