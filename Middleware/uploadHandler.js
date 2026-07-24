const multer = require("multer");
const path = require("path");
const crypto = require("crypto");
require("dotenv").config();

const ALLOWED_MIME = ["image/jpeg", "image/png"];
const ALLOWED_EXT  = [".jpg", ".jpeg", ".png"];

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, "..", "uploads"));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const safeName = crypto.randomBytes(16).toString("hex") + ext;
    cb(null, safeName);
  }
});

const fileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mimeOk = ALLOWED_MIME.includes(file.mimetype);
  const extOk  = ALLOWED_EXT.includes(ext);

  if(mimeOk && extOk){
    return cb(null, true);
  }

  return cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", "avatar"));
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: Number(process.env.MAX_UPLOAD_BYTES),
    files: 1
  }
});

// Turn multer's errors into clean responses
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(413).json({
        message: `File too large. Maximum size is ${Number(process.env.MAX_UPLOAD_BYTES) / 1024 / 1024} MB.`
      });
    }
    if (err.code === "LIMIT_UNEXPECTED_FILE") {
      return res.status(400).json({
        message: "Invalid file type. Only JPG and PNG images are allowed."
      });
    }
    return res.status(400).json({ message: "Upload failed." });
  }
  if (err) return res.status(500).json({ message: "Upload failed." });
  next();
};

module.exports = { upload, handleUploadError };
