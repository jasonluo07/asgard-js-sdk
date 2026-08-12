import { CSSProperties, ReactNode, useMemo, useState } from 'react';
import { ConversationUserMessage } from '@asgard-js/core';
import { TemplateBox } from '../template-box';
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

  const documentCardStyles = useMemo<CSSProperties>(
    () => ({
      backgroundColor: theme?.userMessage?.backgroundColor,
      color: theme?.userMessage?.color,
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

          {message.message.documentNames && message.message.documentNames.length > 0 && (
            <div className={styles.documents_container}>
              {message.message.documentNames.map((name, index) => (
                <div key={index} className={styles.document_card} style={documentCardStyles}>
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className={styles.document_icon}
                  >
                    <path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z" />
                    <path d="M14 2v4a2 2 0 0 0 2 2h4" />
                    <path d="M10 9H8" />
                    <path d="M16 13H8" />
                    <path d="M16 17H8" />
                  </svg>
                  <span className={styles.document_name} title={name}>
                    {name}
                  </span>
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
      </TemplateBox>

      {expandedImage && (
        <div className={styles.image_modal} onClick={() => setExpandedImage(null)}>
          <img src={expandedImage} alt="展開的圖片" className={styles.modal_image} />
        </div>
      )}
    </>
  );
}
