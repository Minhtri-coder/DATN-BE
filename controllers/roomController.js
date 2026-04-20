const roomService = require('../services/roomService');
const RoomType = require('../models/RoomType'); // Import để dùng ENUMS
const Box = require('../models/Box'); // Import để dùng ENUMS
const { sendSuccess, sendError } = require('../utils/response');

// Hàm Helper xử lý lỗi chung
const handleError = (res, error) => {
    const msg = error.message || "";
    if (msg.includes("NOT_FOUND")) return sendError(res, 404, msg.replace("NOT_FOUND: ", ""));
    if (msg.includes("CONFLICT")) return sendError(res, 409, msg.replace("CONFLICT: ", ""));
    if (msg.includes("BAD_REQUEST")) return sendError(res, 400, msg.replace("BAD_REQUEST: ", ""));

    console.error(error);
    return sendError(res, 500, "Lỗi hệ thống");
};

const roomController = {
    // ==========================================
    // CONTROLLER PHÒNG (ROOM)
    // ==========================================

    getRooms: async (req, res) => {
        try {
            const page = Number(req.query.page) || 1;
            const limit = Number(req.query.limit) || 20;

            const filters = {
                status: req.query.status?.trim(),
                name: req.query.name?.trim(),
                speciesType: req.query.speciesType?.trim(),
                behaviorType: req.query.behaviorType?.trim(),
                tempType: req.query.tempType?.trim(),
                healthSuitability: req.query.healthSuitability?.trim()
            };

            const data = await roomService.getRoomsProcess(page, limit, filters);
            return sendSuccess(res, 200, "Lấy danh sách phòng thành công", data);
        } catch (error) {
            return handleError(res, error);
        }
    },

    getRoomDetail: async (req, res) => {
        try {
            const { roomId } = req.params;
            const data = await roomService.getRoomDetailProcess(roomId);
            return sendSuccess(res, 200, "Lấy chi tiết phòng thành công", data);
        } catch (error) {
            return handleError(res, error);
        }
    },

    createRoom: async (req, res) => {
        try {
            let { Name, Description, SpeciesType, BehaviorType, TempType, HealthSuitability } = req.body;

            if (!Name) return sendError(res, 400, "Tên phòng (Name) là bắt buộc.");

            // Chuẩn hóa dữ liệu đầu vào
            const roomData = {
                Name: Name?.trim(),
                Description: Description?.trim(),
                SpeciesType: SpeciesType?.trim(),
                BehaviorType: BehaviorType?.trim(),
                TempType: TempType?.trim(),
                HealthSuitability: HealthSuitability?.trim()
            };

            // Lọc bỏ key undefined
            Object.keys(roomData).forEach(key => roomData[key] === undefined && delete roomData[key]);

            // Validate bằng ENUMS
            if (roomData.SpeciesType && !RoomType.ENUMS.SPECIES_TYPES.includes(roomData.SpeciesType)) {
                return sendError(res, 400, `SpeciesType không hợp lệ. Cho phép: ${RoomType.ENUMS.SPECIES_TYPES.join(', ')}`);
            }
            if (roomData.BehaviorType && !RoomType.ENUMS.BEHAVIOR_TYPES.includes(roomData.BehaviorType)) {
                return sendError(res, 400, `BehaviorType không hợp lệ. Cho phép: ${RoomType.ENUMS.BEHAVIOR_TYPES.join(', ')}`);
            }
            if (roomData.TempType && !RoomType.ENUMS.TEMP_TYPES.includes(roomData.TempType)) {
                return sendError(res, 400, `TempType không hợp lệ. Cho phép: ${RoomType.ENUMS.TEMP_TYPES.join(', ')}`);
            }
            if (roomData.HealthSuitability && !RoomType.ENUMS.HEALTH_SUITABILITY.includes(roomData.HealthSuitability)) {
                return sendError(res, 400, `HealthSuitability không hợp lệ. Cho phép: ${RoomType.ENUMS.HEALTH_SUITABILITY.join(', ')}`);
            }

            const data = await roomService.createRoomProcess(roomData);
            return sendSuccess(res, 201, "Tạo phòng mới thành công", data);
        } catch (error) {
            return handleError(res, error);
        }
    },

    updateRoom: async (req, res) => {
        try {
            const { roomId } = req.params;
            let { Name, Description, SpeciesType, BehaviorType, TempType, HealthSuitability } = req.body;

            const roomData = {
                Name: Name?.trim(),
                Description: Description?.trim(),
                SpeciesType: SpeciesType?.trim(),
                BehaviorType: BehaviorType?.trim(),
                TempType: TempType?.trim(),
                HealthSuitability: HealthSuitability?.trim()
            };

            Object.keys(roomData).forEach(key => roomData[key] === undefined && delete roomData[key]);

            // Validate bằng ENUMS
            if (roomData.SpeciesType && !RoomType.ENUMS.SPECIES_TYPES.includes(roomData.SpeciesType)) {
                return sendError(res, 400, "SpeciesType không hợp lệ.");
            }
            if (roomData.BehaviorType && !RoomType.ENUMS.BEHAVIOR_TYPES.includes(roomData.BehaviorType)) {
                return sendError(res, 400, "BehaviorType không hợp lệ.");
            }
            if (roomData.TempType && !RoomType.ENUMS.TEMP_TYPES.includes(roomData.TempType)) {
                return sendError(res, 400, "TempType không hợp lệ.");
            }
            if (roomData.HealthSuitability && !RoomType.ENUMS.HEALTH_SUITABILITY.includes(roomData.HealthSuitability)) {
                return sendError(res, 400, "HealthSuitability không hợp lệ.");
            }

            const data = await roomService.updateRoomProcess(roomId, roomData);
            return sendSuccess(res, 200, "Cập nhật phòng thành công", data);
        } catch (error) {
            return handleError(res, error);
        }
    },

    deleteRoom: async (req, res) => {
        try {
            const { roomId } = req.params;
            const data = await roomService.deleteRoomProcess(roomId);
            return sendSuccess(res, 200, "Ẩn phòng thành công", data);
        } catch (error) {
            return handleError(res, error);
        }
    },

    // ==========================================
    // CONTROLLER CHUỒNG (BOX)
    // ==========================================
    addBoxesBulk: async (req, res) => {
        try {
            const { roomId } = req.params;
            const { configs } = req.body;

            if (!configs || !Array.isArray(configs)) {
                return sendError(res, 400, "Dữ liệu cấu hình không hợp lệ (yêu cầu mảng configs)");
            }

            // Dùng object Map để gộp các config bị trùng SizeCategory
            const mergedConfigsMap = {};

            for (let i = 0; i < configs.length; i++) {
                let { SizeCategory, Quantity, Price } = configs[i];

                // Bỏ qua nếu dữ liệu không có số lượng
                if (!SizeCategory || !Quantity || Quantity <= 0) continue;

                SizeCategory = SizeCategory.trim().toUpperCase();

                // Validate Size
                if (!Box.ENUMS.SIZE_CATEGORIES.includes(SizeCategory)) {
                    return sendError(res, 400, `SizeCategory '${SizeCategory}' không hợp lệ. Cho phép: ${Box.ENUMS.SIZE_CATEGORIES.join(', ')}`);
                }

                // Logic gộp (Merge): Nếu đã có Size này rồi thì cộng dồn Quantity
                if (mergedConfigsMap[SizeCategory]) {
                    mergedConfigsMap[SizeCategory].Quantity += Number(Quantity);
                    // Cập nhật giá mới nhất nếu mảng sau có truyền giá khác
                    if (Price !== undefined) {
                        mergedConfigsMap[SizeCategory].Price = Number(Price);
                    }
                } else {
                    // Nếu chưa có thì khởi tạo
                    mergedConfigsMap[SizeCategory] = {
                        SizeCategory,
                        Quantity: Number(Quantity),
                        Price: Number(Price)
                    };
                }
            }

            // Chuyển object Map trở lại thành mảng config sạch sẽ không trùng lặp
            const finalConfigs = Object.values(mergedConfigsMap);

            if (finalConfigs.length === 0) {
                return sendError(res, 400, "Không có cấu hình số lượng chuồng hợp lệ nào được gửi lên.");
            }

            // Đưa mảng đã gộp sạch sẽ xuống Service
            const data = await roomService.addBoxesBulkProcess(roomId, finalConfigs);
            return sendSuccess(res, 201, "Thêm chuồng hàng loạt thành công", data);
        } catch (error) {
            return handleError(res, error);
        }
    },

    getBoxesByRoom: async (req, res) => {
        try {
            const { roomId } = req.params;
            const size = req.query.size?.trim().toUpperCase();

            // Chuẩn hóa Status: Chữ cái đầu viết hoa, còn lại viết thường
            let status = req.query.status?.trim();
            if (status) {
                status = status.charAt(0).toUpperCase() + status.slice(1).toLowerCase();
            }

            const data = await roomService.getBoxesByRoomProcess(roomId, size, status);
            return sendSuccess(res, 200, "Lấy danh sách chuồng thành công", data);
        } catch (error) {
            return handleError(res, error);
        }
    },

    getBoxDetail: async (req, res) => {
        try {
            const { boxId } = req.params;
            const data = await roomService.getBoxDetailProcess(boxId);
            return sendSuccess(res, 200, "Lấy chi tiết chuồng thành công", data);
        } catch (error) {
            return handleError(res, error);
        }
    },

    updateBox: async (req, res) => {
        try {
            const { boxId } = req.params;
            let { BoxName, SizeCategory, Price, Status } = req.body;

            const updateData = {
                BoxName: BoxName?.trim(),
                Price: Price ? Number(Price) : undefined,
            };

            // Chuẩn hóa & Validate Size
            if (SizeCategory) {
                updateData.SizeCategory = SizeCategory.trim().toUpperCase();
                if (!Box.ENUMS.SIZE_CATEGORIES.includes(updateData.SizeCategory)) {
                    return sendError(res, 400, `SizeCategory không hợp lệ. Cho phép: ${Box.ENUMS.SIZE_CATEGORIES.join(', ')}`);
                }
            }

            // Chuẩn hóa & Validate Status
            if (Status) {
                updateData.Status = Status.trim().charAt(0).toUpperCase() + Status.trim().slice(1).toLowerCase();
                if (!Box.ENUMS.STATUS_TYPES.includes(updateData.Status)) {
                    return sendError(res, 400, `Status không hợp lệ. Cho phép: ${Box.ENUMS.STATUS_TYPES.join(', ')}`);
                }
            }

            // Lọc bỏ key undefined
            Object.keys(updateData).forEach(key => updateData[key] === undefined && delete updateData[key]);

            const data = await roomService.updateBoxProcess(boxId, updateData);
            return sendSuccess(res, 200, "Cập nhật chuồng thành công", data);
        } catch (error) {
            return handleError(res, error);
        }
    },

    deleteBox: async (req, res) => {
        try {
            const { boxId } = req.params;
            const data = await roomService.deleteBoxProcess(boxId);
            return sendSuccess(res, 200, "Ẩn chuồng thành công", data);
        } catch (error) {
            return handleError(res, error);
        }
    }
};

module.exports = roomController;