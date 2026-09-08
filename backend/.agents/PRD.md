# Product Requirement Document

## Camping Ground Reservation API

Version: 1.1
Platform: REST API
Backend: Node.js + Express.js + TypeScript
Database: PostgreSQL
Auth: JWT (access + refresh token)
Payment: Midtrans (sandbox/production)
Email: Resend
Storage: Local `/uploads`

---

# 1. Product Overview

Camping Ground Reservation System adalah aplikasi untuk mengelola operasional beberapa camping ground/property yang dimiliki oleh satu owner.

Sistem menyediakan tiga kategori pengguna utama:

```text
Owner / Admin
Staff
Customer
```

Owner mengelola seluruh property dan operasional bisnis.
Staff mengelola aktivitas resepsionis pada property tempat mereka ditugaskan.
Customer menggunakan aplikasi untuk mencari property, melihat ketersediaan, melakukan reservasi, dan melihat transaksi.

---

# 2. Product Goals

Sistem harus memungkinkan:

1. Owner mengelola banyak camping ground.
2. Owner mengelola staff.
3. Staff dapat dinonaktifkan tanpa menghapus data historis.
4. Customer melihat ketersediaan unit secara realtime.
5. Customer melakukan self reservation.
6. Staff melakukan walk-in booking.
7. Staff melakukan check-in.
8. Staff melakukan check-out.
9. Owner memonitor seluruh booking.
10. Owner memonitor seluruh transaksi.
11. Owner mengelola harga weekday, weekend, dan tanggal khusus.
12. Staff mempunyai laporan transaksi berdasarkan shift.
13. Sistem mencegah double booking.
14. Sistem mengirim email notifikasi (register, booking, pembayaran).
15. Sistem mendukung promo code dengan kuota pemakaian.
16. Sistem mendukung waitlist FIFO jika unit fully booked.
17. Customer dapat memberikan review setelah menginap.
18. Owner dapat export laporan PDF/Excel.

---

# 3. Technology Stack

```text
Runtime:        Node.js
Framework:      Express.js
Language:       TypeScript
Database:       PostgreSQL
ORM:            Prisma
Auth:           JWT (jsonwebtoken) + bcryptjs
Validation:     Zod
Payment:        Midtrans (midtrans-client)
Email:          Resend (resend)
PDF:            pdfkit
Excel:          exceljs
File Upload:    multer
Rate Limiting:  express-rate-limit
Security:       helmet, cors
```

Struktur:

```text
Client
   │
   ▼
Express API
   │
   ├── Authentication (JWT + Refresh Token)
   ├── Authorization (RBAC middleware)
   ├── Booking Service
   ├── Availability Service
   ├── Pricing Service
   ├── Payment Service (Midtrans)
   ├── Email Service (Resend)
   └── Reporting Service (PDF/Excel)
           │
           ▼
       PostgreSQL
```

---

# 4. Roles

## OWNER

Access seluruh sistem.

Permissions:

```text
staff.manage

property.create
property.read
property.update
property.deactivate

unit.manage
facility.manage
pricing.manage

booking.read
booking.read_all
booking.create
booking.update
booking.cancel

payment.read
payment.read_all

shift.read
shift.read_all

report.read
report.export

promo.manage
review.manage
```

---

## STAFF

Permissions dibatasi berdasarkan property assignment.

```text
booking.read
booking.walkin
booking.checkin
booking.checkout

payment.create
payment.read

shift.open
shift.close
shift.read
```

Staff tidak boleh:

```text
create property
delete property
manage pricing
create owner
access property lain
```

---

## CUSTOMER

Permissions:

```text
property.read
availability.read

booking.create
booking.read_own
booking.cancel_own

payment.read_own

review.create_own
review.read

waitlist.create
waitlist.cancel_own

profile.update
password.change
```

---

# 5. Authentication

## Strategy: JWT Manual

Tidak menggunakan NextAuth/AuthJS — ini backend REST API murni.

Libraries: `jsonwebtoken` + `bcryptjs`

## Token Lifetime

```text
Access Token:  15 menit
Refresh Token: 7 hari
```

## Endpoints

```http
POST   /api/v1/auth/register          → customer register
POST   /api/v1/auth/login             → semua role
POST   /api/v1/auth/refresh           → rotate refresh token
POST   /api/v1/auth/logout            → revoke refresh token
POST   /api/v1/auth/change-password   → semua role (authenticated)
GET    /api/v1/auth/me                → get current user info
```

