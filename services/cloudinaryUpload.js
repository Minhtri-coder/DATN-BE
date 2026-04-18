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

module.exports = {
    uploadFileToCloudinary,
    uploadMultipleFilesToCloudinary,
    uploadAvatarToCloudinary
};