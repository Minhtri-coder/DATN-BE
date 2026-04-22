# Tài liệu Hướng dẫn API dành cho Web Admin (Auth & Pet)

Tài liệu này cung cấp hướng dẫn chi tiết cách Admin hoặc Employee tích hợp với các API xác thực (Auth) và quản lý thú cưng (Pet) trong hệ thống PetVilla.

> **Lưu ý Quan Trọng**
> Các API dành cho Admin yêu cầu người dùng phải có `Role` là `1` (Admin) hoặc `2` (Employee) trong hệ thống. Mọi Request vào đường dẫn `/pet/admin/*` đều phải đính kèm Header:  
> `Authorization: Bearer <access_token>`

---

## 1. Authentication (Luồng Đăng nhập cho Admin)

Admin/Employee dùng chung hệ thống xác thực bằng OTP qua Số điện thoại (SĐT) như User thông thường. Không có luồng đăng nhập bằng mật khẩu riêng.

### 1.1 Gửi OTP (Send OTP)
Yêu cầu hệ thống gửi mã OTP về SĐT của Admin.
- **Method**: `POST`
- **Endpoint**: `/auth/send-otp`
- **Body** (JSON):
```json
{
  "Phone": "0901234567" // SĐT của Admin (hỗ trợ đầu 0 hoặc +84)
}
```
- **Response** (200 OK): Trả về thông báo thành công (Hiện tại có đính kèm `test_otp` để test trực tiếp).

### 1.2 Xác thực OTP (Verify OTP)
Dùng OTP vừa nhận được để đăng nhập và lấy `access_token`.
- **Method**: `POST`
- **Endpoint**: `/auth/verify-otp`
- **Body** (JSON):
```json
{
  "Phone": "0901234567",
  "OTP": "1234"
}
```
- **Response** (200 OK): 
```json
{
  "success": true,
  "message": "Đăng nhập thành công",
  "data": {
    "is_new_user": false,
    "user": {
      "id": "...",
      "Role": 1, 
      "Name": "Tên Admin",
      "Phone": "0901234567"
    },
    "tokens": {
      "access_token": "eyJhbGciOiJIUz...",
      "refresh_token": "eyJhbGciOiJIUz..."
    }
  }
}
```
> **Ghi chú**:  
> Admin cần lưu lại chuỗi `access_token` để nhúng vào Header của tất cả các API quản lý bên dưới. Để đăng xuất, gọi `POST /auth/logout` kèm Token này.

---

## 2. Quản lý Thú Cưng (Pet API)

Các API này hỗ trợ Admin tìm kiếm, tạo mới, chỉnh sửa, và xóa thú cưng của khách hàng.

### 2.1 Lấy danh sách Thú cưng (Get List)
Lấy danh sách toàn bộ thú cưng trong hệ thống (Hoặc lọc theo thông tin cụ thể).
- **Method**: `GET`
- **Endpoint**: `/pet/admin`
- **Query Parameters**:
  - `page`: Trang hiện tại (Mặc định `1`).
  - `limit`: Số lượng bản ghi trên mỗi trang (Mặc định `20`).
  - `phone`: Lọc thú cưng theo **SĐT của chủ sở hữu** (Rất hữu ích khi cần hiển thị danh sách Pet của một khách hàng cụ thể).
  - `status`: Lọc theo trạng thái (`ACTIVE`, `DRAFT`, `DELETED`), có thể truyền nhiều trạng thái cách nhau bằng dấu phẩy (vd: `ACTIVE,DRAFT`). 
    - *Mặc định*: Nếu không truyền, hệ thống sẽ **bỏ qua** `DRAFT` và `DELETED` (chỉ trả về `ACTIVE`).
  - `name`: Tìm theo tên thú cưng (tìm kiếm tương đối/regex).
  - `species`: Lọc theo loài (VD: `Chó`, `Mèo`).
  - `size`: Lọc theo kích cỡ (`S`, `M`, `L`, `XL`).
  - `gender`: Lọc theo giới tính (`MALE`, `FEMALE`, `UNKNOWN`).

> **Cảnh báo**:  
> Nếu bạn truyền query `phone` nhưng số điện thoại đó chưa từng được đăng ký trong hệ thống user, API sẽ lập tức báo lỗi HTTP 400 (NOT_FOUND).

### 2.2 Xem chi tiết Thú cưng (Get Detail)
Lấy đầy đủ thông tin một thú cưng (bao gồm cả thông tin người chủ) dựa theo `petId`.
- **Method**: `GET`
- **Endpoint**: `/pet/admin/:petId`
- **Params**: `petId` (Object ID của MongoDB, VD: `60d5ecb8b392d7...`)

### 2.3 Tạo mới Thú cưng cho Khách hàng (Create)
Tạo hồ sơ thú cưng và gắn tự động vào một khách hàng thông qua SĐT của khách hàng đó.
- **Method**: `POST`
- **Endpoint**: `/pet/admin`
- **Body** (JSON):
```json
{
  "Phone": "0987654321", // BẮT BUỘC: SĐT của khách hàng đã tồn tại trên DB
  "Name": "Lu Lu",       // BẮT BUỘC
  "Species": "Chó",      // BẮT BUỘC
  "Breed": "Corgi",
  "Size": "M",           // Phải thuộc Enum: S, M, L, XL
  "Weight": 5.5,         // Định dạng số (> 0)
  "Gender": "FEMALE",    // MALE, FEMALE, UNKNOWN
  "Temperament": "Năng động, hay sủa",
  "SpecialNotes": "Không ăn được thịt gà",
  "HealthStatus": "Bình thường"
}
```
- **Response** (201 Created): Trả về JSON chứa ID của thú cưng vừa được tạo cùng với ID của User (`Owner`).

### 2.4 Cập nhật thông tin Thú cưng (Update)
Thay đổi các thông tin của thú cưng.
- **Method**: `PUT`
- **Endpoint**: `/pet/admin/:petId`
- **Body**: (Chứa các trường muốn cập nhật, định dạng tương tự như Create. Tuy nhiên **KHÔNG** truyền trường `Phone` vì không cho phép đổi chủ sở hữu qua API này).

### 2.5 Xóa Thú cưng (Delete)
Thực hiện "xóa mềm" một thú cưng. (Đổi trường `Status` của Pet thành `DELETED`, khiến cho khách hàng không còn nhìn thấy thú cưng này nữa).
- **Method**: `DELETE`
- **Endpoint**: `/pet/admin/:petId`
- **Response** (200 OK): `Đã xóa hồ sơ thú cưng thành công.`
