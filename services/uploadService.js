const User = require('../models/User');
const Pet = require('../models/Pet');
const RoomType = require('../models/RoomType');
const cloudinaryService = require('./cloudinaryService');

const ENTITY_CONFIG = {
    profile: { folder: "app/profiles", model: User, imageField: 'AvatarURL', isMultiple: false, allowedRoles: [0, 1, 2], ownerField: '_id' },
    pet: { folder: "app/pets", model: Pet, imageField: 'Image', isMultiple: false, allowedRoles: [0, 1, 2], ownerField: 'UserID' },
    room: { folder: "app/rooms", model: RoomType, imageField: 'Images', isMultiple: true, allowedRoles: [1, 2], ownerField: null },
};

const uploadService = {
    uploadMediaProcess: async (entityType, objectId, user, files, singleFile) => {
        const config = ENTITY_CONFIG[entityType];
        if (!config) throw new Error("BAD_REQUEST: Danh mục tải ảnh (entityType) không hợp lệ.");

        // 1. Phân quyền Role (RBAC)
        if (config.allowedRoles) {
            if (!user) throw new Error("UNAUTHORIZED: Vui lòng đăng nhập.");
            if (!config.allowedRoles.includes(user.role)) {
                throw new Error("FORBIDDEN: Bạn không có quyền tải ảnh lên cho danh mục này.");
            }
        }

        // --- TIỀN XỬ LÝ MẢNG FILE AN TOÀN ---
        let uploadedFiles = [];
        if (Array.isArray(files)) {
            uploadedFiles = files;
        } else if (files && typeof files === 'object') {
            // Trường hợp Multer dùng .fields() trả về Object
            Object.values(files).forEach(arr => uploadedFiles.push(...arr));
        }

        // 2. Kiểm tra Logic Upload Multiple/Single
        if (!config.isMultiple && uploadedFiles.length > 1) {
            throw new Error(`BAD_REQUEST: Danh mục '${entityType}' chỉ cho phép tải lên duy nhất 1 ảnh.`);
        }

        // 3. Kiểm tra đối tượng trong DB (Dùng .lean())
        const Model = config.model;
        const entityExists = await Model.findById(objectId).lean();
        if (!entityExists) throw new Error(`NOT_FOUND: Không tìm thấy đối tượng với ID ${objectId}`);

        // 4. Kiểm tra quyền sở hữu (IDOR) - Chỉ check nếu là User thường (role 0)
        if (user && user.role === 0 && config.ownerField) {
            const ownerId = entityExists[config.ownerField];
            if (!ownerId || ownerId.toString() !== user.userId.toString()) {
                throw new Error("FORBIDDEN: Truy cập bị từ chối. Bạn không phải là chủ sở hữu.");
            }
        }

        // 5. AUTO-REPLACE: Xóa ảnh cũ (Nếu là upload thay thế)
        if (!config.isMultiple && entityExists[config.imageField]) {
            const oldImageUrl = entityExists[config.imageField];
            if (typeof oldImageUrl === 'string' && oldImageUrl.includes('cloudinary.com')) {
                try {
                    await cloudinaryService.deleteFileProcess(oldImageUrl);
                } catch (err) {
                    console.warn(`[Cloudinary] Bỏ qua lỗi xóa ảnh cũ: ${err.message}`);
                }
            }
        }

        // 6. Upload ảnh mới và Lưu DB
        const folder = config.folder;
        let finalData = null;

        if (uploadedFiles.length > 0) {
            const results = await cloudinaryService.uploadMultipleFilesProcess(uploadedFiles, folder);
            const urls = results.map(item => item.url);

            if (config.isMultiple) {
                await Model.findByIdAndUpdate(objectId, { $push: { [config.imageField]: { $each: urls } } });
            } else {
                await Model.findByIdAndUpdate(objectId, { [config.imageField]: urls[0] });
            }
            finalData = results;
        } else if (singleFile) {
            const result = await cloudinaryService.uploadFileProcess(singleFile, folder);

            if (config.isMultiple) {
                await Model.findByIdAndUpdate(objectId, { $push: { [config.imageField]: result.url } });
            } else {
                await Model.findByIdAndUpdate(objectId, { [config.imageField]: result.url });
            }
            finalData = [result];
        }

        return finalData;
    }
};

module.exports = uploadService;