// src/controllers/uploadController.js
const mongoose = require('mongoose');
const { uploadFileToCloudinary, uploadMultipleFilesToCloudinary } = require('../services/cloudinaryUpload');
const { sendSuccess, sendError } = require('../utils/response');

const User = require('../models/User');
const Pet = require('../models/Pet');
// const Room = require('../models/Room'); 
// const ActionLog = require('../models/ActionLog');

// THÊM `ownerField`: Để xác định trường nào trong Model lưu ID của chủ sở hữu
const ENTITY_CONFIG = {
    profile: {
        folder: "app/profiles",
        model: User,
        imageField: 'AvatarURL',
        isMultiple: false,
        allowedRoles: [0, 1, 2],
        ownerField: '_id' // Với User, ID đối tượng chính là ID người dùng
    },
    pet: {
        folder: "app/pets",
        model: Pet,
        imageField: 'Image',
        isMultiple: false,
        allowedRoles: [0, 1, 2],
        ownerField: 'UserID' // Với Pet, chủ sở hữu nằm ở trường UserID
    },

    // Ví dụ sau này mở lại:
    // room: { folder: "app/rooms", model: Room, imageField: 'Images', isMultiple: true, allowedRoles: [1, 2], ownerField: null }, // Admin không cần check owner
    // log:  { folder: "app/logs", model: ActionLog, imageField:'Image', isMultiple: false, allowedRoles: [1, 2], ownerField: null },
};

const uploadController = {
    uploadMedia: async (req, res) => {
        try {
            const { entityType, objectId } = req.body;

            // 1. Kiểm tra đầu vào cơ bản
            if (!entityType || !objectId) {
                return sendError(res, 400, "Bắt buộc phải truyền lên entityType và objectId.");
            }

            const config = ENTITY_CONFIG[entityType];
            if (!config) {
                return sendError(res, 400, "entityType không hợp lệ.");
            }

            // ==========================================
            // 2. KIỂM TRA PHÂN QUYỀN (RBAC) DỰA VÀO CẤU HÌNH
            // ==========================================
            if (config.allowedRoles) {
                if (!req.user) {
                    return sendError(res, 401, "Vui lòng đăng nhập để thực hiện hành động này.");
                }

                if (!config.allowedRoles.includes(req.user.role)) {
                    return sendError(res, 403, "Bạn không có quyền tải ảnh lên cho danh mục này.");
                }
            }
            // ==========================================

            if (!mongoose.Types.ObjectId.isValid(objectId)) {
                return sendError(res, 400, "Định dạng objectId không hợp lệ.");
            }

            // 3. Kiểm tra sự tồn tại trong Database
            const Model = config.model;
            const entityExists = await Model.findById(objectId).lean();

            if (!entityExists) {
                return sendError(res, 404, `Không tìm thấy đối tượng với ID ${objectId}`);
            }

            // ==========================================
            // FIX LỖI IDOR: KIỂM TRA QUYỀN SỞ HỮU (OWNERSHIP)
            // ==========================================
            // Nếu người gọi là User bình thường (role === 0) VÀ config có yêu cầu check owner
            if (req.user && req.user.role === 0 && config.ownerField) {
                const ownerId = entityExists[config.ownerField];

                // So sánh ownerId trong DB với userId của token đang gọi API
                if (!ownerId || ownerId.toString() !== req.user.userId.toString()) {
                    return sendError(res, 403, "Truy cập bị từ chối. Bạn không phải là chủ sở hữu của đối tượng này.");
                }
            }
            // (Admin hoặc Employee role 1, 2 sẽ được pass qua để hỗ trợ upload ảnh thay cho khách hàng)
            // ==========================================

            // 4. Tiến hành Upload & Lưu DB
            const folder = config.folder;
            let finalData = null;

            if (req.files && req.files.length > 0) {
                const results = await uploadMultipleFilesToCloudinary(req.files, folder);
                const urls = results.map(item => item.url);

                if (config.isMultiple) {
                    await Model.findByIdAndUpdate(objectId, { $push: { [config.imageField]: { $each: urls } } });
                } else {
                    await Model.findByIdAndUpdate(objectId, { [config.imageField]: urls[0] });
                }
                finalData = results;
            }
            else if (req.file) {
                const result = await uploadFileToCloudinary(req.file, folder);

                if (config.isMultiple) {
                    await Model.findByIdAndUpdate(objectId, { $push: { [config.imageField]: result.url } });
                } else {
                    await Model.findByIdAndUpdate(objectId, { [config.imageField]: result.url });
                }
                finalData = [result];
            }
            else {
                return sendError(res, 400, "Vui lòng đính kèm ít nhất một file ảnh/video.");
            }

            return sendSuccess(res, 200, "Upload và cập nhật Database thành công", finalData);

        } catch (error) {
            console.error("Upload error:", error);
            return sendError(res, 500, error.message || "Lỗi hệ thống khi upload ảnh.");
        }
    }
};

module.exports = uploadController;