const Pet = require('../models/Pet');
const User = require('../models/User');

const petService = {
    // ==========================================
    // NGHIỆP VỤ PHÍA USER
    // ==========================================

    getUserPetsProcess: async (userId, page, limit) => {
        const skip = (page - 1) * limit;

        const pets = await Pet.find({ UserID: userId })
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean();

        const totalPets = await Pet.countDocuments({ UserID: userId });
        const hasNextPage = (skip + pets.length) < totalPets;

        return { pets, hasNextPage };
    },

    getPetDetailProcess: async (petId, userId = null) => {
        const query = { _id: petId };
        if (userId) query.UserID = userId;

        const pet = await Pet.findOne(query).populate('UserID', 'Name Phone').lean();
        if (!pet) throw new Error("Not Found");

        if (pet.UserID) {
            pet.OwnerName = pet.UserID.Name;
        }

        return pet;
    },

    // Đã bỏ tham số file, petData.Image giờ chỉ là 1 chuỗi URL
    createPetProcess: async (userId, petData) => {
        const newPet = new Pet({
            ...petData,
            UserID: userId
        });

        await newPet.save();
        return newPet;
    },

    // Đã bỏ tham số file
    updatePetProcess: async (petId, userId = null, updateData) => {
        const query = { _id: petId };
        if (userId) query.UserID = userId;

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

    // Đã bỏ tham số file
    createAdminPetProcess: async (phone, petData) => {
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