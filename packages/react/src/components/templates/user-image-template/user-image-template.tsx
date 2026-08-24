import { CSSProperties, ReactNode, useMemo, useState } from 'react';
import { ConversationUserMessage } from '@asgard-js/core';
import { TemplateBox } from '../template-box';
import { Time } from '../time';
import { useAsgardTemplateContext } from '../../../context/asgard-template-context';
import { useAsgardThemeContext } from '../../../context/asgard-theme-context';
import { resolveReplayAttachmentChips, UserAttachmentChip } from './user-attachment-chip';
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
  const { locale = 'en-US' } = useAsgardTemplateContext();

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

  // #448 — the replay path. Only reached when neither live field is present: a consumer that handed in
  // previews or document names has already drawn this turn's attachments, and drawing them again from the
  // blob metadata would double every chip on the message the user just sent.
  const hasLivePreviews = Boolean(message.message.filePreviewUrls?.length || message.message.documentNames?.length);
  const replayChips = useMemo(
    () => (hasLivePreviews ? [] : resolveReplayAttachmentChips(message.message, locale)),
    [hasLivePreviews, message.message, locale],
  );

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

          {/* The live document card stays hand-written rather than folding into <UserAttachmentChip>: it is
              what a consumer sees the moment they hit send, and leaving it byte-identical is what makes
              "the send path is unchanged" checkable instead of argued. The two shapes are near-duplicates
              on purpose — two occurrences, and the one that matters is frozen. */}
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

          {replayChips.length > 0 && (
            <div className={styles.documents_container}>
              {replayChips.map(chip => (
                <UserAttachmentChip key={chip.key} chip={chip} style={documentCardStyles} />
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
