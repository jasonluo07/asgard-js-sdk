import { ReactNode } from 'react';
import { ConversationUserMessage } from '@asgard-js/core';
import styles from './user-image-template.module.scss';

interface UserImageTemplateProps {
  message: {
    type: 'user';
    message: ConversationUserMessage;
  };
}

export function UserImageTemplate({ message }: UserImageTemplateProps): ReactNode {

  return (
    <div className={styles.user_image_message}>
      {/* 顯示文字（如果有） */}
      {message.message.text && (
        <div className={styles.text_content}>
          {message.message.text}
        </div>
      )}
      
      {/* 顯示檔案附件資訊（不顯示圖片預覽） */}
      {message.message.blobIds && message.message.blobIds.length > 0 && (
        <div className={styles.files_container}>
          <div className={styles.file_info}>
            📎 已附加 {message.message.blobIds.length} 個檔案
          </div>
          <div className={styles.file_note}>
            檔案已上傳，AI 可進行分析處理
          </div>
        </div>
      )}
    </div>
  );
}