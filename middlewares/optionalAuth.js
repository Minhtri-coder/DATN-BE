const jwt = require("jsonwebtoken");
const { sendError } = require("../utils/response"); // Đảm bảo đường dẫn này đúng với project của bạn

function optionalAuth(req, res, next) {
    const authHeader = req.headers.authorization;

    // Không gửi token => coi như guest (khách vãng lai), cho phép đi tiếp
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return next();
    }

    if (!process.env.JWT_ACCESS_SECRET) {
        return sendError(res, 500, "Server thiếu JWT_ACCESS_SECRET.");
    }

    const token = authHeader.slice("Bearer ".length).trim();
    if (!token) {
        return sendError(res, 401, "Thiếu access token.");
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_ACCESS_SECRET);

        // Chuẩn hoá payload
        req.user = {
            userId: decoded.userId ?? decoded.id,
            role: Number(decoded.role ?? decoded.Role ?? 0),
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

module.exports = optionalAuth;