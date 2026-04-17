// src/middlewares/multerErrorHandler.js
const multer = require("multer");
const { sendError } = require("../utils/response");

function multerErrorHandler(err, req, res, next) {
    if (err instanceof multer.MulterError) {
        if (err.code === "LIMIT_FILE_SIZE") {
            return sendError(res, 413, "File quá lớn (tối đa 3MB).");
        }
        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            // Phân biệt rõ do sai định dạng hay sai Key
            if (err.message === "Unsupported file type") {
                return sendError(res, 400, "Định dạng file không được hỗ trợ (chỉ nhận jpg, png, webp).");
            }
            return sendError(res, 400, `Key upload không hợp lệ. Vui lòng kiểm tra lại field name (VD: 'file' hoặc 'Image').`);
        }
        return sendError(res, 400, "File upload không hợp lệ.");
    }
    if (err) {
        return sendError(res, 400, err.message || "Upload lỗi.");
    }
    next();
}

module.exports = multerErrorHandler;