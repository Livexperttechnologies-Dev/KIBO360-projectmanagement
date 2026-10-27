import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";
import multer from "multer";

export const uploadDirectory = path.resolve(process.cwd(), "uploads");
fs.mkdirSync(uploadDirectory, { recursive: true });

const allowedTypes: Record<string, string> = {
  "application/pdf": ".pdf",
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/webp": ".webp",
  "text/plain": ".txt",
};

export const taskFileUpload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => callback(null, uploadDirectory),
    filename: (_req, file, callback) => callback(null, `${randomUUID()}${allowedTypes[file.mimetype] || ""}`),
  }),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 },
  fileFilter: (_req, file, callback) => {
    if (!allowedTypes[file.mimetype]) return callback(new Error("Unsupported file type. Upload PDF, PNG, JPEG, WEBP, or TXT files."));
    callback(null, true);
  },
});
