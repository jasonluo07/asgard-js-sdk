import { ReactNode, useState } from 'react';
import { Chatbot } from '@asgard-js/react';
import '@asgard-js/react/style';
import { DemoWrapper } from '../../components/demo-wrapper';
import { createTextTemplateExample } from '../../mocks/messages';
import styles from './upload-mime-constraint.module.scss';

interface Preset {
  label: string;
  allowedImageMimeTypes?: string[];
  allowedDocumentMimeTypes?: string[];
}

const PRESETS: Preset[] = [
  {
    label: 'Default (all supported types)',
  },
  {
    label: 'Images: PNG / JPEG only',
    allowedImageMimeTypes: ['image/png', 'image/jpeg'],
  },
  {
    label: 'Documents: PDF only',
    allowedDocumentMimeTypes: ['application/pdf'],
  },
  {
    label: 'Images: PNG only + Documents: PDF only',
    allowedImageMimeTypes: ['image/png'],
    allowedDocumentMimeTypes: ['application/pdf'],
  },
  {
    label: 'Images: SVG (type outside the default list)',
    allowedImageMimeTypes: ['image/svg+xml'],
  },
];

export function UploadMimeConstraint(): ReactNode {
  const [presetIndex, setPresetIndex] = useState(0);

  const preset = PRESETS[presetIndex];

  const initMessages = [createTextTemplateExample()];

  return (
    <DemoWrapper
      title="Upload MIME Constraint"
      description="Use allowedImageMimeTypes / allowedDocumentMimeTypes to restrict which file types can be uploaded. Open the attachment menu and check the file picker filter for each preset."
    >
      <div className={styles.controls}>
        <h3>Preset</h3>
        <div className={styles.presets}>
          {PRESETS.map((p, index) => (
            <label key={p.label} className={styles.preset}>
              <input
                type="radio"
                name="preset"
                checked={presetIndex === index}
                onChange={() => setPresetIndex(index)}
              />
              <span>{p.label}</span>
            </label>
          ))}
        </div>

        <div className={styles.info}>
          <h4>Props passed to &lt;Chatbot /&gt;</h4>
          <pre>
            {JSON.stringify(
              {
                enableUpload: true,
                enableDocumentUpload: true,
                allowedImageMimeTypes: preset.allowedImageMimeTypes,
                allowedDocumentMimeTypes: preset.allowedDocumentMimeTypes,
              },
              null,
              2,
            )}
          </pre>
        </div>
      </div>

      <div className={styles.chatbotContainer}>
        <Chatbot
          key={presetIndex}
          title="Upload MIME Constraint Demo"
          config={{ botProviderEndpoint: 'skip' }}
          customChannelId="upload-mime-constraint-demo"
          initMessages={initMessages}
          enableUpload
          enableDocumentUpload
          allowedImageMimeTypes={preset.allowedImageMimeTypes}
          allowedDocumentMimeTypes={preset.allowedDocumentMimeTypes}
        />
      </div>
    </DemoWrapper>
  );
}