## Register (Customer Only)

```http
POST /api/v1/auth/register
```

Payload:

```json
{
  "name": "Wahyu Hidayatullah",
  "email": "wahyu@mail.com",
  "phone": "08123456789",
  "password": "secret123"
}
```

Staff/Owner tidak register sendiri — dibuat oleh owner via admin panel.

## Login

```http
POST /api/v1/auth/login
```

Payload:

```json
{
  "email": "wahyu@mail.com",
  "password": "secret123"
}
```

Response:

```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "name": "Wahyu",
      "email": "wahyu@mail.com",
      "role": "CUSTOMER"
    },
    "accessToken": "eyJ...",
    "refreshToken": "abc123..."
  }
}
```

## Refresh Token

```http
POST /api/v1/auth/refresh
```

```json
{
  "refreshToken": "abc123..."
}
```

Response: new `accessToken` + new `refreshToken` (rotation).

## Refresh Token Storage

Tabel `refresh_tokens` di PostgreSQL:

```text
id            uuid PK
user_id       FK → users
token         varchar (unique)
device_info   varchar (nullable)
is_revoked    boolean
expires_at    timestamp
created_at    timestamp
```

Saat login → insert refresh token.
Saat refresh → validate, revoke lama, buat baru.
Saat logout → revoke (is_revoked = true).

---

# 6. Property Management

Owner dapat:

```text
Create property
Update property
Deactivate property
Upload images (local /uploads)
Manage facilities
Manage unit types
Manage units
```

## Endpoints

```http
GET    /api/v1/properties                    → public (customer)
GET    /api/v1/properties/:propertyId        → public

POST   /api/v1/admin/properties              → owner
PATCH  /api/v1/admin/properties/:propertyId  → owner
PATCH  /api/v1/admin/properties/:propertyId/deactivate → owner
```

Property sebaiknya tidak benar-benar dihapus jika sudah mempunyai booking.

Status:

```text
ACTIVE
INACTIVE
```

## Property Search (Customer)

```http
GET /api/v1/properties?city=Puncak&guests=4&minPrice=200000&maxPrice=2000000&page=1&limit=20
```

Query parameters:

```text
city          → filter by city
guests        → filter by min capacity
minPrice      → minimum price per night
maxPrice      → maximum price per night
search        → search by name (LIKE)
page          → pagination (default: 1)
limit         → per page (default: 20, max: 50)
sortBy        → name | price | created_at
sortOrder     → asc | desc
```

**Rate Limiting: 20 pencarian per menit per IP.**

---

# 7. Property Images

## Storage

Local: `/uploads/properties/{propertyId}/{uuid}.{ext}`

Batas: max 5MB per file. Format: JPG, PNG, WebP.

## Endpoints

```http
GET    /api/v1/properties/:propertyId/images
POST   /api/v1/admin/properties/:propertyId/images
DELETE /api/v1/admin/properties/:propertyId/images/:imageId
PATCH  /api/v1/admin/properties/:propertyId/images/reorder
```

Image attributes:

```text
url              → path file
original_filename → nama file asli
is_primary       → boolean
sort_order       → integer
```

---

# 8. Facilities

Contoh:

```text
Toilet
Shower
Mushola
Electricity
Parking
WiFi
BBQ Area
Campfire Area
Swimming Pool
Restaurant
```

## Endpoints

```http
GET    /api/v1/facilities
POST   /api/v1/admin/facilities
PATCH  /api/v1/admin/facilities/:id

PUT    /api/v1/admin/properties/:propertyId/facilities
```

Property facility assignment: replace all (PUT dengan array `facilityIds`).

---

# 9. Unit Types

## Endpoints

```http
GET  /api/v1/properties/:propertyId/unit-types

POST   /api/v1/admin/properties/:propertyId/unit-types
PATCH  /api/v1/admin/unit-types/:unitTypeId
DELETE /api/v1/admin/unit-types/:unitTypeId
```

Payload:

```json
{
  "name": "Glamping Family",
  "description": "Tenda glamping luas untuk keluarga",
  "capacity": 6,
  "weekdayPrice": 700000,
  "weekendPrice": 900000
}
```

---

# 10. Units

Contoh:

