const Pet = require('../models/Pet');
const User = require('../models/User');

const validateServiceData = (petData) => {
    const stringFields = ['Name', 'Species', 'Breed', 'Behavior', 'SpecialNotes', 'HealthStatus'];
    for (const field of stringFields) {
        if (petData[field] && !/([a-zA-Z\p{L}])/u.test(petData[field])) {
            throw new Error(`BAD_REQUEST: Dữ liệu '${field}' không hợp lệ (phải chứa ít nhất một chữ cái).`);
        }
    }

    // ĐÃ SỬA: Chặn Cân nặng âm, bằng 0, hoặc lớn hơn 200
    if (petData.Weight !== undefined && (isNaN(petData.Weight) || petData.Weight <= 0 || petData.Weight > 200)) {
        throw new Error("BAD_REQUEST: Cân nặng phải lớn hơn 0 và tối đa 200 kg.");
    }
};

const petService = {
    // 1. Init Draft
    initDraftProcess: async (userId) => {
        let draftPet = await Pet.findOne({ UserID: userId, Status: 'Draft' }).lean(); // PascalCase

        if (draftPet) {
            return { pet: draftPet, isNewDraft: false };
        }

        const newDraft = new Pet({
            UserID: userId,
            Name: "_",
            Species: "Dog", // ĐÃ SỬA: Tránh lỗi required enum
            Status: 'Draft' // PascalCase
        });

        const savedPet = await newDraft.save();
        return { pet: savedPet.toObject(), isNewDraft: true };
    },

    // 2. Reset Draft
    resetDraftProcess: async (userId) => {
        const deletedDraft = await Pet.findOneAndDelete({ UserID: userId, Status: 'Draft' }).lean(); // PascalCase

        if (!deletedDraft) {
            throw new Error("NOT_FOUND: Bạn không có bản nháp nào đang xử lý để đặt lại.");
        }

        return await petService.initDraftProcess(userId);
    },

    // 3. Publish Pet
    publishPetProcess: async (petId, userId, petData) => {
        validateServiceData(petData);
        const query = { _id: petId, UserID: userId, Status: 'Draft' }; // PascalCase
        const update = { ...petData, Status: 'Active' }; // PascalCase

        const publishedPet = await Pet.findOneAndUpdate(query, update, { new: true }).lean();

        if (!publishedPet) throw new Error("NOT_FOUND: Không tìm thấy bản nháp hợp lệ để xuất bản.");
        return publishedPet;
    },

    // 4. Get User Pets
    getUserPetsProcess: async (userId, page, limit) => {
        const skip = (page - 1) * limit;
        const query = { UserID: userId, Status: 'Active' }; // PascalCase

        const pets = await Pet.find(query)
            .select('_id Name Species Breed Image Gender Size')
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
            query.Status = { $ne: 'Deleted' }; // PascalCase
        }

        const pet = await Pet.findOne(query).populate('UserID', 'Name Phone').lean();
        if (!pet) throw new Error("NOT_FOUND: Không tìm thấy thú cưng này hoặc bạn không có quyền xem.");

        if (pet.UserID) {
            pet.OwnerName = pet.UserID.Name;
            pet.OwnerPhone = pet.UserID.Phone;
            delete pet.UserID;
        }

        return pet;
    },

    // 6. Update Pet
    updatePetProcess: async (petId, userId = null, updateData) => {
        validateServiceData(updateData);
        const query = { _id: petId };

        if (userId) {
            query.UserID = userId;
            query.Status = { $ne: 'Deleted' }; // PascalCase
        }

        const updatedPet = await Pet.findOneAndUpdate(query, updateData, { new: true }).lean();

        if (!updatedPet) throw new Error("NOT_FOUND: Không tìm thấy thú cưng để cập nhật.");
        return updatedPet;
    },

    // 7. Delete Pet (Soft Delete)
    deletePetProcess: async (petId, userId = null) => {
        const query = { _id: petId };
        if (userId) query.UserID = userId;

        const deletedPet = await Pet.findOneAndUpdate(query, { Status: 'Deleted' }, { new: true }).lean(); // PascalCase

        if (!deletedPet) throw new Error("NOT_FOUND: Không tìm thấy thú cưng để xóa.");
        return true;
    },

    // 8. Admin Get Pets
    getAdminPetsProcess: async (page, limit, filters) => {
        const { phone, status, name, species, breed, size, gender } = filters;
        const skip = (page - 1) * limit;
        let query = {};

        if (phone) {
            const user = await User.findOne({ Phone: phone }).lean();
            if (user) {
                query.UserID = user._id;
            } else {
                throw new Error("NOT_FOUND: Không tìm thấy khách hàng với số điện thoại này.");
            }
        }

        if (status) {
            query.Status = { $in: status.split(',').map(s => toPascalCase(s.trim())) };
        } else {
            query.Status = { $nin: ['Draft', 'Deleted'] }; // PascalCase
        }

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

        const formattedPets = pets.map(pet => {
            const formatted = {
                ...pet,
                OwnerName: pet.UserID ? pet.UserID.Name : "Không xác định",
                OwnerPhone: pet.UserID ? pet.UserID.Phone : null
            };
            delete formatted.UserID;
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

    // 9. Admin Create Pet
    createAdminPetProcess: async (phone, petData) => {
        validateServiceData(petData);
        const user = await User.findOne({ Phone: phone }).lean();
        if (!user) throw new Error("NOT_FOUND: Không tìm thấy khách hàng với số điện thoại này.");

        const newPet = new Pet({
            ...petData,
            UserID: user._id,
            Status: 'Active' // PascalCase
        });

        await newPet.save();
        return newPet;
    }
};

module.exports = petService;