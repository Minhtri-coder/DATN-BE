const User = require('../models/User'); // Đảm bảo đường dẫn DB chuẩn
const Pet = require('../models/Pet');
const RoomType = require('../models/RoomType');
const cloudinaryService = require('./cloudinaryService');

const ENTITY_CONFIG = {
    profile: { folder: "app/profiles", model: User, imageField: 'AvatarURL', isMultiple: false, allowedRoles: [0, 1, 2], ownerField: '_id' },
    pet: { folder: "app/pets", model: Pet, imageField: 'Image', isMultiple: false, allowedRoles: [0, 1, 2], ownerField: 'UserID' },
    room: { folder: "app/rooms", model: RoomType, imageField: 'Images', isMultiple: true, allowedRoles: [1, 2], ownerField: null },
};

const uploadService = {
    uploadMediaProcess: async (entityType, objectId, user, files, singleFile, replaceOld = false, keptImages = []) => {
        const config = ENTITY_CONFIG[entityType];
        if (!config) throw new Error("BAD_REQUEST: Danh mục tải ảnh (entityType) không hợp lệ.");

        // 1. Phân quyền Role (RBAC)
        if (config.allowedRoles) {
            if (!user) throw new Error("UNAUTHORIZED: Vui lòng đăng nhập.");
            if (!config.allowedRoles.includes(user.role)) {
                throw new Error("FORBIDDEN: Bạn không có quyền tải ảnh lên cho danh mục này.");
            }
        }

        // 2. Tiền xử lý mảng file an toàn
        let uploadedFiles = [];
        if (Array.isArray(files)) {
            uploadedFiles = files;
        } else if (files && typeof files === 'object') {
            Object.values(files).forEach(arr => uploadedFiles.push(...arr));
        }

        // Kiểm tra Logic Upload Multiple/Single
        if (!config.isMultiple && uploadedFiles.length > 1) {
            throw new Error(`BAD_REQUEST: Danh mục '${entityType}' chỉ cho phép tải lên duy nhất 1 ảnh.`);
        }

        // 3. Kiểm tra đối tượng trong DB
        const Model = config.model;
        const entityExists = await Model.findById(objectId).lean();
        if (!entityExists) throw new Error(`NOT_FOUND: Không tìm thấy đối tượng với ID ${objectId}`);

        // 4. Kiểm tra quyền sở hữu (IDOR)
        if (user && user.role === 0 && config.ownerField) {
            const ownerId = entityExists[config.ownerField];
            if (!ownerId || ownerId.toString() !== user.userId.toString()) {
                throw new Error("FORBIDDEN: Truy cập bị từ chối. Bạn không phải là chủ sở hữu.");
            }
        }

        // 5. AUTO-REPLACE: Dọn dẹp ảnh cũ trên Cloudinary
        if (!config.isMultiple && entityExists[config.imageField]) {
            // Đối tượng 1 ảnh (Pet/User): Luôn xóa ảnh cũ nếu có up ảnh mới
            if (uploadedFiles.length > 0 || singleFile) {
                const oldImageUrl = entityExists[config.imageField];
                if (typeof oldImageUrl === 'string' && oldImageUrl.includes('cloudinary.com')) {
                    try {
                        await cloudinaryService.deleteFileProcess(oldImageUrl);
                    } catch (err) {
                        console.warn(`[Cloudinary] Bỏ qua lỗi xóa ảnh cũ đơn: ${err.message}`);
                    }
                }
            }
        } else if (config.isMultiple && replaceOld && entityExists[config.imageField] && entityExists[config.imageField].length > 0) {
            // Đối tượng mảng ảnh (Room): Chỉ xóa những ảnh không nằm trong danh sách keptImages
            const oldImages = entityExists[config.imageField];
            const imagesToDelete = oldImages.filter(url => !keptImages.includes(url));

            const deletePromises = imagesToDelete.map(url => {
                if (typeof url === 'string' && url.includes('cloudinary.com')) {
                    return cloudinaryService.deleteFileProcess(url).catch(err =>
                        console.warn(`[Cloudinary] Bỏ qua lỗi xóa ảnh mảng: ${err.message}`)
                    );
                }
            });
            await Promise.all(deletePromises);
        }

        // 6. Upload ảnh mới lên Cloudinary (nếu có file gửi lên)
        const folder = config.folder;
        let finalData = null;
        let newUploadedUrls = [];

        if (uploadedFiles.length > 0) {
            const results = await cloudinaryService.uploadMultipleFilesProcess(uploadedFiles, folder);
            newUploadedUrls = results.map(item => item.url);
            finalData = results;
        } else if (singleFile) {
            const result = await cloudinaryService.uploadFileProcess(singleFile, folder);
            newUploadedUrls = [result.url];
            finalData = [result];
        }

        // 7. Lưu Database thông minh
        if (config.isMultiple) {
            if (replaceOld) {
                // Upsert: Gộp ảnh giữ lại và ảnh mới upload thành mảng hoàn chỉnh
                const finalUrlsToSave = [...keptImages, ...newUploadedUrls];
                await Model.findByIdAndUpdate(objectId, { [config.imageField]: finalUrlsToSave });

                finalData = { uploaded: finalData, currentGallery: finalUrlsToSave };
            } else {
                // Append: Nối thêm ảnh mới
                if (newUploadedUrls.length > 0) {
                    await Model.findByIdAndUpdate(objectId, { $push: { [config.imageField]: { $each: newUploadedUrls } } });
                }
            }
        } else {
            // Cập nhật 1 ảnh cho Pet/User
            if (newUploadedUrls.length > 0) {
                await Model.findByIdAndUpdate(objectId, { [config.imageField]: newUploadedUrls[0] });
            }
        }

        return finalData || { message: "Đã cập nhật dữ liệu thành công nhưng không có ảnh mới upload." };
    }
};

module.exports = uploadService;