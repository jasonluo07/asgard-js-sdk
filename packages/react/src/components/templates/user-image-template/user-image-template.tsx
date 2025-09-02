import { ReactNode, useMemo } from 'react';
import { ConversationUserMessage } from '@asgard-js/core';
import { useAsgardContext } from '../../../context/asgard-service-context';
import styles from './user-image-template.module.scss';

interface UserImageTemplateProps {
  message: {
    type: 'user';
    message: ConversationUserMessage;
  };
}

export function UserImageTemplate({ message }: UserImageTemplateProps): ReactNode {
  const { client } = useAsgardContext();
  
  // 從 client 的設定取得 botProviderEndpoint 來建構圖片 URL
  const imageUrls = useMemo(() => {
    if (!message.message.blobIds || message.message.blobIds.length === 0) {
      return [];
    }
    
    // 從 client 設定取得 botProviderEndpoint
    // @ts-ignore - 存取私有屬性只為了取得端點
    const botProviderEndpoint = client?.['botProviderEndpoint'];
    if (!botProviderEndpoint) {
      console.warn('無法取得 botProviderEndpoint，無法顯示圖片');
      return [];
    }
    
    // 根據 blobId 建構圖片 URL
    // 假設 API 格式為 ${botProviderEndpoint}/blob/${blobId}
    return message.message.blobIds.map(blobId => {
      const baseEndpoint = botProviderEndpoint.replace(/\/+$/, '');
      return `${baseEndpoint}/blob/${blobId}`;
    });
  }, [message.message.blobIds, client]);

  return (
    <div className={styles.user_image_message}>
      {/* 顯示文字（如果有） */}
      {message.message.text && (
        <div className={styles.text_content}>
          {message.message.text}
        </div>
      )}
      
      {/* 顯示圖片 */}
      {imageUrls.length > 0 && (
        <div className={styles.images_container}>
          {imageUrls.map((url, index) => (
            <div key={index} className={styles.image_wrapper}>
              <img 
                src={url}
                alt={`上傳的圖片 ${index + 1}`}
                className={styles.uploaded_image}
                loading="lazy"
                onClick={() => window.open(url, '_blank')}
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}