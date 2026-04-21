const mongoose = require('mongoose');
const Booking = require('../models/Booking');
const BoardingDetail = require('../models/BoardingDetail');
const Box = require('../models/Box');
const Pet = require('../models/Pet');
const { sendSuccess, sendError } = require('../utils/response');

const bookingController = {
    // GET /booking/available
    getAvailableRooms: async (req, res) => {
        try {
            const { checkInDate, checkOutDate, roomTypeId, sizeCategory } = req.query;

            if (!checkInDate || !checkOutDate) {
                return sendError(res, 400, "Vui lòng cung cấp checkInDate và checkOutDate.");
            }

            const checkIn = new Date(checkInDate);
            const checkOut = new Date(checkOutDate);

            if (checkIn >= checkOut) {
                return sendError(res, 400, "checkOutDate phải lớn hơn checkInDate.");
            }

            // 1. Tìm các BoardingDetail bị trùng lịch
            // Điều kiện trùng: Boarding checkIn < query checkOut VÀ Boarding checkOut > query checkIn
            const overlappingBoardings = await BoardingDetail.find({
                CheckInDate: { $lt: checkOut },
                CheckOutDate: { $gt: checkIn }
            }).select('BoxID');

            const occupiedBoxIds = overlappingBoardings.map(b => b.BoxID);

            // 2. Lấy các Box không nằm trong danh sách bận và thoả mãn điều kiện
            const query = {
                _id: { $nin: occupiedBoxIds },
                Status: { $nin: ['Maintenance', 'Deleted'] } // Chỉ lấy Available hoặc Occupied (nhưng ở thời điểm tương lai thì có thể Available)
            };

            if (roomTypeId) query.RoomTypeID = roomTypeId;
            if (sizeCategory) query.SizeCategory = sizeCategory;

            const availableBoxes = await Box.find(query).populate('RoomTypeID');

            return sendSuccess(res, 200, "Lấy danh sách phòng trống thành công.", availableBoxes);
        } catch (error) {
            console.error("Lỗi getAvailableRooms:", error);
            return sendError(res, 500, "Lỗi server khi lấy phòng trống.", error.message);
        }
    },

    // POST /booking/
    createBooking: async (req, res) => {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
            const { petId, promotionId, healthStatus, depositAmount, totalAmount, boardingDetails } = req.body;

            // Basic validation
            if (!petId || totalAmount === undefined || !boardingDetails || !boardingDetails.length) {
                return sendError(res, 400, "Thiếu thông tin bắt buộc (petId, totalAmount, boardingDetails).");
            }

            // Verify pet belongs to user (if user context exists)
            if (req.user && req.user.userId) {
                const pet = await Pet.findOne({ _id: petId, UserID: req.user.userId });
                if (!pet) {
                    await session.abortTransaction();
                    return sendError(res, 403, "Thú cưng không tồn tại hoặc không thuộc quyền sở hữu của bạn.");
                }
            }

            // 1. Tạo Booking
            const newBooking = new Booking({
                PetID: petId,
                PromotionID: promotionId || null,
                Status: 'Pending',
                HealthStatus: healthStatus || '',
                DepositAmount: depositAmount || 0,
                TotalAmount: totalAmount
            });

            const savedBooking = await newBooking.save({ session });

            // 2. Tạo BoardingDetails
            const boardingDocs = boardingDetails.map(detail => {
                // Kiểm tra overlap lần nữa để tránh race condition
                return {
                    BookingID: savedBooking._id,
                    BoxID: detail.boxId,
                    CheckInDate: new Date(detail.checkInDate),
                    CheckOutDate: new Date(detail.checkOutDate),
                    Notes: detail.notes || ''
                };
            });

            await BoardingDetail.insertMany(boardingDocs, { session });

            await session.commitTransaction();
            session.endSession();

            return sendSuccess(res, 201, "Tạo đơn đặt phòng thành công.", savedBooking);
        } catch (error) {
            await session.abortTransaction();
            session.endSession();
            console.error("Lỗi createBooking:", error);
            return sendError(res, 500, "Lỗi server khi tạo đơn đặt phòng.", error.message);
        }
    },

    // GET /booking/history
    getBookingHistory: async (req, res) => {
        try {
            const userId = req.user.userId;

            // 1. Lấy danh sách thú cưng của User
            const pets = await Pet.find({ UserID: userId }).select('_id');
            const petIds = pets.map(pet => pet._id);

            // 2. Lấy Booking của các thú cưng này
            const bookings = await Booking.find({ PetID: { $in: petIds } })
                .populate({
                    path: 'PetID',
                    select: 'Name Species Breed Image'
                })
                .sort({ createdAt: -1 })
                .lean();

            // 3. Lấy BoardingDetails cho các bookings này
            const bookingIds = bookings.map(b => b._id);
            const boardingDetails = await BoardingDetail.find({ BookingID: { $in: bookingIds } })
                .populate({
                    path: 'BoxID',
                    select: 'BoxName SizeCategory Price RoomTypeID',
                    populate: {
                        path: 'RoomTypeID',
                        select: 'Name'
                    }
                })
                .lean();

            // Map boardingDetails vào bookings
            const bookingsWithDetails = bookings.map(booking => {
                return {
                    ...booking,
                    BoardingDetails: boardingDetails.filter(
                        detail => detail.BookingID.toString() === booking._id.toString()
                    )
                };
            });

            return sendSuccess(res, 200, "Lấy lịch sử đặt phòng thành công.", bookingsWithDetails);
        } catch (error) {
            console.error("Lỗi getBookingHistory:", error);
            return sendError(res, 500, "Lỗi server khi lấy lịch sử đặt phòng.", error.message);
        }
    },

    // PUT /booking/:bookingId/cancel
    cancelBooking: async (req, res) => {
        try {
            const { bookingId } = req.params;
            const userId = req.user.userId;

            // Tùy theo yêu cầu bảo mật: Đảm bảo User chỉ được huỷ Booking của chính mình
            // Bằng cách check PetID thuộc UserID
            const pets = await Pet.find({ UserID: userId }).select('_id');
            const petIds = pets.map(pet => pet._id.toString());

            const booking = await Booking.findById(bookingId);
            if (!booking) {
                return sendError(res, 404, "Không tìm thấy đơn đặt phòng.");
            }

            if (!petIds.includes(booking.PetID.toString()) && req.user.role === 0) {
                return sendError(res, 403, "Bạn không có quyền huỷ đơn đặt phòng này.");
            }

            if (['Cancelled', 'Completed'].includes(booking.Status)) {
                return sendError(res, 400, `Không thể huỷ đơn đặt phòng đang ở trạng thái ${booking.Status}.`);
            }

            booking.Status = 'Cancelled';
            await booking.save();

            return sendSuccess(res, 200, "Huỷ đơn đặt phòng thành công.", booking);
        } catch (error) {
            console.error("Lỗi cancelBooking:", error);
            return sendError(res, 500, "Lỗi server khi huỷ đơn.", error.message);
        }
    }
};

module.exports = bookingController;
