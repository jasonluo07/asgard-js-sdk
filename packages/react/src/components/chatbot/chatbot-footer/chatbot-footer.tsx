import {
  ChangeEventHandler,
  KeyboardEventHandler,
  ReactNode,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useAsgardContext } from '../../../context/asgard-service-context';
import styles from './chatbot-footer.module.scss';
import SendSvg from '../../../icons/send.svg?react';
import CameraSvg from '../../../icons/camera.svg?react';
import GallerySvg from '../../../icons/gallery.svg?react';
import { SpeechInputButton } from './speech-input-button';
import clsx from 'clsx';
import { useAsgardThemeContext } from '../../../context/asgard-theme-context';
import { validateImageFiles } from '../../../utils/file-validation';

export function ChatbotFooter(): ReactNode {
  const { sendMessage, isConnecting, inputPlaceholder, client, customChannelId } = useAsgardContext();

  const { chatbot } = useAsgardThemeContext();

  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const disabled = useMemo(
    () => isConnecting || (!value.trim() && selectedFiles.length === 0),
    [isConnecting, value, selectedFiles.length]
  );

  const contentStyles = useMemo(
    () => ({
      maxWidth: chatbot?.contentMaxWidth ?? '1200px',
      borderTopColor: chatbot?.borderColor,
    }),
    [chatbot]
  );

  const onChange = useCallback<ChangeEventHandler<HTMLTextAreaElement>>(
    (event) => {
      const element = event.target as HTMLTextAreaElement;
      const value = element.value;

      element.style.height = '36px';

      if (value) {
        element.style.height = `${element.scrollHeight}px`;
      }

      setValue(event.target.value);
    },
    []
  );

  const onSubmit = useCallback(async () => {
    if (!isComposing && !isConnecting) {
      const hasFiles = selectedFiles.length > 0;
      const messageText = value.trim();
      
      try {
        let blobIds: string[] | undefined;
        
        // 如果有檔案，先上傳
        if (hasFiles && client?.uploadFile && customChannelId) {
          console.log('開始上傳檔案...');
          blobIds = [];
          
          for (const file of selectedFiles) {
            try {
              console.log(`上傳檔案: ${file.name}`);
              const response = await client.uploadFile(file, customChannelId);
              
              if (response.isSuccess && response.data?.[0]) {
                const blobData = response.data[0];
                blobIds.push(blobData.blobId);
                console.log(`✓ 檔案 ${file.name} 上傳成功，blobId: ${blobData.blobId}`);
              } else {
                console.error(`檔案 ${file.name} 上傳失敗:`, response.error);
              }
            } catch (error) {
              console.error(`檔案 ${file.name} 上傳出錯:`, error);
              alert(`檔案 ${file.name} 上傳失敗`);
            }
          }
          
          if (blobIds.length === 0) {
            console.error('所有檔案上傳失敗');
            return;
          }
        }
        
        // 發送訊息（包含 blobIds）
        if (messageText || blobIds) {
          const payload: any = { 
            text: messageText || '' 
          };
          
          if (blobIds && blobIds.length > 0) {
            payload.blobIds = blobIds;
            console.log('發送訊息，附帶 blobIds:', blobIds);
          }
          
          sendMessage?.(payload);
        }

        // 清空輸入和檔案
        setValue('');
        setSelectedFiles([]);

        if (textareaRef.current) {
          textareaRef.current.style.height = '36px';
        }
      } catch (error) {
        console.error('發送訊息失敗:', error);
        alert('發送訊息失敗，請重試');
      }
    }
  }, [isComposing, isConnecting, sendMessage, value, selectedFiles, client, customChannelId]);

  const onKeyDown = useCallback<KeyboardEventHandler<HTMLTextAreaElement>>(
    (event) => {
      if (
        event.key === 'Enter' &&
        !isComposing &&
        !isConnecting &&
        (value.trim() || selectedFiles.length > 0)
      ) {
        event.preventDefault();
        onSubmit();
      }
    },
    [isComposing, isConnecting, value, selectedFiles.length, onSubmit]
  );

  const handleFileSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = event.target.files;
      if (files && files.length > 0) {
        console.log('選擇的檔案:', files);
        
        // 驗證檔案
        const { validFiles, errors } = validateImageFiles(files);
        
        if (errors.length > 0) {
          console.error('檔案驗證錯誤:', errors);
          // TODO: 之後可以顯示錯誤訊息給使用者
          alert('檔案驗證錯誤:\n' + errors.join('\n'));
        }
        
        if (validFiles.length > 0) {
          console.log('有效的檔案:', validFiles);
          setSelectedFiles(prev => [...prev, ...validFiles]);
          
          // Log 檔案資訊
          validFiles.forEach(file => {
            console.log(`✓ ${file.name} (${file.type}, ${(file.size / 1024).toFixed(2)} KB)`);
          });
        }
      }
      // 清空 input 值，允許重複選擇相同檔案
      event.target.value = '';
    },
    []
  );

  const handleGalleryClick = useCallback(() => {
    console.log('Gallery clicked - opening file selector');
    fileInputRef.current?.click();
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    console.log(`移除檔案 index: ${index}`);
  }, []);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.setProperty(
        '--asg-color-text-placeholder',
        chatbot.footer?.textArea?.['::placeholder']?.color ??
          'var(--asg-color-text-placeholder)'
      );
    }
  }, [chatbot.footer?.textArea]);

  return (
    <div
      className={clsx('asgard-chatbot-footer', styles.chatbot_footer)}
      style={chatbot.footer?.style}
    >
      <div className={styles.chatbot_footer__content} style={contentStyles}>
        {/* 隱藏的檔案輸入 */}
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
          onChange={handleFileSelect}
          style={{ display: 'none' }}
        />
        
        {/* 檔案預覽列表 - Claude 風格 */}
        {selectedFiles.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '8px',
            flexWrap: 'wrap',
            paddingBottom: '12px'
          }}>
            {selectedFiles.map((file, index) => {
              // 建立預覽 URL
              const previewUrl = URL.createObjectURL(file);
              
              return (
                <div key={index} style={{
                  position: 'relative',
                  width: '240px',
                  background: '#2d2d2d',
                  border: '1px solid #3d3d3d',
                  borderRadius: '8px',
                  overflow: 'hidden'
                }}>
                  {/* 圖片預覽區 */}
                  <div style={{
                    width: '100%',
                    height: '160px',
                    background: '#1a1a1a',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative'
                  }}>
                    <img 
                      src={previewUrl}
                      alt={file.name}
                      style={{
                        maxWidth: '100%',
                        maxHeight: '100%',
                        objectFit: 'contain'
                      }}
                      onLoad={() => URL.revokeObjectURL(previewUrl)}
                    />
                    
                    {/* 移除按鈕 */}
                    <button
                      onClick={() => handleRemoveFile(index)}
                      style={{
                        position: 'absolute',
                        top: '8px',
                        right: '8px',
                        width: '24px',
                        height: '24px',
                        borderRadius: '4px',
                        background: 'rgba(0, 0, 0, 0.6)',
                        backdropFilter: 'blur(4px)',
                        color: 'white',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: '16px',
                        padding: 0,
                        transition: 'background 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.8)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(0, 0, 0, 0.6)';
                      }}
                      aria-label="移除"
                    >
                      ×
                    </button>
                  </div>
                  
                  {/* 檔案資訊 */}
                  <div style={{
                    padding: '8px 12px',
                    borderTop: '1px solid #3d3d3d'
                  }}>
                    <div style={{ 
                      color: '#e0e0e0',
                      fontSize: '13px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                      marginBottom: '2px'
                    }}>
                      {file.name}
                    </div>
                    <div style={{ 
                      color: '#888',
                      fontSize: '11px'
                    }}>
                      {file.type.split('/')[1].toUpperCase()} • {(file.size / 1024).toFixed(0)} KB
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <div className={styles.attachment_buttons}>
          <button
            className={styles.attachment_button}
            onClick={() => console.log('Camera clicked')}
            disabled={isConnecting}
            title="拍照"
          >
            <CameraSvg />
          </button>
          <button
            className={styles.attachment_button}
            onClick={handleGalleryClick}
            disabled={isConnecting}
            title="選擇照片"
            style={{ position: 'relative' }}
          >
            <GallerySvg />
            {selectedFiles.length > 0 && (
              <span style={{
                position: 'absolute',
                top: '-5px',
                right: '-5px',
                background: 'red',
                color: 'white',
                borderRadius: '50%',
                width: '18px',
                height: '18px',
                fontSize: '11px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 'bold'
              }}>
                {selectedFiles.length}
              </span>
            )}
          </button>
        </div>
        <textarea
          ref={textareaRef}
          className={styles.chatbot_textarea}
          style={chatbot.footer?.textArea?.style}
          disabled={isConnecting}
          cols={40}
          value={value}
          placeholder={inputPlaceholder || "Enter message"}
          onChange={onChange}
          onKeyDown={onKeyDown}
          onCompositionStart={() => setIsComposing(true)}
          onCompositionEnd={() => setIsComposing(false)}
        />
        {value || selectedFiles.length > 0 ? (
          <button
            className={clsx(
              styles.chatbot_submit_button,
              disabled && styles.chatbot_submit_button__disabled
            )}
            style={chatbot.footer?.submitButton?.style}
            disabled={disabled}
            onClick={onSubmit}
          >
            <SendSvg />
          </button>
        ) : (
          <SpeechInputButton
            setValue={setValue}
            className={clsx(
              styles.chatbot_submit_button,
              isConnecting && styles.chatbot_submit_button__disabled
            )}
            style={chatbot.footer?.speechInputButton?.style}
          />
        )}
      </div>
    </div>
  );
}
