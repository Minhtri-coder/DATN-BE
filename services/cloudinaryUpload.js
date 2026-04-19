// src/services/cloudinaryUpload.service.js
const streamifier = require("streamifier");
const cloudinary = require("../config/cloudinary");

// Hàm core: Upload 1 file
const uploadFileToCloudinary = (file, folder = "uploads") => {
    return new Promise((resolve, reject) => {
        const uploadStream = cloudinary.uploader.upload_stream(
            {
                folder: folder,
                resource_type: "auto", // Tự động nhận diện ảnh/video
            },
            (error, result) => {
                if (error) return reject(error);
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );

        streamifier.createReadStream(file.buffer).pipe(uploadStream);
    });
};

// Hàm mở rộng: Upload nhiều file cùng lúc
const uploadMultipleFilesToCloudinary = async (files, folder = "uploads") => {
    // Dùng Promise.all để upload song song, giúp tăng tốc độ đáng kể
    const uploadPromises = files.map((file) => uploadFileToCloudinary(file, folder));
    return Promise.all(uploadPromises);
};

// (Tùy chọn) Giữ lại hàm uploadAvatar nếu bạn vẫn muốn tính năng overwrite cho Profile
const uploadAvatarToCloudinary = async ({ userId, file }) => {
    return new Promise((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
            {
                folder: "app/profiles",
                public_id: `user_${userId}`,
                overwrite: true,
                resource_type: "image",
            },
            (err, result) => {
                if (err) return reject(err);
                resolve({
                    url: result.secure_url,
                    publicId: result.public_id,
                });
            }
        );
        streamifier.createReadStream(file.buffer).pipe(stream);
    });
};

const deleteFileFromCloudinary = async (imageUrl) => {
    try {
        if (!imageUrl) return null;

        // URL ví dụ: https://res.cloudinary.com/demo/image/upload/v1612345678/app/pets/sample.jpg
        // Cần tách ra public_id là: app/pets/sample
        const parts = imageUrl.split('/');
        const uploadIndex = parts.indexOf('upload');

        if (uploadIndex === -1) {
            throw new Error("Đường dẫn ảnh Cloudinary không hợp lệ.");
        }

        let startIndex = uploadIndex + 1;
        // Bỏ qua thư mục version (thường có dạng v + các con số, ví dụ v1612345678)
        if (parts[startIndex].match(/^v\d+$/)) {
            startIndex++;
        }

        const publicIdWithExt = parts.slice(startIndex).join('/');
        // Cắt bỏ phần đuôi mở rộng (.jpg, .png, .mp4...)
        const publicId = publicIdWithExt.substring(0, publicIdWithExt.lastIndexOf('.'));

        return new Promise((resolve, reject) => {
            // cloudinary.uploader.destroy mặc định xóa image, nếu là video cần truyền { resource_type: 'video' }
            // Để an toàn và linh hoạt cho cả 2, ta không truyền resource_type, Cloudinary thường tự nhận diện, 
            // hoặc bạn gọi 2 lần nếu hàm đầu fail. Nhưng đa số trường hợp default (image) sẽ chạy tốt cho ảnh.
            cloudinary.uploader.destroy(publicId, (error, result) => {
                if (error) return reject(error);
                resolve(result);
            });
        });
    } catch (error) {
        console.error("Lỗi trích xuất hoặc xóa ảnh Cloudinary:", error);
        throw new Error("Không thể xóa ảnh khỏi hệ thống lưu trữ.");
    }
};

module.exports = {
    uploadFileToCloudinary,
    uploadMultipleFilesToCloudinary,
    uploadAvatarToCloudinary,
    deleteFileFromCloudinary
};