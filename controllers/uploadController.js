// src/controllers/uploadController.js
const mongoose = require('mongoose');
const { uploadFileToCloudinary, uploadMultipleFilesToCloudinary, deleteFileFromCloudinary } = require('../services/cloudinaryUpload'); // Đảm bảo đúng tên file service
const { sendSuccess, sendError } = require('../utils/response');

const User = require('../models/User');
const Pet = require('../models/Pet');

const ENTITY_CONFIG = {
    profile: { folder: "app/profiles", model: User, imageField: 'AvatarURL', isMultiple: false, allowedRoles: [0, 1, 2], ownerField: '_id' },
    pet: { folder: "app/pets", model: Pet, imageField: 'Image', isMultiple: false, allowedRoles: [0, 1, 2], ownerField: 'UserID' },
};

const uploadController = {
    uploadMedia: async (req, res) => {
        try {
            const { entityType, objectId } = req.body;

            // 1. Kiểm tra đầu vào
            if (!entityType || !objectId) {
                return sendError(res, 400, "Bắt buộc phải truyền lên entityType và objectId.");
            }

            const config = ENTITY_CONFIG[entityType];
            if (!config) return sendError(res, 400, "entityType không hợp lệ.");

            // 2. Kiểm tra phân quyền (RBAC)
            if (config.allowedRoles) {
                if (!req.user) return sendError(res, 401, "Vui lòng đăng nhập.");
                if (!config.allowedRoles.includes(req.user.role)) {
                    return sendError(res, 403, "Bạn không có quyền tải ảnh lên cho danh mục này.");
                }
            }

            if (!mongoose.Types.ObjectId.isValid(objectId)) {
                return sendError(res, 400, "Định dạng objectId không hợp lệ.");
            }

            // 3. Kiểm tra file đính kèm
            if ((!req.files || req.files.length === 0) && !req.file) {
                return sendError(res, 400, "Vui lòng đính kèm ít nhất một file ảnh/video.");
            }

            // ==========================================
            // FIX LỖI UP NHIỀU ẢNH CHO PROFILE/PET
            // ==========================================
            if (!config.isMultiple) {
                // Nếu router dùng upload.array('files') thì dữ liệu nằm ở req.files
                if (req.files && req.files.length > 1) {
                    return sendError(res, 400, `Danh mục '${entityType}' chỉ cho phép tải lên duy nhất 1 ảnh.`);
                }
            }
            // ==========================================

            // 4. Kiểm tra sự tồn tại trong DB
            const Model = config.model;
            const entityExists = await Model.findById(objectId).lean();

            if (!entityExists) {
                return sendError(res, 404, `Không tìm thấy đối tượng với ID ${objectId}`);
            }

            // 5. Kiểm tra IDOR (Quyền sở hữu)
            if (req.user && req.user.role === 0 && config.ownerField) {
                const ownerId = entityExists[config.ownerField];
                if (!ownerId || ownerId.toString() !== req.user.userId.toString()) {
                    return sendError(res, 403, "Truy cập bị từ chối. Bạn không phải là chủ sở hữu.");
                }
            }

            // ==========================================
            // 6. AUTO-REPLACE: XÓA ẢNH CŨ (NẾU CÓ) TRÊN CLOUDINARY
            // ==========================================
            if (!config.isMultiple && entityExists[config.imageField]) {
                const oldImageUrl = entityExists[config.imageField];
                if (typeof oldImageUrl === 'string' && oldImageUrl.includes('cloudinary.com')) {
                    try {
                        await deleteFileFromCloudinary(oldImageUrl);
                        console.log(`[Cloudinary] Đã dọn dẹp ảnh cũ: ${oldImageUrl}`);
                    } catch (err) {
                        console.warn(`[Cloudinary] Bỏ qua lỗi xóa ảnh cũ: ${err.message}`);
                    }
                }
            }
            // ==========================================

            // 7. Upload ảnh mới & Lưu DB
            const folder = config.folder;
            let finalData = null;

            // Mặc dù isMultiple = false, nhưng do dùng multer.array(), file vẫn có thể nằm trong req.files[0]
            if (req.files && req.files.length > 0) {
                const results = await uploadMultipleFilesToCloudinary(req.files, folder);
                const urls = results.map(item => item.url);

                if (config.isMultiple) {
                    await Model.findByIdAndUpdate(objectId, { $push: { [config.imageField]: { $each: urls } } });
                } else {
                    // Chắc chắn mảng chỉ có 1 phần tử vì đã bị chặn ở trên
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

            return sendSuccess(res, 200, "Cập nhật ảnh thành công.", finalData);

        } catch (error) {
            console.error("Upload error:", error);
            return sendError(res, 500, error.message || "Lỗi hệ thống khi upload ảnh.");
        }
    }
};

module.exports = uploadController;