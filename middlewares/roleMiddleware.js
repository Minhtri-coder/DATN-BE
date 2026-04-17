// Cách dùng trong router: authorizeRoles(1, 2) cho employee và admin, authorizeRoles(2) cho admin
const authorizeRoles = (...allowedRoles) => {
    // Đảm bảo các roles truyền vào router đều là dạng số
    const allowed = allowedRoles.map(Number);

    return (req, res, next) => {
        if (!req.user) {
            return res.status(401).json({ message: "Chưa xác thực." });
        }

        const userRole = Number(req.user.role ?? 0);

        if (!allowed.includes(userRole)) {
            return res.status(403).json({ message: "Bạn không có quyền truy cập." });
        }

        next();
    };
};

module.exports = authorizeRoles;