```text
Unit Type: Glamping Family

Units:
GF-01  (AVAILABLE)
GF-02  (AVAILABLE)
GF-03  (MAINTENANCE)
GF-04  (AVAILABLE)
```

## Endpoints

```http
GET  /api/v1/admin/unit-types/:unitTypeId/units
POST /api/v1/admin/unit-types/:unitTypeId/units
PATCH /api/v1/admin/units/:unitId
DELETE /api/v1/admin/units/:unitId
```

Unit status:

```text
AVAILABLE    → unit boleh dijual
MAINTENANCE  → sedang diperbaiki, tidak bisa dibooking
INACTIVE     → tidak aktif, tidak ditampilkan
```

**Unit status AVAILABLE di sini berarti unit boleh dijual.**
**Availability aktual tetap dihitung berdasarkan booking overlap.**
**Jangan mengubah status unit menjadi BOOKED.**

---

# 11. Pricing Engine

## Service

```text
PricingService
```

Contoh:

```ts
getNightlyPrice({ unitTypeId, date }) → { price, rateName }
```

Priority:

```text
Special Rate (holiday/tanggal khusus, priority tertinggi)
      ↓
Weekend (Jumat-Sabtu/Minggu)
      ↓
Weekday (Senin-Kamis)
```

---

# 12. Special Pricing

## Endpoints

```http
GET    /api/v1/admin/unit-types/:unitTypeId/special-rates
POST   /api/v1/admin/unit-types/:unitTypeId/special-rates
PATCH  /api/v1/admin/special-rates/:id
DELETE /api/v1/admin/special-rates/:id
```

Payload:

```json
{
  "name": "Christmas & New Year",
  "startDate": "2026-12-20",
  "endDate": "2027-01-03",
  "price": 1200000,
  "priority": 100,
  "isActive": true
}
```

Jika ada overlap special rate, `priority` terbesar yang digunakan.

---

# 13. Availability API

## Endpoint

```http
GET /api/v1/properties/:propertyId/availability
```

Query:

```text
checkIn=2026-12-20
checkOut=2026-12-22
guests=4
```

Response:

```json
{
  "propertyId": "xxx",
  "checkIn": "2026-12-20",
  "checkOut": "2026-12-22",
  "nights": 2,
  "unitTypes": [
    {
      "id": "xxx",
      "name": "Glamping Family",
      "capacity": 6,
      "available": 3,
      "pricing": [
        {
          "date": "2026-12-20",
          "price": 1200000,
          "rate": "Christmas Holiday"
        },
        {
          "date": "2026-12-21",
          "price": 1200000,
          "rate": "Christmas Holiday"
        }
      ],
      "total": 2400000
    }
  ]
}
```

---

# 14. Availability Service

Buat service khusus:

```text
AvailabilityService
```

Contoh:

```ts
checkAvailability({
    propertyId,
    unitTypeId,
    checkIn,
    checkOut,
    quantity
})
```

**Jangan memasukkan seluruh logic availability ke controller.**

Logic availability:

```text
Total units WHERE unit_type_id = ? AND status = 'AVAILABLE'
- COUNT(units that have overlapping bookings)
= available count

Overlap check:
existing.check_in_date < requested.check_out_date
AND existing.check_out_date > requested.check_in_date
AND existing.status IN (PENDING, AWAITING_PAYMENT, CONFIRMED, CHECKED_IN)

Unit status yang MEMBLOKIR:
status = 'AVAILABLE' saja (MAINTENANCE dan INACTIVE dikecualikan)
```

---

# 15. Self Reservation

## Endpoint

```http
POST /api/v1/bookings
```

Payload:

```json
{
  "propertyId": "property-uuid",
  "checkIn": "2026-12-20",
  "checkOut": "2026-12-22",
  "adults": 4,
  "children": 2,
  "items": [
    {
      "unitTypeId": "unit-type-uuid",
      "quantity": 2
    }
  ],
  "promoCode": "NEWYEAR2027",
  "notes": "Mohen dekat kolam"
}
```

Backend flow:

```text
1. Validate request (Zod)
2. Load unit types
3. Check availability (AvailabilityService)
4. Validate promo code jika ada (PromoService)
5. Calculate nightly pricing (PricingService)
6. Apply promo discount
7. Calculate total
8. Start DB transaction (serializable)
9. Recheck availability (lock rows)
10. Create booking (status: AWAITING_PAYMENT)
11. Create booking items
12. Save price snapshots (booking_item_nights)
13. Log promo usage jika ada
14. Update promo.current_uses += 1
15. Commit transaction
16. Send booking confirmation email async
17. Return booking + payment_url (Midtrans)
```

