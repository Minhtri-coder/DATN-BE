const Pet = require('../models/Pet');
const User = require('../models/User'); // Cần User model để Admin tìm ID theo số điện thoại

const petService = {
    // ==========================================
    // NGHIỆP VỤ PHÍA USER
    // ==========================================

    getUserPetsProcess: async (userId, page, limit) => {
        const skip = (page - 1) * limit;

        const pets = await Pet.find({ UserID: userId })
            .sort({ createdAt: -1 }) // Thú cưng mới nhất lên đầu
            .skip(skip)
            .limit(limit)
            .lean();

        const totalPets = await Pet.countDocuments({ UserID: userId });
        const hasNextPage = (skip + pets.length) < totalPets;

        return { pets, hasNextPage };
    },

    getPetDetailProcess: async (petId, userId = null) => {
        // Query cơ bản theo PetId
        const query = { _id: petId };

        // Nếu là User gọi (có truyền userId), thêm điều kiện bắt buộc phải là pet của người đó
        if (userId) {
            query.UserID = userId;
        }

        const pet = await Pet.findOne(query).populate('UserID', 'Name Phone').lean();
        if (!pet) throw new Error("Not Found");

        // Format lại dữ liệu một chút cho đẹp (ví dụ trích xuất OwnerName ra ngoài nếu muốn giống document)
        if (pet.UserID) {
            pet.OwnerName = pet.UserID.Name;
        }

        return pet;
    },

    createPetProcess: async (userId, petData) => {
        const newPet = new Pet({
            ...petData,
            UserID: userId
        });

        await newPet.save();
        return newPet;
    },

    updatePetProcess: async (petId, userId = null, updateData) => {
        const query = { _id: petId };
        if (userId) query.UserID = userId;

        // Dùng { new: true } để trả về data sau khi update
        const updatedPet = await Pet.findOneAndUpdate(query, updateData, { new: true });

        if (!updatedPet) throw new Error("Not Found");
        return updatedPet;
    },

    deletePetProcess: async (petId, userId = null) => {
        const query = { _id: petId };
        if (userId) query.UserID = userId;

        const deletedPet = await Pet.findOneAndDelete(query);
        if (!deletedPet) throw new Error("Not Found");

        return true;
    },

    // ==========================================
    // NGHIỆP VỤ PHÍA ADMIN
    // ==========================================

    getAdminPetsProcess: async (page, limit, phone) => {
        const skip = (page - 1) * limit;
        let query = {};

        // Nếu admin muốn lọc danh sách pet theo số điện thoại của khách hàng
        if (phone) {
            const user = await User.findOne({ Phone: phone });
            if (user) {
                query.UserID = user._id;
            } else {
                // Nếu tìm SĐT không ra ai, trả về danh sách rỗng luôn cho nhanh
                return {
                    pets: [],
                    meta: { current_page: page, total_items: 0, total_pages: 0 }
                };
            }
        }

        // populate để lấy Name của chủ sở hữu
        const pets = await Pet.find(query)
            .populate('UserID', 'Name Phone')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        // Map data để gắn OwnerName ra ngoài cấp cao nhất (giống mô tả ở Document)
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
        // Admin nhập số điện thoại -> Hệ thống tự dò ra UserID để gắn vào Pet
        const user = await User.findOne({ Phone: phone });

        if (!user) throw new Error("User Not Found");

        const newPet = new Pet({
            ...petData,
            UserID: user._id
        });

        await newPet.save();
        return newPet;
    }
};

module.exports = petService;