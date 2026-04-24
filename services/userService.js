const User = require('../models/User');
const { paginateQuery } = require('../utils/paginationHelper');

const userService = {
    // 1. PROCESS LẤY DANH SÁCH (Có tìm kiếm đa trường)
    getUsersProcess: async (page = 1, limit = 20, filters = {}) => {
        const { search, role, isActive } = filters;
        const query = {};

        // Dynamic Query: Search theo Tên, Số điện thoại hoặc Email
        if (search) {
            query.$or = [
                { Name: { $regex: search, $options: 'i' } },
                { Phone: { $regex: search, $options: 'i' } },
                { Email: { $regex: search, $options: 'i' } }
            ];
        }

        if (role !== undefined && role !== "") {
            query.Role = Number(role);
        }

        if (isActive !== undefined && isActive !== "") {
            query.isActive = isActive === 'true';
        }

        // Tích hợp paginationHelper. Bắt buộc loại bỏ field bảo mật bằng .select()
        return await paginateQuery(User, query, page, limit, {
            dataKey: 'users',
            select: '-HashedRefreshToken -otpCode -otpTime' // Data Leakage Defense
        });
    },

    // 2. PROCESS LẤY CHI TIẾT
    getUserDetailProcess: async (userId) => {
        // Read-only -> Bắt buộc dùng .lean()
        const user = await User.findById(userId)
            .select('-HashedRefreshToken -otpCode -otpTime')
            .lean();

        if (!user) {
            throw new Error("NOT_FOUND: Không tìm thấy tài khoản này trong hệ thống.");
        }

        return user;
    },

    // 3. PROCESS CẬP NHẬT
    updateUserProcess: async (userId, updateData) => {
        // Cập nhật và lấy ra data mới, chặn rò rỉ field bảo mật
        const updatedUser = await User.findByIdAndUpdate(userId, updateData, { new: true })
            .select('-HashedRefreshToken -otpCode -otpTime')
            .lean();

        if (!updatedUser) {
            throw new Error("NOT_FOUND: Không tìm thấy tài khoản để cập nhật.");
        }

        return updatedUser;
    },

    // 4. PROCESS KHÓA / MỞ KHÓA
    toggleUserStatusProcess: async (userId, isActiveStatus) => {
        const user = await User.findById(userId);

        if (!user) {
            throw new Error("NOT_FOUND: Không tìm thấy tài khoản để thay đổi trạng thái.");
        }

        // Chống Admin tự khóa chính mình (Tùy chọn bổ sung an toàn)
        if (user.Role === 2 && isActiveStatus === false) {
            throw new Error("FORBIDDEN: Không thể khóa tài khoản của Quản trị viên cấp cao.");
        }

        user.isActive = isActiveStatus;

        // Nếu bị khóa, clear luôn RefreshToken để ép văng khỏi ứng dụng
        if (!isActiveStatus) {
            user.HashedRefreshToken = null;
        }

        await user.save();

        return {
            _id: user._id,
            Name: user.Name,
            isActive: user.isActive
        };
    },

    checkPhoneProcess: async (phone) => {
        // Read-only -> Bắt buộc dùng .lean(), đồng thời chỉ lấy ra những field cần thiết
        const user = await User.findOne({ Phone: phone })
            .select('_id Name Phone Email Role isActive')
            .lean();

        if (!user) {
            // Quăng lỗi chuẩn Prefix để errorHandler map ra HTTP Code 404
            throw new Error("NOT_FOUND: Không tìm thấy khách hàng với số điện thoại này.");
        }

        return user;
    }
};

module.exports = userService;