**Booking expiry: 24 jam dari created_at jika belum dibayar.**

---

# 16. Walk-In Booking

## Endpoint

```http
POST /api/v1/staff/bookings/walk-in
```

Payload:

```json
{
  "propertyId": "xxx",
  "guest": {
    "name": "Budi",
    "phone": "08123456789",
    "email": null
  },
  "checkIn": "2026-09-08",
  "checkOut": "2026-09-09",
  "adults": 2,
  "children": 0,
  "items": [
    {
      "unitTypeId": "xxx",
      "quantity": 1
    }
  ]
}
```

Booking:

```text
source = WALK_IN
created_by_user_id = STAFF
```

**Customer tidak wajib mempunyai akun.**

**Validasi: Staff harus punya shift aktif di property yang sama.**

---

# 17. Booking Code

Format:

```text
CG-YYMMDD-XXXXXX
```

Contoh:

```text
CG-260908-A7QX2B
```

Unique constraint wajib.

---

# 18. Booking Detail

## Endpoint

```http
GET /api/v1/bookings/:bookingId
```

Access control:

```text
Customer → hanya booking miliknya
Staff → booking property assignment-nya saja
Owner → seluruh booking
```

---

# 19. Customer Booking History

```http
GET /api/v1/me/bookings
```

Filter:

```text
status
from
to
page
limit
```

---

# 20. Booking Search (Staff)

```http
GET /api/v1/staff/bookings
```

Filter:

```text
propertyId
bookingCode
guestName
phone
status
checkIn
checkOut
```

**Validasi: Staff hanya melihat booking property yang ditugaskan.**

---

# 21. Check-In

## Endpoint

```http
POST /api/v1/staff/bookings/:bookingId/check-in
```

Validasi:

```text
1. Booking exists
2. Booking status = CONFIRMED
3. Staff assigned to property (ada di staff_property_assignment)
4. Staff punya shift aktif di property yang sama
5. Booking date valid (check_in_date = hari ini)
6. Unit allocation complete (semua booking_item sudah ada booking_item_units)
7. Unit status = AVAILABLE (bukan MAINTENANCE/INACTIVE)
8. Unit tidak sedang dipakai booking lain yang overlap
```

Kemudian:

```text
status = CHECKED_IN
checked_in_at = now()
checked_in_by = staffId
```

---

# 22. Check-Out

```http
POST /api/v1/staff/bookings/:bookingId/check-out
```

Validasi:

```text
booking.status == CHECKED_IN
```

Kemudian:

```text
status = CHECKED_OUT
checked_out_at = now()
checked_out_by = staffId
```

Setelah CHECKED_OUT, customer dapat memberikan review.

---

# 23. Unit Allocation

Staff dapat memilih unit fisik sebelum check-in:

```http
PUT /api/v1/staff/bookings/:bookingId/unit-allocation
```

Payload:

```json
{
  "allocations": [
    {
      "bookingItemId": "xxx",
      "unitIds": [
        "GF-01-uuid",
        "GF-03-uuid"
      ]
    }
  ]
}
```

Backend validasi:

```text
1. Semua unitIds harus miluk unit_type_id yang sama dengan booking_item
2. Unit status = AVAILABLE
3. Tidak ada booking lain yang overlap dengan unit yang sama
4. Jumlah unitIds = booking_item.quantity
```

---

# 24. Payments

## Full Payment Only

**Tidak ada sistem DP. Wajib bayar full.**

## Endpoints

```http
GET    /api/v1/bookings/:bookingId/payments
POST   /api/v1/staff/bookings/:bookingId/payments
POST   /api/v1/bookings/:bookingId/payment/create    → create Midtrans transaction
POST   /api/v1/payments/midtrans/notification         → webhook dari Midtrans
```

## Cash Payment (Staff)

```json
{
  "method": "CASH",
  "amount": 2400000,
  "shiftId": "xxx"
}
```

## Midtrans Payment (Customer)

```http
POST /api/v1/bookings/:bookingId/payment/create
```

Response:

