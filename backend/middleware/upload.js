// backend/middleware/upload.js
// Replaces local disk storage (multer.diskStorage) with Cloudinary storage.
// Files upload directly to Cloudinary instead of the ephemeral local 'uploads/' folder.

const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('cloudinary').v2;

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storage = new CloudinaryStorage({
  cloudinary,
  params: async (req, file) => ({
    folder: 'achievements-portal',
    // Certificates can be PDF; Cloudinary needs resource_type 'raw' for non-image files
    resource_type: file.mimetype === 'application/pdf' ? 'raw' : 'image',
    public_id: `${Date.now()}-${file.originalname.replace(/\.[^/.]+$/, '')}`,
  }),
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB, matches your existing limit
});

module.exports = upload;