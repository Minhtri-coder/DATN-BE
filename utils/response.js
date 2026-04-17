// src/utils/response.js

/**
 * Trả về response thành công
 * @param {Object} res - Đối tượng response của Express
 * @param {Number} statusCode - Mã HTTP status (mặc định 200)
 * @param {String} message - Thông báo (VD: "Đăng nhập thành công")
 * @param {Object|Array} data - Dữ liệu trả về (mặc định null)
 * @param {Object} meta - Siêu dữ liệu phụ trợ (ví dụ phân trang) (mặc định null)
 */
const sendSuccess = (res, statusCode = 200, message = "Thành công", data = null, meta = null) => {
    const response = {
        status: true,
        message: message,
    };

    if (data !== null) response.data = data;
    if (meta !== null) response.meta = meta;

    return res.status(statusCode).json(response);
};

/**
 * Trả về response lỗi
 * @param {Object} res - Đối tượng response của Express
 * @param {Number} statusCode - Mã HTTP status (mặc định 500)
 * @param {String} message - Thông báo lỗi (VD: "Lỗi hệ thống")
 * @param {Object|Array} errors - Chi tiết lỗi phụ trợ (VD: mảng lỗi validation) (mặc định null)
 */
const sendError = (res, statusCode = 500, message = "Đã xảy ra lỗi hệ thống", errors = null) => {
    const response = {
        status: false,
        message: message,
    };

    if (errors !== null) response.errors = errors;

    return res.status(statusCode).json(response);
};

module.exports = {
    sendSuccess,
    sendError
};