```json
{
  "success": true,
  "data": {
    "paymentUrl": "https://app.sandbox.midtrans.com/...",
    "orderId": "CG-260908-A7QX2B",
    "expiresAt": "2026-09-08T12:00:00Z"
  }
}
```

## Midtrans Webhook

```http
POST /api/v1/payments/midtrans/notification
```

Payload dari Midtrans:

```json
{
  "order_id": "CG-260908-A7QX2B",
  "status_code": "200",
  "transaction_status": "settlement",
  "gross_amount": "2400000.00",
  "signature_key": "..."
}
```

Backend:

```text
1. Verifikasi signature (HMAC SHA512)
2. Update payment.status = PAID
3. Update booking.status = CONFIRMED
4. Send booking confirmation email
5. Return 200 OK
```

Payment methods Midtrans:

```text
CASH            → dibayar tunai (via staff)
BANK_TRANSFER   → transfer manual, staff konfirmasi
QRIS            → QR code dari Midtrans
PAYMENT_GATEWAY → Midtrans (credit card, VA, convenience store, dll)
OTHER           → metode lain
```

---

# 25. Payment Status

```text
PENDING
PAID
FAILED
CANCELLED
REFUNDED
```

Refund:

```text
payments.refund_amount   → jumlah yang direfund
payments.status = REFUNDED
```

**Tidak ada partial refund. Full refund only (karena full payment).**

---

# 26. Booking Expiry & No-Show

## Expiry

Booking otomatis EXPIRED jika tidak dibayar dalam 24 jam.

Cron job berjalan setiap 1 jam:

```text
UPDATE bookings
SET status = 'EXPIRED', is_expired = true
WHERE status = 'AWAITING_PAYMENT'
AND expires_at < NOW()
```

Setelah expiry, cek waitlist FIFO → notifikasi customer berikutnya.

## No-Show

Booking otomatis NO_SHOW jika melewati check_in_time + 2 jam.

Cron job berjalan setiap 1 jam:

```text
UPDATE bookings
SET status = 'NO_SHOW'
WHERE status = 'CONFIRMED'
AND check_in_date + properties.check_in_time + interval '2 hours' < NOW()
```

Atau dilakukan lazy saat staff query bookings.

---

# 27. Waitlist (FIFO)

Jika unit type fully booked untuk tanggal tertentu:

```text
Customer dapat join waitlist
    ↓
Sistem simpan dengan priority_queue = MAX(priority_queue) + 1 (per property + date)
    ↓
Ketika ada cancel/expire → cek waitlist
    ↓
Ambil entry pertama (FIFO, MIN priority_queue WHERE status = 'WAITING')
    ↓
Notifikasi customer (email via Resend)
    ↓
Customer punya waktu 24 jam untuk melakukan booking
    ↓
Jika tidak booking → status = EXPIRED, lanjut ke berikutnya
```

## Endpoints

```http
POST   /api/v1/waitlist                    → customer join waitlist
GET    /api/v1/me/waitlist                 → customer lihat status waitlist
DELETE /api/v1/waitlist/:waitlistId        → customer batalkan waitlist
GET    /api/v1/admin/properties/:propertyId/waitlist → owner lihat waitlist
```

---

# 28. Promo Code

## Structure

```text
promos
    code             → varchar (unique), misal: NEWYEAR2027
    name             → varchar
    description      → text
    discountType     → PERCENTAGE | FIXED
    discountValue    → bigint (Rp untuk FIXED, % untuk PERCENTAGE)
    minBookingAmount → bigint (0 = tanpa minimum)
    maxUses          → integer (0 = unlimited)
    currentUses      → integer
    startAt          → timestamp
    expiresAt        → timestamp
    isActive         → boolean
```

## Usage Log

```text
promo_usage_logs
    promoId          → FK
    bookingId        → FK
    userId           → FK
    discountApplied  → bigint
    usedAt           → timestamp
```

## Endpoints

```http
GET    /api/v1/promos/validate/:code     → customer cek valid promo
GET    /api/v1/admin/promos              → owner lihat semua promo
POST   /api/v1/admin/promos              → owner buat promo
PATCH  /api/v1/admin/promos/:promoId     → owner update promo
DELETE /api/v1/admin/promos/:promoId     → owner hapus promo
```

## Validate Promo

```http
GET /api/v1/promos/validate/NEWYEAR2027
```

