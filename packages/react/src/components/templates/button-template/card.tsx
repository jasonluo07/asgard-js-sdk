import {
  MouseEventHandler,
  ReactNode,
  useCallback,
  useMemo,
  CSSProperties,
} from 'react';
import styles from './card.module.scss';
import {
  ButtonAction,
  ButtonMessageTemplate,
  CarouselMessageTemplate,
} from '@jasonluo07/asgard-js-core';
import { useAsgardContext } from 'src/context/asgard-service-context';
import { useAsgardTemplateContext } from 'src/context/asgard-template-context';
import { safeWindowOpen } from 'src/utils/uri-validation';
import clsx from 'clsx';

interface CardProps {
  template: ButtonMessageTemplate | CarouselMessageTemplate['columns'][number];
  customStyle?: {
    style?: CSSProperties;
    button?: {
      style?: CSSProperties;
    };
  };
}

export function Card(props: CardProps): ReactNode {
  const { template, customStyle } = props;

  const { sendMessage } = useAsgardContext();
  const { onTemplateBtnClick, defaultLinkTarget } = useAsgardTemplateContext();

  const src = useMemo(() => {
    return (
      template?.thumbnailImageUrl
        ?.replace(/^http:/, '')
        .replace(/^https:/, '') ||
      'https://via.assets.so/img.jpg?w=200&h=270&tc=white&bg=#eeeeee'
    );
  }, [template]);

  const aspectRatio = useMemo(() => {
    switch (template?.imageAspectRatio) {
      case 'square':
        return '1 / 1';
      case 'rectangle':
      default:
        return '1.51 / 1';
    }
  }, [template]);

  const handleClick = useCallback(
    (action: ButtonAction): MouseEventHandler<HTMLButtonElement> => {
      return function clickHandler() {
        switch (action.type) {
          case 'message':
          case 'MESSAGE':
            sendMessage?.({ text: action.text });

            return;
          case 'uri':
          case 'URI':
            safeWindowOpen(action.uri, action.target || defaultLinkTarget || '_blank');

            return;
          case 'emit':
          case 'EMIT':
            onTemplateBtnClick?.(action.payload, {
              sse: {
                sendMessage: (payload) => {
                  sendMessage?.(payload);
                },
              },
            });

            return;
        }
      };
    },
    [sendMessage, onTemplateBtnClick, defaultLinkTarget]
  );

  return (
    <div
      className={clsx('asgard-card', styles.card_root)}
      style={customStyle?.style}
    >
      {template?.thumbnailImageUrl && (
        <img
          alt={template?.title}
          src={src}
          style={{
            display: 'block',
            width: '100%',
            maxHeight: '170px',
            objectFit: template?.imageSize,
            aspectRatio,
          }}
        />
      )}
      <div className={styles.card_content}>
        <h5 className={styles.card_title}>{template?.title}</h5>
        <div className={styles.card_description}>{template?.text}</div>
        <div className={styles.card_actions}>
          {template?.buttons?.map((btn, index) => (
            <button
              key={index}
              onClick={handleClick(btn.action)}
              style={customStyle?.button?.style}
            >
              {btn.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
