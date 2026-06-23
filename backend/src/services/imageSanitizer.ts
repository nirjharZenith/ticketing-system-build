import sharp from 'sharp';

const ALLOWED_MIMES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
const MAX_DIMENSION = 2048;
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const EXTENSION_MAP: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif',
};

const detectImageMime = (buffer: Buffer): string | null => {
  if (buffer.length < 12) return null;

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) {
    return 'image/png';
  }

  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return 'image/gif';
  }

  if (
    buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
    buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50
  ) {
    return 'image/webp';
  }

  return null;
};

export interface SanitizedImage {
  buffer: Buffer;
  mimeType: string;
  extension: string;
}

export const sanitizeImage = async (input: Buffer): Promise<SanitizedImage> => {
  if (input.length > MAX_FILE_SIZE) {
    throw new Error('Image exceeds 5MB limit');
  }

  const mimeType = detectImageMime(input);
  if (!mimeType || !ALLOWED_MIMES.has(mimeType)) {
    throw new Error('Invalid image type. Allowed: JPEG, PNG, WebP, GIF');
  }

  let pipeline = sharp(input, { failOn: 'error' }).rotate();

  if (mimeType === 'image/gif') {
    const metadata = await sharp(input).metadata();
    if ((metadata.pages ?? 1) > 1) {
      throw new Error('Animated GIFs are not supported');
    }
  }

  if (mimeType !== 'image/gif') {
    pipeline = pipeline
      .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: 'inside', withoutEnlargement: true })
      .jpeg({ quality: 85, mozjpeg: true });

    const buffer = await pipeline.toBuffer();
    return { buffer, mimeType: 'image/jpeg', extension: '.jpg' };
  }

  const buffer = await pipeline.toBuffer();
  return {
    buffer,
    mimeType,
    extension: EXTENSION_MAP[mimeType] || '.gif',
  };
};

export const buildImageFilename = (username: string, extension: string): string => {
  const now = new Date();
  const datePart = now.toISOString().slice(0, 10);
  const timestamp = now.getTime();
  const safeUsername = username
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 40) || 'user';

  return `${datePart}-${timestamp}-${safeUsername}${extension}`;
};
