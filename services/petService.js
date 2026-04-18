const Pet = require('../models/Pet');
const User = require('../models/User');

const petService = {
    // ==========================================
    // NGHIỆP VỤ PHÍA USER (DRAFT -> PUBLISH)
    // ==========================================

    // 1. Init Draft
    initDraftProcess: async (userId) => {
        // Tìm bản nháp cũ, dùng .lean() để lấy data thuần
        let draftPet = await Pet.findOne({ UserID: userId, Status: 'DRAFT' }).lean();

        if (draftPet) {
            // Trả về nguyên object draftPet
            return { pet: draftPet, isNewDraft: false };
        }

        // Nếu chưa có, tạo bản nháp mới
        const newDraft = new Pet({
            UserID: userId,
            Name: "_",
            Species: "_",
            Status: 'DRAFT'
        });

        const savedPet = await newDraft.save();
        return { pet: savedPet.toObject(), isNewDraft: true };
    },
    // 2. Reset Draft
    resetDraftProcess: async (userId) => {
        // Xóa vĩnh viễn (Hard delete) bản nháp hiện tại để dọn rác
        await Pet.findOneAndDelete({ UserID: userId, Status: 'DRAFT' });

        // Gọi lại hàm Init để tạo bản nháp mới tinh
        return await petService.initDraftProcess(userId);
    },

    // 3. Publish Pet
    publishPetProcess: async (petId, userId, petData) => {
        // Chỉ cho phép publish nếu pet đó thuộc về user và đang ở trạng thái DRAFT
        const query = { _id: petId, UserID: userId, Status: 'DRAFT' };
        const update = {
            ...petData,
            Status: 'ACTIVE' // Chuyển trạng thái sang chính thức
        };

        const publishedPet = await Pet.findOneAndUpdate(query, update, { new: true });

        if (!publishedPet) throw new Error("Not Found");
        return publishedPet;
    },

    // 4. Get User Pets (Chỉ lấy pet đã ACTIVE)
    getUserPetsProcess: async (userId, page, limit) => {
        const skip = (page - 1) * limit;
        const query = { UserID: userId, Status: 'ACTIVE' }; // Chỉ lấy pet đã ACTIVE

        const pets = await Pet.find(query)
            .select('_id Name Species Image') // <=== THÊM DÒNG NÀY: Chỉ lấy các trường cần thiết
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalPets = await Pet.countDocuments(query);
        const hasNextPage = (skip + pets.length) < totalPets;

        return { pets, hasNextPage };
    },

    // 5. Get Pet Detail
    getPetDetailProcess: async (petId, userId = null) => {
        const query = { _id: petId };

        if (userId) {
            query.UserID = userId;
            query.Status = { $ne: 'DELETED' }; // User không thấy pet bị xóa
        }
        // Nếu admin gọi (userId = null), sẽ không thêm điều kiện Status -> Thấy được cả pet DELETED

        const pet = await Pet.findOne(query).populate('UserID', 'Name Phone').lean();
        if (!pet) throw new Error("Not Found");

        if (pet.UserID) {
            pet.OwnerName = pet.UserID.Name;
        }

        return pet;
    },

    // 6. Update Pet (Chỉ cho update nếu chưa bị xóa)
    updatePetProcess: async (petId, userId = null, updateData) => {
        const query = { _id: petId };

        if (userId) {
            query.UserID = userId;
            query.Status = { $ne: 'DELETED' };
        }

        const updatedPet = await Pet.findOneAndUpdate(query, updateData, { new: true });

        if (!updatedPet) throw new Error("Not Found");
        return updatedPet;
    },

    // 7. Delete Pet (Soft Delete)
    deletePetProcess: async (petId, userId = null) => {
        const query = { _id: petId };
        if (userId) query.UserID = userId;

        // Chuyển status thành DELETED thay vì xóa khỏi DB
        const deletedPet = await Pet.findOneAndUpdate(query, { Status: 'DELETED' }, { new: true });

        if (!deletedPet) throw new Error("Not Found");
        return true;
    },

    // ==========================================
    // NGHIỆP VỤ PHÍA ADMIN
    // ==========================================

    getAdminPetsProcess: async (page, limit, phone, status) => {
        const skip = (page - 1) * limit;
        let query = {};

        // 1. Lọc theo Phone
        if (phone) {
            const user = await User.findOne({ Phone: phone });
            if (user) {
                query.UserID = user._id;
            } else {
                return {
                    pets: [],
                    meta: { current_page: page, total_items: 0, total_pages: 0 }
                };
            }
        }

        // 2. Lọc theo Status (Hỗ trợ chuỗi phân tách bằng dấu phẩy)
        if (status) {
            // Ví dụ: status = "ACTIVE,DRAFT" => mảng ['ACTIVE', 'DRAFT']
            const statusArray = status.split(',').map(s => s.trim());
            query.Status = { $in: statusArray };
        }

        const pets = await Pet.find(query)
            .populate('UserID', 'Name Phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const formattedPets = pets.map(pet => ({
            ...pet,
            OwnerName: pet.UserID ? pet.UserID.Name : "Không xác định",
            UserPhone: pet.UserID ? pet.UserID.Phone : null
        }));

        const totalItems = await Pet.countDocuments(query);
        const totalPages = Math.ceil(totalItems / limit);

        return {
            pets: formattedPets,
            meta: {
                current_page: page,
                total_items: totalItems,
                total_pages: totalPages
            }
        };
    },

    createAdminPetProcess: async (phone, petData) => {
        const user = await User.findOne({ Phone: phone });
        if (!user) throw new Error("User Not Found");

        // Admin tạo trực tiếp thì Status mặc định là ACTIVE
        const newPet = new Pet({
            ...petData,
            UserID: user._id,
            Status: 'ACTIVE'
        });

        await newPet.save();
        return newPet;
    }


};

module.exports = petService;