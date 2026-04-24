const RoomType = require('../models/RoomType');
const Box = require('../models/Box');
const { paginateQuery } = require('../utils/paginationHelper');

const roomService = {
    // ==========================================
    // NGHIỆP VỤ PHÒNG (ROOM) DÀNH CHO ADMIN
    // ==========================================

    // Đã tối ưu bằng paginateQuery
    getRoomsProcess: async (page = 1, limit = 20, filters = {}) => {
        const { status, name, speciesType, behaviorType, tempType, healthSuitability } = filters;
        const query = {};

        if (status) {
            query.Status = { $in: status.split(',').map(s => s.trim()) };
        } else {
            query.Status = { $nin: ['Deleted'] };
        }

        if (name) query.Name = { $regex: name, $options: 'i' };
        if (speciesType) query.SpeciesType = speciesType;
        if (behaviorType) query.BehaviorType = behaviorType;
        if (tempType) query.TempType = tempType;
        if (healthSuitability) query.HealthSuitability = healthSuitability;

        return await paginateQuery(RoomType, query, page, limit, {
            dataKey: 'rooms'
        });
    },

    getRoomDetailProcess: async (roomId) => {
        const room = await RoomType.findById(roomId).lean();
        if (!room) throw new Error("NOT_FOUND: Không tìm thấy phòng");

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
        const unDeletedBoxesCount = await Box.countDocuments({
            RoomTypeID: roomId,
            Status: { $ne: 'Deleted' }
        });

        if (unDeletedBoxesCount > 0) {
            throw new Error("CONFLICT: Không thể ẩn phòng vì vẫn còn chuồng chưa được xóa (Status khác Deleted). Vui lòng xóa hết chuồng trước.");
        }

        const deletedRoom = await RoomType.findByIdAndUpdate(roomId, { Status: 'Deleted' }, { new: true }).lean();
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

        for (const config of configs) {
            const { SizeCategory, Quantity, Price } = config;

            if (!Quantity || Quantity <= 0) continue;

            const currentCount = await Box.countDocuments({ RoomTypeID: roomId, SizeCategory });

            for (let i = 1; i <= Quantity; i++) {
                boxesToInsert.push({
                    RoomTypeID: roomId,
                    BoxName: `${room.Name} - Size ${SizeCategory} - ${currentCount + i}`,
                    SizeCategory: SizeCategory,
                    Price,
                    Status: 'Available' // Mặc định khi tạo mới
                });
            }
        }

        if (boxesToInsert.length === 0) throw new Error("BAD_REQUEST: Dữ liệu cấu hình số lượng chuồng không hợp lệ");

        const createdBoxes = await Box.insertMany(boxesToInsert);
        return createdBoxes;
    },

    // Đã tối ưu bằng paginateQuery
    getBoxesByRoomProcess: async (roomId, page = 1, limit = 20, filters = {}) => {
        const { size, status, name } = filters;
        const query = { RoomTypeID: roomId };

        if (name) query.BoxName = { $regex: name, $options: 'i' };
        if (size) query.SizeCategory = size;

        if (status) {
            query.Status = status;
        } else {
            query.Status = { $ne: 'Deleted' };
        }

        return await paginateQuery(Box, query, page, limit, {
            dataKey: 'boxes'
        });
    },

    addSingleBoxProcess: async (roomId, boxData) => {
        const room = await RoomType.findById(roomId).lean();
        if (!room) throw new Error("NOT_FOUND: Không tìm thấy phòng");

        const { BoxName, SizeCategory, Price, Status } = boxData;

        const currentCount = await Box.countDocuments({
            RoomTypeID: roomId,
            SizeCategory
        });

        const newBox = new Box({
            RoomTypeID: roomId,
            BoxName: BoxName?.trim() || `${room.Name} - Size ${SizeCategory} - ${currentCount + 1}`,
            SizeCategory,
            Price,
            Status: Status || 'Available'
        });

        const savedBox = await newBox.save();
        return savedBox.toObject();
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

        const allowedStatuses = ['Available', 'Maintenance'];
        if (!allowedStatuses.includes(box.Status)) {
            throw new Error("CONFLICT: Chỉ được ẩn chuồng khi trạng thái là Available (Trống) hoặc Maintenance (Bảo trì). Không thể xóa chuồng đang có pet ở (Occupied).");
        }

        box.Status = 'Deleted';
        await box.save();
        return true;
    }
};

module.exports = roomService;