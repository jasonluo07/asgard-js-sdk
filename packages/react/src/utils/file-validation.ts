export const SUPPORTED_IMAGE_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/gif',
  'image/webp',
];

export const MAX_FILE_SIZE = 20 * 1024 * 1024; // 20MB

export interface FileValidationResult {
  isValid: boolean;
  error?: string;
}

export function validateImageFile(file: File): FileValidationResult {
  // 檢查檔案類型
  if (!SUPPORTED_IMAGE_TYPES.includes(file.type)) {
    const supportedFormats = SUPPORTED_IMAGE_TYPES.map(type => 
      type.split('/')[1].toUpperCase()
    ).join('、');
    return {
      isValid: false,
      error: `不支援的檔案格式。請選擇 ${supportedFormats} 圖片。`,
    };
  }

  // 檢查檔案大小
  if (file.size > MAX_FILE_SIZE) {
    const sizeMB = (file.size / 1024 / 1024).toFixed(1);
    return {
      isValid: false,
      error: `檔案大小 ${sizeMB}MB 超過限制 20MB。`,
    };
  }

  return { isValid: true };
}

export function validateImageFiles(files: FileList | File[]): {
  validFiles: File[];
  errors: string[];
} {
  const validFiles: File[] = [];
  const errors: string[] = [];
  
  const fileArray = Array.from(files);
  
  fileArray.forEach(file => {
    const validation = validateImageFile(file);
    if (validation.isValid) {
      validFiles.push(file);
    } else {
      errors.push(`${file.name}: ${validation.error}`);
    }
  });
  
  return { validFiles, errors };
}