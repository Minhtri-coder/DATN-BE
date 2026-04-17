// src/utils/jwt.js
const jwt = require("jsonwebtoken");

function signAccessToken(payload) {
    return jwt.sign(payload, process.env.JWT_ACCESS_SECRET, {
        expiresIn: process.env.JWT_ACCESS_EXPIRES_IN || "15m"
    });
}

function signRefreshToken(payload) {
    return jwt.sign(payload, process.env.JWT_REFRESH_SECRET, {
        expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || "7d"
    });
}

function verifyRefreshToken(token) {
    return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
}

// Thêm 2 hàm xử lý cho Register Token
function signRegisterToken(payload) {
    return jwt.sign(payload, process.env.JWT_REGISTER_SECRET || "register_secret", {
        expiresIn: "5m" // Thường cho 15 phút để hoàn tất điền form đăng ký
    });
}

function verifyRegisterToken(token) {
    return jwt.verify(token, process.env.JWT_REGISTER_SECRET || "register_secret");
}

module.exports = {
    signAccessToken,
    signRefreshToken,
    verifyRefreshToken,
    signRegisterToken,
    verifyRegisterToken
};