Response:

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "code": "NEWYEAR2027",
    "name": "Tahun Baru 2027",
    "discountType": "FIXED",
    "discountValue": 100000,
    "minBookingAmount": 500000,
    "maxUses": 100,
    "currentUses": 67,
    "remainingUses": 33,
    "expiresAt": "2027-01-03T23:59:59Z"
  }
}
```

## Validation Rules (saat booking)

```text
1. Code exists && isActive = true
2. NOW() BETWEEN startAt AND expiresAt
3. currentUses < maxUses (0 = skip check)
4. subtotal >= minBookingAmount
5. Satu user hanya bisa pakai satu promo per booking
```

Setelah booking:

```text
promo_usage_logs INSERT
promos.currentUses += 1 (dengan row lock / atomic increment)
```

---

# 29. Reviews

Customer dapat memberikan review setelah booking CHECKED_OUT.

```text
reviews
    bookingId    → unique (satu booking = satu review)
    userId       → FK
    propertyId   → FK
    rating       → integer 1-5
    comment      → text
    status       → APPROVED | HIDDEN | PENDING
```

## Endpoints

```http
POST   /api/v1/reviews                    → customer buat review
GET    /api/v1/properties/:propertyId/reviews → public lihat review
GET    /api/v1/me/reviews                 → customer lihat review saya
PATCH  /api/v1/admin/reviews/:reviewId    → owner approve/hide
DELETE /api/v1/admin/reviews/:reviewId    → ownerhapus review
```

## Validasi

```text
1. booking.status = CHECKED_OUT
2. booking.customerUserId = current user
3. Belum ada review untuk booking ini
4. rating: 1-5
5. comment: min 10 chars
```

---

# 30. Staff Shift

## Open Shift

```http
POST /api/v1/staff/shifts/open
```

Payload:

```json
{
  "propertyId": "xxx",
  "openingCash": 500000
}
```

**Staff tidak boleh mempunyai dua shift aktif pada property yang sama.**

Validasi: Staff harus punya assignment aktif ke property tersebut.

## Current Shift

```http
GET /api/v1/staff/shifts/current
```

Response:

```json
{
  "id": "shift-uuid",
  "propertyId": "xxx",
  "propertyName": "Camping Ground Bogor",
  "openedAt": "2026-09-08T08:00:00+07:00",
  "openingCash": 500000,
  "cashSales": 3000000,
  "transferSales": 500000,
  "qrisSales": 200000,
  "expectedCash": 3500000
}
```

## Close Shift

```http
POST /api/v1/staff/shifts/:shiftId/close
```

Payload:

```json
{
  "actualClosingCash": 3480000,
  "notes": "Selisih kas Rp20.000"
}
```

Backend menghitung:

```text
expectedClosingCash = openingCash + cashSales
actualClosingCash = input
difference = actualClosingCash - expectedClosingCash
```

## Shift Report

```http
GET /api/v1/staff/shifts/:shiftId/report
```

Report:

```text
Staff
Property

Shift Open (timestamp)
Shift Close (timestamp)

Walk-in bookings count
Self reservations processed

Cash payments total
Transfer payments total
QRIS payments total

Total transactions

Opening cash
Expected closing cash
Actual closing cash
Cash difference
```

---

# 31. Owner Dashboard

```http
GET /api/v1/admin/dashboard
```

Response:

```text
Today's reservations count
Today's revenue
Today's check-ins count
Today's check-outs count
Occupancy rate (%)

