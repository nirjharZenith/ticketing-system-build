import fs from 'fs';
import path from 'path';
import { sanitizeImage, buildImageFilename } from './imageSanitizer';
import { uploadToGitHub, githubStorageEnabled } from './githubStorageService';

const uploadsDir = path.join(__dirname, '../../uploads');

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

export interface StoredImage {
  filename: string;
  url: string;
  size: number;
}

const saveLocally = (buffer: Buffer, filename: string): string => {
  const filepath = path.join(uploadsDir, filename);
  fs.writeFileSync(filepath, buffer);
  return `/uploads/${filename}`;
};

export const storeTicketImage = async (
  fileBuffer: Buffer,
  username: string,
  orgName: string,
  ticketId: string
): Promise<StoredImage> => {
  const sanitized = await sanitizeImage(fileBuffer);
  const filename = buildImageFilename(username, sanitized.extension);

  if (githubStorageEnabled()) {
    const { url } = await uploadToGitHub(sanitized.buffer, filename, orgName, ticketId);
    return { filename, url, size: sanitized.buffer.length };
  }

  const url = saveLocally(sanitized.buffer, filename);
  return { filename, url, size: sanitized.buffer.length };
};

export const getLocalFilePath = (filename: string): string => {
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    throw new Error('Invalid filename');
  }
  return path.join(uploadsDir, filename);
};

export const localFileExists = (filename: string): boolean => {
  try {
    return fs.existsSync(getLocalFilePath(filename));
  } catch {
    return false;
  }
};
