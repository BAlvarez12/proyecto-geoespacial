const multer = require("multer");
const path = require("path");
const fs = require("fs");

const uploadPath = path.join(__dirname, "../../uploads/puntos");

if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    const nombreBase = path
      .basename(file.originalname, extension)
      .replace(/\s+/g, "-")
      .toLowerCase();

    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    cb(null, `${nombreBase}-${uniqueSuffix}${extension}`);
  },
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpg|jpeg|png|webp/;
  const extension = path.extname(file.originalname).toLowerCase();
  const mimeType = file.mimetype;

  const extOk = allowedTypes.test(extension.replace(".", ""));
  const mimeOk =
    mimeType === "image/jpeg" ||
    mimeType === "image/png" ||
    mimeType === "image/webp";

  if (extOk && mimeOk) {
    return cb(null, true);
  }

  cb(new Error("Solo se permiten imágenes JPG, JPEG, PNG o WEBP"));
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    files: 5,
    fileSize: 5 * 1024 * 1024,
  },
});

module.exports = upload;