Monthly revenue
Active properties count
Active staff count
Upcoming reservations (7 hari)
```

---

# 32. Owner Transaction Report

```http
GET /api/v1/admin/reports/transactions
```

Filters:

```text
propertyId
staffId
dateFrom
dateTo
paymentMethod
page
limit
```

## Export

```http
GET /api/v1/admin/reports/transactions?format=pdf
GET /api/v1/admin/reports/transactions?format=excel
GET /api/v1/admin/reports/occupancy?format=pdf
GET /api/v1/admin/reports/occupancy?format=excel
```

Libraries:

```text
PDF   → pdfkit
Excel → exceljs
```

---

# 33. Staff Management

## Endpoints

```http
GET    /api/v1/admin/staff
POST   /api/v1/admin/staff
GET    /api/v1/admin/staff/:staffId
PATCH  /api/v1/admin/staff/:staffId
```

## Deactivate / Reactivate

```http
POST /api/v1/admin/staff/:staffId/deactivate
POST /api/v1/admin/staff/:staffId/activate
```

Jangan gunakan delete. Data historis tetap tersimpan.

## Staff Property Assignment

```http
PUT /api/v1/admin/staff/:staffId/properties
```

Payload:

```json
{
  "propertyIds": [
    "bogor-uuid",
    "bandung-uuid"
  ]
}
```

---

# 34. Customer Profile

```http
GET    /api/v1/me
PATCH  /api/v1/me
POST   /api/v1/auth/change-password
```

---

# 35. Email Notifications

Provider: Resend

```text
RESEND_API_KEY → key dari resend.com
```

## Email Types

| Trigger | Template | Recipient |
|---------|----------|-----------|
| Register (customer) | Welcome | customer email |
| Booking created | Booking Confirmation | customer email |
| Payment PAID | Payment Receipt | customer email |
| Booking CANCELLED | Booking Cancelled | customer email |
| Check-in reminder (H-1) | Check-in Reminder | customer email |
| Check-out reminder | Check-out Reminder | customer email |
| Waitlist notified | Waitlist Slot Available | customer email |

**Email dikirim async (tidak blocking response).** Gunakan fire-and-forget atau job queue sederhana.

---

# 36. No-Show Auto Detection

Cron job berjalan setiap 1 jam:

```sql
UPDATE bookings
SET status = 'NO_SHOW', updated_at = NOW()
WHERE status = 'CONFIRMED'
AND (check_in_date + (SELECT check_in_time FROM properties WHERE id = bookings.property_id) + interval '2 hours') < NOW()
```

---

# 37. Suggested Express Architecture

```text
src/
│
├── app.ts
├── server.ts
│
├── config/
│   ├── env.ts
│   ├── database.ts
│   ├── midtrans.ts
│   └── resend.ts
│
├── database/
│   └── prisma/
│       └── client.ts
│
├── middleware/
│   ├── auth.middleware.ts
│   ├── role.middleware.ts
│   ├── property-access.middleware.ts
│   ├── validation.middleware.ts
│   ├── rate-limit.middleware.ts
│   └── error.middleware.ts
│
├── modules/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.repository.ts
│   │   ├── auth.schema.ts
│   │   └── auth.routes.ts
│   │
│   ├── users/
│   ├── staff/
│   ├── properties/
│   ├── facilities/
│   ├── unit-types/
│   ├── units/
│   ├── pricing/
│   ├── availability/
│   ├── bookings/
│   ├── payments/
│   ├── shifts/
│   ├── promos/
│   ├── reviews/
│   ├── waitlist/
│   ├── reports/
│   └── dashboard/
│
├── shared/
│   ├── errors/
│   ├── utils/
│   ├── constants/
│   ├── types/
│   └── services/
│       ├── email.service.ts
│       ├── file-upload.service.ts
│       └── midtrans.service.ts
│
└── jobs/
    ├── booking-expiry.job.ts
    ├── no-show-detection.job.ts
    └── waitlist-notify.job.ts
```

---

# 38. Architecture Pattern

```text
Route
  ↓
Controller
  ↓
Service
  ↓
Repository
  ↓
Prisma → PostgreSQL
```

Controller tidak boleh berisi business logic.

---

# 39. Booking Transaction

Create booking wajib menggunakan database transaction.

```ts
await prisma.$transaction(async (tx) => {
    // 1. Lock inventory rows
    await tx.$queryRaw`SELECT ... FOR UPDATE`

    // 2. Check availability
    const available = await availabilityService.check(tx, {...})
    if (!available) throw new UnitNotAvailableError()

    // 3. Calculate pricing
    const pricing = await pricingService.calculate(tx, {...})

    // 4. Apply promo jika ada
    const discount = promo ? await promoService.apply(tx, {...}) : 0

    // 5. Create booking
    const booking = await bookingRepository.create(tx, {...})

    // 6. Create booking items + nights
    await bookingItemRepository.createMany(tx, {...})

    // 7. Log promo usage
    if (promo) await promoService.logUsage(tx, {...})

    return booking
})
```

---

# 40. Concurrency Protection

Availability API hanya memberikan informasi.

Validasi final dilakukan ketika `POST /bookings`:

```text
DB transaction (serializable) + row locking
untuk mencegah overbooking.
```

---

# 41. API Standard Response

Success:

```json
{
  "success": true,
  "data": {},
  "meta": null
}
```

List:

```json
{
  "success": true,
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100,
    "totalPages": 5
  }
}
```

Error:

```json
{
  "success": false,
  "error": {
    "code": "UNIT_NOT_AVAILABLE",
    "message": "Selected unit is no longer available."
  }
}
```

---

# 42. HTTP Status

```text
200 OK
201 Created
204 No Content

