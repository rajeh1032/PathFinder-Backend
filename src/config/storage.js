const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

const uploadDir = path.resolve(
  process.cwd(),
  process.env.UPLOAD_DIR || 'uploads',
);

const storageConfig = {
  mode: process.env.STORAGE_MODE || 'local',
  bucketName: process.env.STORAGE_BUCKET || 'uploads',
  uploadDir,
  allowedMimeTypes: (
    process.env.STORAGE_ALLOWED_TYPES ||
    'image/jpeg,image/png,image/webp,application/pdf'
  ).split(','),
  maxFileSize: Number(process.env.STORAGE_MAX_FILE_SIZE) || 5 * 1024 * 1024,
  publicBaseUrl: process.env.STORAGE_PUBLIC_BASE_URL || '',
};

const ensureUploadDir = () => {
  if (!fs.existsSync(storageConfig.uploadDir)) {
    fs.mkdirSync(storageConfig.uploadDir, { recursive: true });
  }

  return storageConfig.uploadDir;
};

const getUploadPath = (filename, subfolder = 'uploads') => {
  ensureUploadDir();
  const targetDir = path.join(storageConfig.uploadDir, subfolder);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  return path.join(targetDir, filename);
};

const getPublicUrl = (filename, subfolder = 'uploads') => {
  if (storageConfig.publicBaseUrl) {
    return `${storageConfig.publicBaseUrl.replace(/\/$/, '')}/${subfolder}/${filename}`;
  }

  return `/${subfolder}/${filename}`;
};

module.exports = {
  storageConfig,
  ensureUploadDir,
  getUploadPath,
  getPublicUrl,
};
