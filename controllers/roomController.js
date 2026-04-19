const roomService = require('../services/roomService');
const { sendSuccess, sendError } = require('../utils/response');

// Hàm Helper xử lý lỗi chung (Bắt các lỗi định dạng sẵn từ Service)
const handleError = (res, error) => {
    const msg = error.message || "";
    if (msg.includes("NOT_FOUND")) return sendError(res, 404, msg.replace("NOT_FOUND: ", ""));
    if (msg.includes("CONFLICT")) return sendError(res, 409, msg.replace("CONFLICT: ", ""));
    if (msg.includes("BAD_REQUEST")) return sendError(res, 400, msg.replace("BAD_REQUEST: ", ""));

    console.error(error); // Log lỗi server để debug
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
            const status = req.query.status?.trim(); // Ví dụ: "DRAFT,ACTIVE"

            const data = await roomService.getRoomsProcess(page, limit, status);
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

            // Chuẩn hóa dữ liệu đầu vào
            const roomData = {
                Name: Name?.trim(),
                Description: Description?.trim(),
                SpeciesType: SpeciesType?.trim(),
                BehaviorType: BehaviorType?.trim(),
                TempType: TempType?.trim(),
                HealthSuitability: HealthSuitability?.trim()
            };

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

            // Chuẩn hóa dữ liệu
            const roomData = {
                Name: Name?.trim(),
                Description: Description?.trim(),
                SpeciesType: SpeciesType?.trim(),
                BehaviorType: BehaviorType?.trim(),
                TempType: TempType?.trim(),
                HealthSuitability: HealthSuitability?.trim()
            };

            // Lọc bỏ các key undefined để Mongoose không ghi đè thành null
            Object.keys(roomData).forEach(key => roomData[key] === undefined && delete roomData[key]);

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

            const data = await roomService.addBoxesBulkProcess(roomId, configs);
            return sendSuccess(res, 201, "Thêm chuồng hàng loạt thành công", data);
        } catch (error) {
            return handleError(res, error);
        }
    },

    getBoxesByRoom: async (req, res) => {
        try {
            const { roomId } = req.params;
            const size = req.query.size?.trim();
            const status = req.query.status?.trim();

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
                SizeCategory: SizeCategory?.trim(),
                Price: Price ? Number(Price) : undefined,
                Status: Status?.trim()
            };

            // Lọc bỏ các key undefined
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