const { sendError } = require("../utils/response");

// Cách dùng trong router: authorizeRoles(1, 2) cho employee và admin, authorizeRoles(2) cho admin
const authorizeRoles = (...allowedRoles) => {
    // Đảm bảo các roles truyền vào router đều là dạng số
    const allowed = allowedRoles.map(Number);

    return (req, res, next) => {
        if (!req.user) {
            return sendError(res, 401, "Chưa xác thực người dùng.");
        }

        const userRole = Number(req.user.role ?? 0);

        if (!allowed.includes(userRole)) {
            return sendError(res, 403, "Bạn không có quyền thực hiện hành động này.");
        }

        next();
    };
};

module.exports = authorizeRoles;