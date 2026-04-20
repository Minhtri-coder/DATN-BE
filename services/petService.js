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
        // Tìm và xóa bản nháp hiện tại. Trả về document đã bị xóa nếu tìm thấy.
        const deletedDraft = await Pet.findOneAndDelete({ UserID: userId, Status: 'DRAFT' }).lean();

        // Nếu deletedDraft là null -> User chưa có bản nháp nào -> Báo lỗi
        if (!deletedDraft) {
            throw new Error("NOT_FOUND: Bạn không có bản nháp nào đang xử lý để đặt lại.");
        }

        // Nếu đã xóa thành công, gọi lại hàm Init để tạo bản nháp mới tinh
        return await petService.initDraftProcess(userId);
    },

    // 3. Publish Pet
    publishPetProcess: async (petId, userId, petData) => {
        const query = { _id: petId, UserID: userId, Status: 'DRAFT' };
        const update = { ...petData, Status: 'ACTIVE' };

        const publishedPet = await Pet.findOneAndUpdate(query, update, { new: true }).lean();

        if (!publishedPet) throw new Error("NOT_FOUND: Không tìm thấy bản nháp hợp lệ để xuất bản.");
        return publishedPet;
    },

    // 4. Get User Pets (Chỉ lấy pet đã ACTIVE)
    getUserPetsProcess: async (userId, page, limit) => {
        const skip = (page - 1) * limit;
        const query = { UserID: userId, Status: 'ACTIVE' };

        const pets = await Pet.find(query)
            .select('_id Name Species Breed Image Gender Size') // Lấy thêm các trường cơ bản hiển thị list
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

        const pet = await Pet.findOne(query).populate('UserID', 'Name Phone').lean();
        if (!pet) throw new Error("NOT_FOUND: Không tìm thấy thú cưng này hoặc bạn không có quyền xem.");

        // Phẳng hóa dữ liệu (Flatten)
        if (pet.UserID) {
            pet.OwnerName = pet.UserID.Name;
            pet.OwnerPhone = pet.UserID.Phone;
            delete pet.UserID; // Dọn dẹp object lồng nhau
        }

        return pet;
    },

    // 6. Update Pet
    updatePetProcess: async (petId, userId = null, updateData) => {
        const query = { _id: petId };

        if (userId) {
            query.UserID = userId;
            query.Status = { $ne: 'DELETED' };
        }

        // Đã THÊM .lean() vì Controller chỉ cần cục data
        const updatedPet = await Pet.findOneAndUpdate(query, updateData, { new: true }).lean();

        if (!updatedPet) throw new Error("NOT_FOUND: Không tìm thấy thú cưng để cập nhật.");
        return updatedPet;
    },

    // 7. Delete Pet (Soft Delete)
    deletePetProcess: async (petId, userId = null) => {
        const query = { _id: petId };
        if (userId) query.UserID = userId;

        // Đã THÊM .lean()
        const deletedPet = await Pet.findOneAndUpdate(query, { Status: 'DELETED' }, { new: true }).lean();

        if (!deletedPet) throw new Error("NOT_FOUND: Không tìm thấy thú cưng để xóa.");
        return true;
    },

    // ==========================================
    // NGHIỆP VỤ PHÍA ADMIN
    // ==========================================

    getAdminPetsProcess: async (page, limit, filters) => {
        const { phone, status, name, species, breed, size, gender } = filters;
        const skip = (page - 1) * limit;
        let query = {};

        // 1. Lọc theo Phone chủ sở hữu
        if (phone) {
            // SỬA: Đã thêm .lean()
            const user = await User.findOne({ Phone: phone }).lean();
            if (user) {
                query.UserID = user._id;
            } else {
                return { pets: [], meta: { current_page: page, total_items: 0, total_pages: 0 } };
            }
        }

        if (status) query.Status = { $in: status.split(',').map(s => s.trim()) };
        if (name) query.Name = { $regex: name, $options: 'i' };
        if (breed) query.Breed = { $regex: breed, $options: 'i' };
        if (species) query.Species = species;
        if (size) query.Size = size;
        if (gender) query.Gender = gender;

        const pets = await Pet.find(query)
            .populate('UserID', 'Name Phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Format & Phẳng hóa dữ liệu (Flatten)
        const formattedPets = pets.map(pet => {
            const formatted = {
                ...pet,
                OwnerName: pet.UserID ? pet.UserID.Name : "Không xác định",
                OwnerPhone: pet.UserID ? pet.UserID.Phone : null
            };
            delete formatted.UserID; // Xóa key lồng nhau
            return formatted;
        });

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
        const user = await User.findOne({ Phone: phone }).lean();
        if (!user) throw new Error("NOT_FOUND: Không tìm thấy khách hàng với số điện thoại này.");

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