const RoomType = require('../models/RoomType');
const Box = require('../models/Box');

const roomService = {
    // ==========================================
    // NGHIỆP VỤ PHÒNG (ROOM) DÀNH CHO ADMIN
    // ==========================================

    getRoomsProcess: async (page = 1, limit = 20, status) => {
        const query = {};
        if (status) {
            // status truyền vào có thể là chuỗi: "DRAFT,DELETED,ACTIVE"
            query.Status = { $in: status.split(',').map(s => s.trim()) };
        }

        const skip = (page - 1) * limit;
        const rooms = await RoomType.find(query)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(Number(limit))
            .lean(); // Dùng lean() để tối ưu object trả về

        const total = await RoomType.countDocuments(query);

        return { total, page: Number(page), limit: Number(limit), rooms };
    },

    getRoomDetailProcess: async (roomId) => {
        const room = await RoomType.findById(roomId).lean();
        if (!room) throw new Error("NOT_FOUND: Không tìm thấy phòng");

        // Lấy số lượng chuồng theo từng loại size thuộc phòng này
        const boxCounts = await Box.aggregate([
            { $match: { RoomTypeID: room._id, Status: { $ne: 'Deleted' } } },
            { $group: { _id: "$SizeCategory", count: { $sum: 1 } } }
        ]);

        return { room, boxCounts };
    },

    createRoomProcess: async (roomData) => {
        const newRoom = new RoomType(roomData);
        const savedRoom = await newRoom.save();
        return savedRoom.toObject();
    },

    updateRoomProcess: async (roomId, roomData) => {
        const updatedRoom = await RoomType.findByIdAndUpdate(roomId, roomData, { new: true }).lean();
        if (!updatedRoom) throw new Error("NOT_FOUND: Không tìm thấy phòng để cập nhật");
        return updatedRoom;
    },

    deleteRoomProcess: async (roomId) => {
        // Check coi TẤT CẢ các chuồng đã có Status = 'Deleted' hết chưa
        // Thực hiện bằng cách tìm xem có tồn tại chuồng nào có Status KHÁC 'Deleted' không
        const unDeletedBoxesCount = await Box.countDocuments({
            RoomTypeID: roomId,
            Status: { $ne: 'Deleted' }
        });

        // Nếu lớn hơn 0 nghĩa là vẫn còn chuồng đang Available, Occupied hoặc Maintenance
        if (unDeletedBoxesCount > 0) {
            throw new Error("CONFLICT: Không thể ẩn phòng vì vẫn còn chuồng chưa được xóa (Status khác Deleted). Vui lòng xóa hết chuồng trước.");
        }

        const deletedRoom = await RoomType.findByIdAndUpdate(roomId, { Status: 'DELETED' }, { new: true }).lean();
        if (!deletedRoom) throw new Error("NOT_FOUND: Không tìm thấy phòng để ẩn");

        return true;
    },

    // ==========================================
    // NGHIỆP VỤ CHUỒNG (BOX) DÀNH CHO ADMIN
    // ==========================================

    addBoxesBulkProcess: async (roomId, configs) => {
        const room = await RoomType.findById(roomId).lean();
        if (!room) throw new Error("NOT_FOUND: Không tìm thấy phòng");

        let boxesToInsert = [];

        // Chỉ cho phép tăng số lượng chuồng (tạo mới)
        for (const config of configs) {
            const { SizeCategory, Quantity, Price } = config;

            if (!Quantity || Quantity <= 0) continue;

            // Đếm số chuồng hiện tại để đặt tên (BoxName) cho không bị trùng
            const currentCount = await Box.countDocuments({ RoomTypeID: roomId, SizeCategory });

            for (let i = 1; i <= Quantity; i++) {
                boxesToInsert.push({
                    RoomTypeID: roomId,
                    BoxName: `${room.Name} - Size ${SizeCategory} - ${currentCount + i}`,
                    SizeCategory,
                    Price,
                    Status: 'Available'
                });
            }
        }

        if (boxesToInsert.length === 0) throw new Error("BAD_REQUEST: Dữ liệu cấu hình số lượng chuồng không hợp lệ");

        const createdBoxes = await Box.insertMany(boxesToInsert);
        return createdBoxes;
    },

    getBoxesByRoomProcess: async (roomId, size, status) => {
        const query = { RoomTypeID: roomId };

        if (size) query.SizeCategory = size.toUpperCase();
        if (status) query.Status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();

        const boxes = await Box.find(query)
            .sort({ createdAt: -1 })
            .lean();

        return boxes;
    },

    getBoxDetailProcess: async (boxId) => {
        const box = await Box.findById(boxId)
            .populate('RoomTypeID', 'Name TempType')
            .lean();

        if (!box) throw new Error("NOT_FOUND: Không tìm thấy chuồng");
        return box;
    },

    updateBoxProcess: async (boxId, updateData) => {
        const updatedBox = await Box.findByIdAndUpdate(boxId, updateData, { new: true }).lean();
        if (!updatedBox) throw new Error("NOT_FOUND: Không tìm thấy chuồng để cập nhật");
        return updatedBox;
    },

    deleteBoxProcess: async (boxId) => {
        const box = await Box.findById(boxId);
        if (!box) throw new Error("NOT_FOUND: Không tìm thấy chuồng");

        // LƯU Ý SỬA LỖI JS CỦA BẠN: Không dùng !== với Array được. Phải dùng .includes()
        // Chỉ cho phép xóa nếu Status đang là Available hoặc Maintenance
        const allowedStatuses = ['Available', 'Maintenance'];
        if (!allowedStatuses.includes(box.Status)) {
            throw new Error("CONFLICT: Chỉ được ẩn chuồng khi trạng thái là Available (Trống) hoặc Maintenance (Bảo trì)");
        }

        box.Status = 'Deleted';
        await box.save();
        return true;
    }
};

module.exports = roomService;