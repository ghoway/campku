import multer from "multer";
import path from "path";
import fs from "fs";
import { env } from "@/config/env";
import { BadRequestError } from "@/shared/errors";

const ALLOWED = ["image/jpeg", "image/png", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024; // 5MB

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dest = path.join(process.cwd(), env.UPLOAD_DIR);
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${crypto.randomUUID()}${ext}`);
  },
});

function fileFilter(_req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) {
  if (!ALLOWED.includes(file.mimetype)) {
    cb(new BadRequestError("Only JPG, PNG, WebP are allowed", "INVALID_FILE_TYPE"));
    return;
  }
  cb(null, true);
}

export const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_SIZE, files: 8 },
});