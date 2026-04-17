// src/controllers/uploadController.js
const { uploadFileToCloudinary } = require('../services/cloudinaryUpload');
const { sendSuccess, sendError } = require('../utils/response');

const uploadController = {
    uploadImage: async (req, res) => {
        try {
            const file = req.file;

            if (!file) {
                return sendError(res, 400, "Vui lòng đính kèm một file ảnh.");
            }

            const result = await uploadFileToCloudinary(file, "app/general");

            return sendSuccess(res, 200, "Upload ảnh thành công", {
                url: result.url,
                publicId: result.publicId
            });
        } catch (error) {
            return sendError(res, 500, error.message || "Lỗi khi upload ảnh.");
        }
    }
};

module.exports = uploadController;