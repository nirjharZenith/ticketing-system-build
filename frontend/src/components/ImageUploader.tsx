import React, { useCallback, useRef, useState } from 'react';
import '../styles/image-uploader.css';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const MAX_FILE_SIZE = 5 * 1024 * 1024;

export interface ImagePreview {
  id: string;
  file: File;
  previewUrl: string;
}

interface ImageUploaderProps {
  images: ImagePreview[];
  onChange: (images: ImagePreview[]) => void;
  maxImages?: number;
  disabled?: boolean;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  images,
  onChange,
  maxImages = 4,
  disabled = false,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState('');

  const remaining = maxImages - images.length;

  const validateFile = (file: File): string | null => {
    if (!ALLOWED_TYPES.includes(file.type)) {
      return `${file.name}: only JPEG, PNG, WebP, and GIF are allowed`;
    }
    if (file.size > MAX_FILE_SIZE) {
      return `${file.name}: must be under 5MB`;
    }
    return null;
  };

  const addFiles = useCallback(
    (fileList: FileList | File[]) => {
      setError('');
      const files = Array.from(fileList);
      const slots = maxImages - images.length;

      if (slots <= 0) {
        setError(`Maximum ${maxImages} images allowed`);
        return;
      }

      const toAdd: ImagePreview[] = [];
      const errors: string[] = [];

      for (const file of files.slice(0, slots)) {
        const validationError = validateFile(file);
        if (validationError) {
          errors.push(validationError);
          continue;
        }
        toAdd.push({
          id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
          file,
          previewUrl: URL.createObjectURL(file),
        });
      }

      if (errors.length > 0) setError(errors.join('. '));
      if (toAdd.length > 0) onChange([...images, ...toAdd]);
    },
    [images, maxImages, onChange]
  );

  const removeImage = (id: string) => {
    const removed = images.find((img) => img.id === id);
    if (removed) URL.revokeObjectURL(removed.previewUrl);
    onChange(images.filter((img) => img.id !== id));
    setError('');
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    if (disabled || remaining <= 0) return;
    addFiles(e.dataTransfer.files);
  };

  return (
    <div className="image-uploader">
      <label className="form-group-label">Attachments (optional, up to {maxImages} images)</label>

      {remaining > 0 && (
        <div
          className={`upload-dropzone ${dragOver ? 'drag-over' : ''} ${disabled ? 'disabled' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => !disabled && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && !disabled && inputRef.current?.click()}
        >
          <div className="dropzone-icon">📷</div>
          <p className="dropzone-text">
            <strong>Click to upload</strong> or drag and drop
          </p>
          <p className="dropzone-hint">PNG, JPG, WebP, GIF — max 5MB each · {remaining} slot{remaining !== 1 ? 's' : ''} left</p>
          <input
            ref={inputRef}
            type="file"
            accept={ALLOWED_TYPES.join(',')}
            multiple
            hidden
            disabled={disabled}
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
      )}

      {error && <div className="alert alert-error alert-spaced">{error}</div>}

      {images.length > 0 && (
        <div className="image-preview-grid">
          {images.map((img) => (
            <div key={img.id} className="image-preview-item">
              <img src={img.previewUrl} alt={img.file.name} />
              <button
                type="button"
                className="remove-image-btn"
                onClick={() => removeImage(img.id)}
                disabled={disabled}
                aria-label={`Remove ${img.file.name}`}
              >
                ×
              </button>
              <span className="image-name">{img.file.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default ImageUploader;
