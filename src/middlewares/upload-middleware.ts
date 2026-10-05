import multer from "multer";
import AppError from "../errors/app-error.js";

const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 8 * 1024 * 1024,
        files: 5,
        fields: 20,
        fieldNameSize: 100,
        fieldSize: 64 * 1024,
        parts: 25
    },
    fileFilter: (_req, file, callback) => {
        const allowedMimeTypes = new Set([
            "image/jpeg",
            "image/png",
            "image/webp"
        ]);

        if (!allowedMimeTypes.has(file.mimetype)) {
            return callback(
                new AppError("Solo se permiten imágenes JPEG, PNG o WEBP.", 400)
            );
        }

        callback(null, true);
    }
});

export default upload;