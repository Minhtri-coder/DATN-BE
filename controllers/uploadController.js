const uploadService = require('../services/uploadService'); // Đảm bảo đường dẫn đúng với cấu trúc của bạn
const mongoose = require('mongoose');
const { sendSuccess, sendError } = require('../utils/response');
const handleError = require('../utils/errorHandler');

const uploadController = {
    uploadMedia: async (req, res) => {
        try {
            // Chống crash nếu req.body bị undefined do request rỗng (multipart/form-data)
            const body = req.body || {};
            const { entityType, objectId, replaceOld, keptImages } = body;

            // 1. Validate tham số căn bản
            if (!entityType || !objectId) {
                return sendError(res, 400, "Bắt buộc phải truyền lên entityType và objectId.");
            }
            if (!mongoose.Types.ObjectId.isValid(objectId)) {
                return sendError(res, 400, "Định dạng objectId không hợp lệ.");
            }

            // 2. Kiểm tra file đính kèm (Xử lý an toàn)
            const filesArray = Array.isArray(req.files) ? req.files : [];
            const filesObject = req.files && !Array.isArray(req.files) ? Object.keys(req.files) : [];

            // Nếu người dùng chọn giữ nguyên ảnh cũ (chỉ xóa) và không up file mới, ta vẫn cho phép đi tiếp
            // Nên chỉ báo lỗi thiếu file nếu KHÔNG CÓ CẢ file up lẫn ảnh giữ lại
            if (filesArray.length === 0 && filesObject.length === 0 && !req.file && (!keptImages || keptImages.length === 0)) {
                return sendError(res, 400, "Vui lòng đính kèm ít nhất một file ảnh/video hoặc giữ lại ảnh cũ.");
            }

            // 3. Ép kiểu dữ liệu an toàn
            const isReplaceOld = replaceOld === 'true' || replaceOld === true;

            let parsedKeptImages = [];
            if (keptImages) {
                try {
                    // FormData thường gửi array lên dưới dạng JSON string, cần parse lại
                    parsedKeptImages = typeof keptImages === 'string' ? JSON.parse(keptImages) : keptImages;
                    if (!Array.isArray(parsedKeptImages)) parsedKeptImages = [parsedKeptImages];
                } catch (e) {
                    // Fallback nếu nó chỉ là 1 string URL bình thường
                    parsedKeptImages = [keptImages];
                }
            }

            // 4. Giao việc cho Service
            const result = await uploadService.uploadMediaProcess(
                entityType,
                objectId,
                req.user,
                req.files,
                req.file,
                isReplaceOld,
                parsedKeptImages
            );

            // 5. Trả về thành công
            return sendSuccess(res, 200, "Cập nhật ảnh thành công.", result);

        } catch (error) {
            // Hứng mọi lỗi đẩy cho Central Error Handler
            return handleError(res, error);
        }
    }
};

module.exports = uploadController;