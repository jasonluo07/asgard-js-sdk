import { CSSProperties, ReactNode, useMemo, useState } from 'react';
import { ConversationUserMessage } from '@asgard-js/core';
import { TemplateBox } from '../template-box';
import { Time } from '../time';
import { useAsgardThemeContext } from '../../../context/asgard-theme-context';
import clsx from 'clsx';
import styles from './user-image-template.module.scss';

interface UserImageTemplateProps {
  message: {
    type: 'user';
    message: ConversationUserMessage;
  };
}

export function UserImageTemplate({ message }: UserImageTemplateProps): ReactNode {
  const [expandedImage, setExpandedImage] = useState<string | null>(null);
  const theme = useAsgardThemeContext();

  const textStyles = useMemo<CSSProperties>(
    () => ({
      color: theme?.userMessage?.color,
      backgroundColor: theme?.userMessage?.backgroundColor,
    }),
    [theme],
  );

  const rootStyle = theme?.template?.TextMessageTemplate?.style;

  return (
    <>
      <TemplateBox
        className="asgard-text-template asgard-text-template--user"
        type="user"
        direction="horizontal"
        style={rootStyle}
      >
        <div className={styles.message_wrapper}>
          {message.message.filePreviewUrls && message.message.filePreviewUrls.length > 0 && (
            <div className={styles.images_container}>
              {message.message.filePreviewUrls.map((url, index) => (
                <div key={index} className={styles.image_wrapper}>
                  <img
                    src={url}
                    alt={`上傳的圖片 ${index + 1}`}
                    className={styles.uploaded_image}
                    loading="lazy"
                    onClick={() => setExpandedImage(url)}
                  />
                </div>
              ))}
            </div>
          )}

          {message.message.text && (
            <div className={clsx(styles.text_bubble, styles['text_bubble--user'])} style={textStyles}>
              {message.message.text}
            </div>
          )}
        </div>
        <Time time={message.message.time} />
      </TemplateBox>

      {expandedImage && (
        <div className={styles.image_modal} onClick={() => setExpandedImage(null)}>
          <img src={expandedImage} alt="展開的圖片" className={styles.modal_image} />
        </div>
      )}
    </>
  );
}
