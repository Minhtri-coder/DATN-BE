const { sendError } = require('./response');

const handleError = (res, error) => {
    const message = error.message || "";

    // 404 Not Found
    if (message.includes("NOT_FOUND")) {
        return sendError(res, 404, message.replace("NOT_FOUND: ", ""));
    }

    // 400 Bad Request
    if (message.includes("BAD_REQUEST")) {
        return sendError(res, 400, message.replace("BAD_REQUEST: ", ""));
    }

    // 401 Unauthorized
    if (message.includes("UNAUTHORIZED")) {
        return sendError(res, 401, message.replace("UNAUTHORIZED: ", ""));
    }

    // 403 Forbidden
    if (message.includes("FORBIDDEN")) {
        return sendError(res, 403, message.replace("FORBIDDEN: ", ""));
    }

    // 409 Conflict
    if (message.includes("CONFLICT")) {
        return sendError(res, 409, message.replace("CONFLICT: ", ""));
    }

    // Mongoose Validation Error
    if (error.name === "ValidationError") {
        return sendError(res, 400, "Dữ liệu không hợp lệ. Vui lòng kiểm tra lại các trường thông tin.");
    }

    console.error("🔥 System Error:", error);
    return sendError(res, 500, "Lỗi hệ thống nội bộ.");
};

module.exports = handleError;