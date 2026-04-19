const jwt = require("jsonwebtoken");
const { sendError } = require("../utils/response");

function authMiddleware(req, res, next) {
    const authHeader = req.headers.authorization;

    if (!process.env.JWT_ACCESS_SECRET) {
        return sendError(res, 500, "Server thiếu JWT_ACCESS_SECRET.");
    }

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return sendError(res, 401, "Vui lòng đăng nhập để tiếp tục.");
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
        return sendError(res, 401, "Thiếu access token.");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // Chuẩn hoá payload
        req.user = {
            userId: decoded.userId ?? decoded.id, // fallback nếu token dùng "id"
            role: Number(decoded.role ?? decoded.Role ?? 0), // Ép kiểu về Number, mặc định là 0 (user)
            ...decoded,
        };

        if (!req.user.userId) {
            return sendError(res, 401, "Token thiếu userId.");
        }

        return next();
    } catch (error) {
        if (error?.name === "TokenExpiredError") {
            return sendError(res, 401, "Phiên đăng nhập đã hết hạn.");
        }
        return sendError(res, 401, "Token không hợp lệ.");
    }
}

module.exports = authMiddleware;