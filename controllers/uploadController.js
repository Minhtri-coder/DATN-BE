const uploadService = require('../services/uploadService');
const mongoose = require('mongoose');
const { sendSuccess, sendError } = require('../utils/response');
const handleError = require('../utils/errorHandler');

const uploadController = {
    uploadMedia: async (req, res) => {
        try {
            // FIX LỖI 500: Chống crash nếu req.body bị undefined do request rỗng
            const body = req.body || {};
            const { entityType, objectId } = body;

            // 1. Validate tham số căn bản (Giờ sẽ trả đúng 400 thay vì 500)
            if (!entityType || !objectId) {
                return sendError(res, 400, "Bắt buộc phải truyền lên entityType và objectId.");
            }
            if (!mongoose.Types.ObjectId.isValid(objectId)) {
                return sendError(res, 400, "Định dạng objectId không hợp lệ.");
            }

            // 2. Kiểm tra file đính kèm (Xử lý an toàn tránh lỗi 'length of undefined')
            const filesArray = Array.isArray(req.files) ? req.files : [];
            const filesObject = req.files && !Array.isArray(req.files) ? Object.keys(req.files) : [];

            if (filesArray.length === 0 && filesObject.length === 0 && !req.file) {
                return sendError(res, 400, "Vui lòng đính kèm ít nhất một file ảnh/video.");
            }

            // 3. Giao việc cho Service (Truyền req.user vào để phân quyền)
            const result = await uploadService.uploadMediaProcess(
                entityType,
                objectId,
                req.user,
                req.files,
                req.file
            );

            // 4. Trả về thành công
            return sendSuccess(res, 200, "Cập nhật ảnh thành công.", result);

        } catch (error) {
            // Hứng mọi lỗi đẩy cho Central Error Handler
            return handleError(res, error);
        }
    }
};

module.exports = uploadController;