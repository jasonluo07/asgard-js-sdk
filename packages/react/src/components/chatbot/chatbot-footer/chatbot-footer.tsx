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
import { useAsgardAppInitializationContext } from '../../../context/asgard-app-initialization-context';
import styles from './chatbot-footer.module.scss';
import SendSvg from '../../../icons/send.svg?react';
import GallerySvg from '../../../icons/gallery.svg?react';
import DownloadSvg from '../../../icons/download.svg?react';
import { SpeechInputButton } from './speech-input-button';
import clsx from 'clsx';
import { useAsgardThemeContext } from '../../../context/asgard-theme-context';
import { validateImageFiles } from '../../../utils/file-validation';

export function ChatbotFooter(): ReactNode {
  const { sendMessage, isConnecting, inputPlaceholder, client, customChannelId, enableUpload: enableUploadProp, enableExport: enableExportProp, messages, title } = useAsgardContext();
  const { data } = useAsgardAppInitializationContext();

  const { chatbot } = useAsgardThemeContext();

  // Determine enableUpload: prioritize prop, then annotations
  const enableUpload = useMemo(() => {
    if (enableUploadProp !== undefined) {
      return enableUploadProp;
    }

    return data.annotations?.embedConfig?.enableUpload ?? false;
  }, [enableUploadProp, data.annotations?.embedConfig?.enableUpload]);

  // Determine enableExport: prioritize prop, then annotations
  const enableExport = useMemo(() => {
    if (enableExportProp !== undefined) {
      return enableExportProp;
    }

    return data.annotations?.embedConfig?.enableExport ?? false;
  }, [enableExportProp, data.annotations?.embedConfig?.enableExport]);

  // Determine bot name: prioritize annotations, then prop, then default
  const botName = useMemo(() => {
    return data.annotations?.embedConfig?.title || title || 'Bot';
  }, [data.annotations?.embedConfig?.title, title]);

  const [value, setValue] = useState('');
  const [isComposing, setIsComposing] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [filePreviewUrls, setFilePreviewUrls] = useState<string[]>([]);
  const [previewImage, setPreviewImage] = useState<{ url: string; name: string } | null>(null);
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
        
        if (hasFiles && client?.uploadFile && customChannelId) {
          blobIds = [];
          
          for (const file of selectedFiles) {
            try {
              const response = await client.uploadFile(file, customChannelId);
              
              if (response.isSuccess && response.data?.[0]) {
                const blobData = response.data[0];
                blobIds.push(blobData.blobId);
              } else {
                // Upload failed, continue with next file
              }
            } catch {
              alert(`檔案 ${file.name} 上傳失敗`);
            }
          }
          
          if (blobIds.length === 0) {
            
            return;
          }
        }
        
        if (messageText || blobIds || filePreviewUrls.length > 0) {
          const payload: { text: string; blobIds?: string[]; filePreviewUrls?: string[] } = { 
            text: messageText || '' 
          };
          
          if (blobIds && blobIds.length > 0) {
            payload.blobIds = blobIds;
          }
          
          if (filePreviewUrls.length > 0) {
            payload.filePreviewUrls = filePreviewUrls;
          }
          
          sendMessage?.(payload);
        }

        setValue('');
        setSelectedFiles([]);
        setFilePreviewUrls([]);

        if (textareaRef.current) {
          textareaRef.current.style.height = '36px';
        }
      } catch {
        alert('發送訊息失敗，請重試');
      }
    }
  }, [isComposing, isConnecting, sendMessage, value, selectedFiles, filePreviewUrls, client, customChannelId]);

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
        
        const { validFiles, errors } = validateImageFiles(files);
        
        if (errors.length > 0) {
          alert('檔案驗證錯誤:\n' + errors.join('\n'));
        }
        
        if (validFiles.length > 0) {
          setSelectedFiles(prev => [...prev, ...validFiles]);
          
          const newPreviewUrls: string[] = [];
          for (const file of validFiles) {
            const reader = new FileReader();
            reader.onload = (e): void => {
              if (e.target?.result && typeof e.target.result === 'string') {
                newPreviewUrls.push(e.target.result);
                if (newPreviewUrls.length === validFiles.length) {
                  setFilePreviewUrls(prev => [...prev, ...newPreviewUrls]);
                }
              }
            };

            reader.readAsDataURL(file);
          }
        }
      }
      
      event.target.value = '';
    },
    []
  );

  const handleGalleryClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleRemoveFile = useCallback((index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    setFilePreviewUrls(prev => prev.filter((_, i) => i !== index));
  }, []);

  const handleDownloadClick = useCallback(async () => {
    if (!messages) {
      alert('目前沒有可下載的對話紀錄');

      return;
    }

    try {
      const { exportConversationToMarkdown, downloadMarkdown } = await import('../../../utils/export-conversation');

      const markdown = exportConversationToMarkdown(messages, {
        customChannelId,
        botName,
      });

      downloadMarkdown(markdown, { botName });
    } catch (error) {
      // eslint-disable-next-line no-console
      console.error('下載對話紀錄失敗:', error);
      alert('下載失敗，請重試');
    }
  }, [messages, customChannelId, botName]);

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
      {enableUpload && selectedFiles.length > 0 && (
        <div className={styles.file_preview_container} style={{ maxWidth: contentStyles.maxWidth }}>
          <div className={styles.file_preview_grid}>
            {selectedFiles.map((file, index) => {
              const previewUrl = URL.createObjectURL(file);

              return (
                <div key={index} className={styles.file_preview_item}>
                  <div className={styles.file_preview_image_area}>
                    <img
                      src={previewUrl}
                      alt={file.name}
                      className={styles.file_preview_image}
                      onClick={() => {
                        const modalUrl = URL.createObjectURL(file);
                        setPreviewImage({ url: modalUrl, name: file.name });
                      }}
                      onLoad={() => URL.revokeObjectURL(previewUrl)}
                    />

                    <button
                      onClick={() => handleRemoveFile(index)}
                      className={styles.file_remove_button}
                      aria-label="移除"
                    >
                      ×
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className={styles.chatbot_footer__content} style={contentStyles}>
        <div className={styles.attachment_buttons}>
          {enableExport && (
            <button
              className={styles.attachment_button}
              onClick={handleDownloadClick}
              title="下載"
            >
              <DownloadSvg />
            </button>
          )}
          {enableUpload && (
            <>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp"
                onChange={handleFileSelect}
                className={styles.file_input_hidden}
              />
              <button
                className={styles.attachment_button}
                onClick={handleGalleryClick}
                title="選擇照片"
              >
                <GallerySvg />
              </button>
            </>
          )}
        </div>
        <textarea
          ref={textareaRef}
          className={styles.chatbot_textarea}
          style={chatbot.footer?.textArea?.style}
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
      
      {previewImage && (
        <div
          className={styles.image_modal}
          onClick={() => {
            if (previewImage.url) {
              URL.revokeObjectURL(previewImage.url);
            }

            setPreviewImage(null);
          }}
        >
          <div className={styles.image_modal_content}>
            <img
              src={previewImage.url}
              alt={previewImage.name}
              className={styles.image_modal_image}
              onClick={(e) => e.stopPropagation()}
            />
            
          </div>
          
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (previewImage.url) {
                URL.revokeObjectURL(previewImage.url);
              }

              setPreviewImage(null);
            }}
            className={styles.image_modal_close_button}
            aria-label="關閉預覽"
          >
            ✕
          </button>
        </div>
      )}
    </div>
  );
}
