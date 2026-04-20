const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");

const cloudinaryService = {
    // Upload 1 file
    uploadFileProcess: (file, folder = "uploads") => {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                { folder: folder, resource_type: "auto" },
                (error, result) => {
                    if (error) return reject(new Error("INTERNAL_SERVER_ERROR: Lỗi upload Cloudinary."));
                    resolve({ url: result.secure_url, publicId: result.public_id });
                }
            );
            streamifier.createReadStream(file.buffer).pipe(uploadStream);
        });
    },

    // Upload nhiều file
    uploadMultipleFilesProcess: async (files, folder = "uploads") => {
        const uploadPromises = files.map((file) => cloudinaryService.uploadFileProcess(file, folder));
        return Promise.all(uploadPromises);
    },

    // Xóa file
    deleteFileProcess: async (imageUrl) => {
        try {
            if (!imageUrl) return null;

            const parts = imageUrl.split('/');
            const uploadIndex = parts.indexOf('upload');
            if (uploadIndex === -1) throw new Error("BAD_REQUEST: Đường dẫn ảnh Cloudinary không hợp lệ.");

            let startIndex = uploadIndex + 1;
            if (parts[startIndex].match(/^v\d+$/)) startIndex++;

            const publicIdWithExt = parts.slice(startIndex).join('/');
            const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));

            return new Promise((resolve, reject) => {
                cloudinary.uploader.destroy(publicId, (error, result) => {
                    if (error) return reject(new Error("INTERNAL_SERVER_ERROR: Không thể xóa ảnh trên Cloudinary."));
                    resolve(result);
                });
            });
        } catch (error) {
            throw error; // Quăng tiếp lỗi đã có Prefix lên trên
        }
    }
};

module.exports = cloudinaryService;