const mongoose = require('mongoose');
const { sendError } = require('../utils/response');

/**
 * Middleware kiểm tra Param truyền vào có bị "null", "undefined" 
 * hoặc có phải là MongoDB ObjectId hợp lệ hay không.
 * * @param {String} paramName - Tên của param cần kiểm tra (mặc định là 'id')
 */
const validateObjectIdParam = (paramName = 'id') => {
    return (req, res, next) => {
        const paramValue = req.params[paramName];

        // 1. Chặn trường hợp Frontend gửi chuỗi "null", "undefined" hoặc để trống
        if (!paramValue || paramValue === 'null' || paramValue === 'undefined') {
            return sendError(res, 400, `Tham số '${paramName}' bị trống hoặc không hợp lệ.`);
        }

        // 2. Chặn trường hợp ID không đúng chuẩn Mongoose (24 ký tự hex)
        if (!mongoose.Types.ObjectId.isValid(paramValue)) {
            return sendError(res, 400, `Tham số '${paramName}' không đúng định dạng ID của hệ thống.`);
        }

        // Vượt qua hết thì cho đi tiếp vào Controller
        next();
    };
};

module.exports = {
    validateObjectIdParam
};