400 Bad Request
401 Unauthorized
403 Forbidden
404 Not Found
409 Conflict
422 Validation Error
429 Too Many Requests

500 Internal Server Error
```

---

# 43. Validation

Library: Zod

Contoh:

```ts
const CreateBookingSchema = z.object({
    propertyId: z.string().uuid(),
    checkIn: z.coerce.date(),
    checkOut: z.coerce.date(),
    adults: z.number().int().positive(),
    children: z.number().int().nonnegative(),
    items: z.array(
        z.object({
            unitTypeId: z.string().uuid(),
            quantity: z.number().int().positive().max(20)
        })
    ).min(1),
    promoCode: z.string().optional(),
    notes: z.string().max(500).optional()
})
```

---

# 44. Security

```text
Rate limiting               → express-rate-limit
Password hashing            → bcryptjs (cost: 12)
JWT validation              → jsonwebtoken + verify
Refresh token rotation      → hapus lama, buat baru
Input validation            → Zod
SQL injection protection    → Prisma (parameterized queries)
CORS                        → cors package
Helmet                      → helmet package
Request size limitation     → express.json({ limit: '1mb' })
File upload validation      → multer + custom filter
Authorization middleware    → RBAC per route
```

---

# 45. Activity Logs

Direkomendasikan:

```text
activity_logs
```

Struktur:

```text
id
user_id
property_id
action          → CREATE | UPDATE | DELETE | LOGIN | LOGOUT | BOOKING | PAYMENT | CHECK_IN | CHECK_OUT
entity_type     → booking | payment | shift | user | property
entity_id
old_values      → jsonb
new_values      → jsonb
ip_address
user_agent
created_at
```

---

# 46. Soft Delete

Direkomendasikan untuk:

```text
properties
unit_types
facilities
```

Record financial tidak dihapus — gunakan status:

```text
bookings → CANCELLED / EXPIRED / NO_SHOW
payments → CANCELLED / REFUNDED
```

---

# 47. Timezone

Karena property dapat berada di kota berbeda:

```text
properties.timezone → Asia/Jakarta | Asia/Makassar | Asia/Jayapura
```

Database timestamp tetap disimpan UTC.

Conversion ke local timezone dilakukan ketika menampilkan data.

---

# 48. MVP Scope

## Phase 1 — Foundation

```text
Project setup (Express + TypeScript + Prisma)
Database schema + migration
Authentication (JWT + Refresh Token)
RBAC middleware

Users (register/login/me)
Staff management (CRUD + assignment)
Properties (CRUD + images)
Facilities (CRUD + assignment)
Unit Types (CRUD)
Units (CRUD)
```

## Phase 2 — Reservation Engine

```text
Pricing engine
Special pricing
Availability API
Booking (self reservation)
Price snapshot (booking_item_nights)
Unit allocation
Promo code
Waitlist
```

## Phase 3 — Operation

```text
Walk-in booking
Check-in + check-out
Staff shift (open/close/report)
Payment (cash + Midtrans)
Midtrans webhook
Booking expiry cron
No-show detection cron
```

## Phase 4 — Owner Monitoring

```text
Dashboard
Transaction reports
Occupancy reports
Revenue reports
Export PDF/Excel
Reviews management
```

## Phase 5 — Email & Notification

```text
Email register welcome
Booking confirmation email
Payment receipt email
Check-in/check-out reminder email
Waitlist notification email
```

---

# 49. Future Scope

Arsitektur ini nantinya masih dapat diperluas dengan:

```text
Add-on rental (BBQ package, firewood, tent rental)
Food order
Dynamic pricing
Membership
OTA integration
WhatsApp notification
Invoice PDF
Reschedule booking
Blocked dates
Maintenance calendar
Multi-language support
Mobile app (React Native / Flutter)
```

tanpa perlu mendesain ulang core booking system.
