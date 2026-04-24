/**
 * Hàm format kết quả phân trang theo chuẩn chung
 * @param {Array} data - Danh sách dữ liệu (vd: mảng pets, rooms)
 * @param {Number} totalItems - Tổng số record trong DB
 * @param {Number} page - Trang hiện tại
 * @param {Number} limit - Số record trên 1 trang
 * @param {String} dataKey - Tên key chứa dữ liệu (vd: 'pets', 'rooms', 'boxes')
 */
const formatPagination = (data, totalItems, page, limit, dataKey = 'data') => {
    return {
        total_items: totalItems,
        current_page: Number(page),
        limit: Number(limit),
        [dataKey]: data // Tạo key động dựa theo tên truyền vào
    };
};

/**
 * Hàm hỗ trợ query Mongoose và trả về format phân trang chuẩn
 * @param {Object} model - Mongoose Model (vd: Pet, RoomType)
 * @param {Object} query - Điều kiện query (vd: { Status: 'Active' })
 * @param {Number} page - Trang hiện tại
 * @param {Number} limit - Số record trên 1 trang
 * @param {Object} options - Các cấu hình thêm (select, sort, populate, dataKey)
 */
const paginateQuery = async (model, query, page = 1, limit = 20, options = {}) => {
    const { select, sort = { createdAt: -1 }, populate, dataKey = 'data' } = options;
    const skip = (Math.max(1, page) - 1) * limit;

    // Build query
    let dbQuery = model.find(query).skip(skip).limit(Number(limit)).lean();

    if (select) dbQuery = dbQuery.select(select);
    if (sort) dbQuery = dbQuery.sort(sort);
    if (populate) dbQuery = dbQuery.populate(populate);

    // Chạy song song query data và query count để tối ưu hiệu suất
    const [data, totalItems] = await Promise.all([
        dbQuery,
        model.countDocuments(query)
    ]);

    // Format kết quả trả về
    return formatPagination(data, totalItems, page, limit, dataKey);
};

module.exports = {
    formatPagination,
    paginateQuery
};