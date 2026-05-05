// Multer config for image uploads — used by the web add-climb form and the mobile API.
//
// Files go to disk rather than memory to avoid OOM crashes under concurrent uploads.
//
// File type check validates BOTH extension and MIME type. Extension-only is unsafe
// (rename script.sh to photo.jpg). MIME-only is unsafe (clients can lie).
//
// COMP204: added HEIC/HEIF for iOS. The mobile app forces image/jpeg as the MIME type
// when sending HEIC files, so extension and MIME won't match the same allowed value.
// OR logic accepts the file if either check passes; AND would reject valid iOS photos.

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: './public/uploads/', // served as static at /uploads/<filename>

  filename: (req, file, cb) => {
    // timestamp + random prevents collisions even with simultaneous uploads
    const uniqueName =
      `${Date.now()}-${Math.random().toString(36).substring(2, 11)}` +
      path.extname(file.originalname);
    cb(null, uniqueName);
  },
});

const upload = multer({
  storage,

  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB — prevents abuse via huge files
  },

  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp|heic|heif/;

    // Check the file extension (what the user named the file)
    const extOk = allowed.test(path.extname(file.originalname).toLowerCase());

    // Check the MIME type (what the browser/app reports the file as)
    const mimeOk = allowed.test(file.mimetype);

    // OR not AND — see header comment (iOS HEIC files)
    if (mimeOk || extOk) return cb(null, true);

    cb(new Error('Only image files are allowed'));
  },
});

module.exports = upload;
