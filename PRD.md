# AGENTS.md

## Camping Ground Reservation System — Frontend Mockup

This repository is currently focused on building the **frontend UI/UX mockup only** for a multi-property Camping Ground Reservation System.

The frontend must represent the actual product requirements and business flows defined in this document.

At this stage:

- DO NOT integrate with backend APIs.
- DO NOT implement Express API calls.
- DO NOT connect to PostgreSQL.
- DO NOT implement real authentication.
- DO NOT implement real payment gateway integration.
- DO NOT implement real file upload infrastructure.
- DO NOT implement WebSocket.
- DO NOT create backend services.
- DO NOT create unnecessary server endpoints.

All application data must use:

- mock data
- local state
- local fixtures
- static JSON / TypeScript objects

The objective is to create a frontend prototype that is visually complete and functionally navigable enough to validate the product experience before backend integration begins.

---

# 1. Product Overview

The application is a reservation and operational management platform for a camping ground business.

The business can own multiple camping ground properties across different cities.

Example:

```text
Owner
│
├── Camping Ground Puncak
├── Rimba Camp Bandung
└── Sukabumi Riverside Camp
```

There are three primary user experiences:

```text
Customer
Staff
Owner / Admin
```

Each role has a different interface and workflow.

Do not create one generic dashboard and simply hide navigation items based on role.

The Customer, Staff, and Owner interfaces should share a design system but have different information architecture.

---

# 2. Current Development Scope

Current development phase:

```text
FRONTEND MOCKUP ONLY
```

The goal is to produce:

- complete visual UI
- responsive layouts
- navigation
- realistic forms
- mock tables
- mock booking flows
- realistic business data
- loading states
- empty states
- error states
- confirmation dialogs
- responsive mobile views
- responsive desktop views

Frontend interactions may work locally.

Example:

```text
Select property
↓
Select dates
↓
View mock availability
↓
Select accommodation
↓
Review reservation
↓
Show mock confirmation
```

This flow is allowed.

However:

```text
fetch("/api/bookings")
```

is NOT allowed during this phase.

---

# 3. Future Backend

The future backend will use approximately:

```text
Node.js
Express.js
TypeScript
PostgreSQL
```

The frontend should therefore keep business logic reasonably separated from presentation.

However, do not build backend abstractions prematurely.

Do not create fake REST endpoints just to simulate a backend.

Prefer simple local services or mock repositories.

Example:

```text
src/
  mocks/
  data/
  services/
```

rather than:

```text
/api/
fake-server/
mock-express-server/
```

---

# 4. Source of Truth

The frontend must follow the product architecture described in this AGENTS.md.

Important domain concepts:

```text
Property
Unit Type
Physical Unit
Facility
Special Rate
Booking
Booking Item
Booking Night
Payment
Staff
Staff Property Assignment
Staff Shift
```

Do not change the domain model simply because another UI implementation appears easier.

---

# 5. Core Domain Hierarchy

The basic business hierarchy is:

```text
Property
    ↓
Unit Type
    ↓
Physical Unit
```

Example:

```text
Rimba Camp Bandung
│
├── Regular Camping Spot
│   ├── RC-01
│   ├── RC-02
│   └── RC-03
│
└── Glamping Family
    ├── GF-01
    ├── GF-02
    └── GF-03
```

A `Unit Type` is the rentable product presented to the customer.

A `Physical Unit` is the actual physical accommodation assigned by staff.

These concepts MUST NOT be merged.

---

# 6. Customer Booking Rule

Customers reserve:

```text
Unit Type + Quantity
```

Example:

```text
Glamping Family × 2
```

Customers DO NOT choose:

```text
GF-01
GF-03
```

Physical unit allocation is handled by Staff before check-in.

The frontend must preserve this distinction everywhere.

---

# 7. Multi-Property Rules

The system supports multiple properties.

Example mock properties:

```text
Camping Ground Puncak

Rimba Camp Bandung

Sukabumi Riverside Camp
```

Owner:

```text
can access all properties
```

Staff:

```text
can operate only within their currently assigned property
```

Customer:

```text
can browse any active property
```

---

# 8. Staff Assignment

Staff are assigned to a property.

Example:

```text
Budi Santoso
Role:
Staff

Current Property:
Rimba Camp Bandung
```

The UI should assume that assignment history may exist.

Example:

```text
01 Jan 2026 – 30 Jun 2026
Camping Ground Puncak

01 Jul 2026 – Present
Rimba Camp Bandung
```

For the current mockup, this can be represented using mock data.

Changing the current assignment should not alter historical transaction records.

---

# 9. User Roles

Use the following roles:

```text
OWNER
STAFF
CUSTOMER
```

Do not invent unnecessary roles during the mockup phase.

Possible future roles are outside the current scope.

---

# 10. User Status

User / staff status:

```text
ACTIVE
INACTIVE
SUSPENDED
```

Staff with historical transactions must not be represented as deleted.

Owner actions should use:

```text
Deactivate Staff
Reactivate Staff
```

instead of:

```text
Delete Staff
```

---

# 11. Property Data

A property may contain:

```text
id
name
slug
description
city
province
address
latitude
longitude
timezone
checkInTime
checkOutTime
status
images
facilities
```

Example:

```text
Rimba Camp Bandung
Lembang, Bandung Barat
Jawa Barat

Check-in:
14:00

Check-out:
11:00
```

---

# 12. Property Status

Use:

```text
ACTIVE
INACTIVE
```

Do not permanently delete properties in the UI.

---

# 13. Facilities

Example facilities:

```text
Toilet
Hot Shower
Mushola
Electricity
Parking
WiFi
BBQ Area
Campfire Area
Restaurant
Playground
```

Facilities can belong to:

```text
Property

or

Unit Type
```

Do not treat every facility as belonging directly to the physical unit.

---

# 14. Unit Types

Example unit types:

```text
Regular Camping Spot
Premium Camping Spot
Campervan Spot
Glamping Standard
Glamping Family
Cabin
```

Fields represented in the UI:

```text
name
description
capacity
weekday price
weekend price
facilities
images
available quantity
status
```

---

# 15. Physical Unit Status

Use only:

```text
AVAILABLE
MAINTENANCE
INACTIVE
```

DO NOT use:

```text
BOOKED
OCCUPIED
RESERVED
```

as permanent physical unit statuses.

Availability is date-dependent.

A unit may be unavailable on one date but available on another.

---

# 16. Pricing Rules

The pricing system supports:

```text
Weekday Rate
Weekend Rate
Special Date Rate
```

Priority:

```text
Special Rate
    ↓
Weekend Rate
    ↓
Weekday Rate
```

Example:

```text
Glamping Family

Weekday
Rp700.000

Weekend
Rp900.000
```

Special rate:

```text
Christmas & New Year

20 Dec 2026
–
03 Jan 2027

Rp1.200.000 / night
```

---

# 17. Nightly Price Breakdown

A booking can have different prices per night.

Example:

```text
12 Sep 2026
Rp700.000
Weekday

13 Sep 2026
Rp900.000
Weekend

14 Sep 2026
Rp900.000
Weekend
```

The frontend must support this display.

Do not simply display:

```text
3 nights × Rp700.000
```

if the actual nightly prices differ.

---

# 18. Historical Pricing

Past bookings should display the price recorded when the booking was created.

The UI should behave as if bookings contain price snapshots.

Do not visually imply that past transactions are recalculated from the current price.

---

# 19. Booking Sources

Supported booking sources:

```text
SELF_RESERVATION
WALK_IN
ADMIN
```

Display labels can use:

```text
Self Reservation
Walk-in
Admin
```

---

# 20. Booking Status

Use exactly:

```text
PENDING
AWAITING_PAYMENT
CONFIRMED
CHECKED_IN
CHECKED_OUT
CANCELLED
EXPIRED
NO_SHOW
```

Do not add arbitrary status values unless the product specification is intentionally updated.

Recommended labels:

```text
Pending
Menunggu Pembayaran
Terkonfirmasi
Check-in
Check-out
Dibatalkan
Kedaluwarsa
Tidak Hadir
```

---

# 21. Booking Structure

One booking may contain multiple accommodation types.

Example:

```text
Booking
CG-260908-A7QX2B

2 × Regular Camping Spot

1 × Glamping Family
```

Do not design the frontend under the assumption that one booking equals one unit.

---

# 22. Booking Data

Mock booking data should support:

```text
booking code

property

guest

booking source

booking status

check-in date

check-out date

number of adults

number of children

booking items

nightly pricing

subtotal

discount

additional fee

grand total

payments

check-in information

check-out information

notes
```

---

# 23. Walk-In Booking

Staff can create reservations for guests arriving directly at the property.

Walk-in customers DO NOT need an account.

Required guest data:

```text
Name
Phone
```

Optional:

```text
Email
```

The frontend must not force account registration during walk-in booking.

---

# 24. Payments

One booking may have multiple payments.

Example:

```text
Grand Total
Rp2.000.000

Payment 1
Rp500.000

Payment 2
Rp1.000.000

Remaining
Rp500.000
```

Supported mock payment methods:

```text
CASH
BANK_TRANSFER
QRIS
PAYMENT_GATEWAY
OTHER
```

Display:

```text
Cash
Bank Transfer
QRIS
Online Payment
Other
```

---

# 25. Payment Status

Supported statuses:

```text
PENDING
PAID
FAILED
CANCELLED
REFUNDED
```

Do not assume that:

```text
booking confirmed = fully paid
```

A confirmed booking may still have a remaining balance.

---

# 26. Staff Shift

Staff operational workflow includes shifts.

A staff member can open a shift.

Example:

```text
Budi Santoso

Rimba Camp Bandung

Shift Opened
08:00

Opening Cash
Rp500.000
```

During the shift show:

```text
Cash Transactions
QRIS
Bank Transfer
Other

Expected Cash
```

At shift close:

```text
Actual Closing Cash

Difference

Notes
```

---

# 27. Design Direction

The UI MUST look like a real hospitality application.

Avoid AI-generated design stereotypes.

DO NOT create:

- futuristic UI
- neon accents
- excessive gradients
- glassmorphism
- giant rounded cards
- excessive shadow
- decorative blobs
- excessive floating elements
- random charts
- oversized dashboard metrics
- sparkles
- fake AI assistant elements
- giant hero headings
- excessive pills
- excessive icons
- everything inside cards

The application must feel:

```text
calm
professional
natural
operational
hospitality-focused
human-designed
```

---

# 28. Visual Language

Recommended direction:

```text
Warm neutral surfaces

Off-white backgrounds

Muted forest green

Charcoal / near-black typography

Stone / sand secondary tones
```

Use color conservatively.

Use semantic colors for statuses.

Avoid bright saturated UI colors unless required for an important warning.

---

# 29. Typography

Prefer a clean sans-serif.

Suitable direction:

```text
Inter
Geist
Manrope
Plus Jakarta Sans
```

Do not use decorative outdoor/camping fonts for application content.

Brand typography may have minor character, but UI text must remain highly readable.

---

# 30. Layout Principles

Prefer:

```text
Whitespace
Typography hierarchy
Dividers
Tables
Lists
Sections
Grids
Panels
```

Use cards only where they provide meaningful grouping.

Good use of cards:

```text
Property card
Accommodation card
Booking summary
Small dashboard summary
```

Poor use:

```text
Every input inside a card
Every table row inside a card
Every text section inside a card
```

---

# 31. Responsive Requirements

Customer interface:

```text
Mobile First
```

Target widths:

```text
390px
768px
1440px
```

Staff:

```text
Tablet / Desktop First
```

Target:

```text
1024px
1440px
```

Owner/Admin:

```text
Desktop First
```

Primary target:

```text
1440px
```

Mobile views must not merely be compressed desktop layouts.

---

# 32. Application Areas

The application should have three separate top-level areas.

Suggested routes:

```text
/
```

Customer application.

```text
/staff
```

Staff application.

```text
/admin
```

Owner/Admin application.

Exact routes can be adjusted to the framework, but keep role experiences clearly separated.

---

# 33. Mock Authentication

Do NOT implement real authentication.

Create a development-only mock role switcher if useful.

Example:

```text
View as:

Customer
Staff
Owner
```

This is only for development/demo purposes.

It should be easy to remove later.

Do not build JWT logic.

Do not create fake access tokens.

Do not store fake passwords.

---

# 34. Customer Navigation

Recommended:

```text
Home

Properties

My Bookings

Profile
```

Logged-out state may show:

```text
Sign In
```

---

# 35. Customer Home

Home must focus on property discovery.

Required:

```text
Destination / City

Check-in

Check-out

Guests

Search
```

Below:

```text
Featured Properties

Browse by Destination
```

Use realistic camping-ground imagery.

Avoid generic marketing filler.

Do not create sections such as:

```text
Why Choose Us

Unlock Your Adventure

Experience Nature Differently

Transform Your Journey
```

unless they serve an actual product purpose.

---

# 36. Property Search

Property search result should display:

```text
Image

Property name

City

Short description

Important facilities

Starting price

Availability summary
```

Allow users to edit:

```text
destination
check-in
check-out
guests
```

---

# 37. Property Detail

Required sections:

```text
Gallery

Property Information

Location

Facilities

Check-in / Check-out information

Availability Search

Available Accommodation
```

Available accommodation cards should show:

```text
Unit type

Photos

Capacity

Facilities

Available quantity

Price

Quantity selector
```

---

# 38. Booking Selection

Example:

```text
Glamping Family

6 guests

3 units available

Weekday
Rp700.000

Weekend
Rp900.000

Quantity

[-] 2 [+]
```

Customer must select quantity.

Never show physical unit IDs to customers.

---

# 39. Reservation Review

Required:

```text
Property

Guest information

Dates

Number of nights

Guests

Booking items

Nightly prices

Subtotal

Discount

Additional fees

Grand total
```

The price breakdown should be understandable without hidden calculations.

---

# 40. Booking Confirmation

Show:

```text
Booking code

Property

Dates

Accommodation

Guest

Grand total

Booking status

Payment status
```

Actions:

```text
View Booking

Continue to Payment
```

No confetti.

No excessive celebration animation.

---

# 41. Customer My Bookings

Recommended grouping:

```text
Upcoming

Active

Past

Cancelled
```

Each booking summary:

```text
Booking code

Property

Dates

Accommodation

Total

Booking status

Payment status
```

---

# 42. Customer Booking Detail

Required:

```text
Booking code

Booking status

Payment status

Property

Guest

Dates

Accommodation

Nightly pricing

Payment history

Paid amount

Remaining balance

Activity / timeline
```

---

# 43. Customer Profile

Only include relevant account management.

Required:

```text
Name

Email

Phone

Change Password
```

Do not add unrelated SaaS account settings.

---

# 44. Staff Navigation

Recommended:

```text
Today

Bookings

Walk-In Booking

Check-in / Check-out

Current Shift
```

Always display current staff context.

Example:

```text
Budi Santoso
Staff

Rimba Camp Bandung
```

---

# 45. Staff Today Page

This is an operational screen.

Prioritize:

```text
Today's Arrivals

Today's Departures

Currently Staying

Pending Reservations
```

Important CTA:

```text
New Walk-In Booking
```

Small summary numbers are allowed.

Avoid generic business analytics charts.

---

# 46. Staff Booking List

Filters:

```text
Booking Code

Guest

Phone

Date

Status
```

Table:

```text
Booking

Guest

Stay

Accommodation

Source

Status

Payment

Total
```

---

# 47. Staff Booking Detail

Required sections:

```text
Booking Information

Guest

Stay

Accommodation

Payment

Unit Allocation

Activity
```

Possible actions:

```text
Assign Unit

Record Payment

Check In

Check Out

Cancel Booking
```

Only show actions relevant to the booking status.

---

# 48. Walk-In Flow

Create an efficient receptionist flow.

Recommended sequence:

```text
1 Guest

2 Stay

3 Accommodation

4 Payment

5 Confirmation
```

This can be:

```text
stepper

or

single-page structured workflow
```

Prioritize speed and clarity over visual decoration.

---

# 49. Unit Allocation

Staff can allocate physical units.

Example:

```text
Glamping Family × 2

Required:
2 units

Available:

[ ] GF-01

[ ] GF-02

[ ] GF-03

[ ] GF-04
```

After selecting:

```text
GF-01
GF-03
```

show them as allocated units.

---

# 50. Staff Check-In

Check-in UI must display:

```text
Guest

Booking

Date

Accommodation

Payment status

Outstanding balance

Physical unit assignment
```

Require allocation completeness before the mock flow allows check-in.

---

# 51. Staff Check-Out

Display:

```text
Guest

Booking

Physical Units

Payment Status

Outstanding Balance

Stay Details
```

Primary action:

```text
Confirm Check-Out
```

---

# 52. Staff Shift

Current shift screen should show:

```text
Staff

Property

Opened At

Opening Cash

Cash Sales

QRIS

Bank Transfer

Other

Expected Closing Cash
```

Close shift form:

```text
Actual Closing Cash

Difference

Notes
```

---

# 53. Owner Navigation

Recommended desktop sidebar:

```text
Overview

Operations
    Bookings
    Transactions

Properties
    Properties
    Unit Types
    Units
    Facilities
    Pricing

Team
    Staff

Reports
```

Do not create unnecessary menu items.

---

# 54. Owner Overview

Property scope selector:

```text
All Properties

or

specific property
```

Useful summaries:

```text
Today's Reservations

Today's Revenue

Today's Check-ins

Today's Check-outs

Occupancy
```

Below:

```text
Upcoming Arrivals

Recent Transactions

Property Performance
```

Use at most a small number of useful charts.

Do not fill the dashboard with decorative graphs.

---

# 55. Property Management

Property list:

```text
Photo

Property

City

Status

Unit Types

Active Units

Staff
```

Actions:

```text
View

Edit

Manage Units

Pricing
```

---

# 56. Property Form

Organize into sections.

```text
Basic Information

Location

Operational Settings

Facilities

Images
```

Fields:

```text
Name

Description

City

Province

Address

Latitude

Longitude

Timezone

Check-in Time

Check-out Time

Status
```

---

# 57. Property Images

Mock functionality:

```text
Upload placeholder image

Reorder

Set primary

Remove
```

At this phase, use local preview / static assets.

Do not integrate cloud storage.

---

# 58. Unit Type Management

List:

```text
Name

Capacity

Weekday

Weekend

Physical Units

Status
```

Example:

```text
Glamping Family

6 guests

Rp700.000 weekday

Rp900.000 weekend

4 units

Active
```

---

# 59. Unit Type Detail

Sections:

```text
General

Pricing

Facilities

Images

Physical Units
```

Keep this manageable and operational.

---

# 60. Physical Units

Example:

```text
GF-01
Available

GF-02
Available

GF-03
Maintenance

GF-04
Available
```

Allow mock status changes.

Do not display permanent `BOOKED` status.

---

# 61. Special Pricing

Required:

```text
Name

Date Range

Price

Priority

Status
```

Example:

```text
Christmas & New Year

20 Dec 2026
–
03 Jan 2027

Rp1.200.000

Priority 100

Active
```

Use:

```text
Create

Edit

Deactivate
```

Do not permanently delete historical pricing records in mock workflows.

---

# 62. Owner Booking Management

Filters:

```text
Property

Date

Status

Source

Customer

Booking Code
```

Columns:

```text
Booking

Property

Guest

Stay

Accommodation

Source

Status

Payment

Total
```

---

# 63. Transaction Management

Filters:

```text
Property

Staff

Payment Method

Date Range

Status
```

Columns:

```text
Date

Booking

Property

Guest

Method

Received By

Amount

Status
```

---

# 64. Staff Management

Staff list:

```text
Name

Email

Phone

Current Property

Status

Last Login
```

Actions:

```text
View

Edit

Deactivate

Reactivate
```

Never show:

```text
Delete Staff
```

---

# 65. Staff Detail

Show:

```text
Basic Information

Status

Current Assignment

Assignment History

Recent Activity

Recent Bookings

Shift History
```

Property reassignment UI:

```text
Current Property

Rimba Camp Bandung

Change to:

Camping Ground Puncak
```

Confirmation:

```text
Budi Santoso will be moved from
Rimba Camp Bandung
to
Camping Ground Puncak.
```

---

# 66. Reports

Mock reports may include:

```text
Revenue

Transactions

Booking count

Occupancy

Payment methods

Walk-In vs Self Reservation

Cancellation
```

Filters:

```text
Property

Staff

Date Range
```

DO NOT include unrelated SaaS metrics:

```text
MRR

ARR

CAC

Churn

User Acquisition
```

---

# 67. Mock Data

Create realistic fixtures.

Recommended structure:

```text
src/mocks/
├── users.ts
├── properties.ts
├── facilities.ts
├── unit-types.ts
├── units.ts
├── bookings.ts
├── payments.ts
├── shifts.ts
└── special-rates.ts
```

Use deterministic fixture IDs.

Example:

```ts
export const properties = [
  {
    id: "property-puncak",
    name: "Camping Ground Puncak",
  },
  {
    id: "property-bandung",
    name: "Rimba Camp Bandung",
  },
]
```

Do not randomly regenerate important mock data on every render.

---

# 68. Mock Data Quality

Avoid meaningless fixtures.

Bad:

```text
John Doe
Company A
Product One
Lorem ipsum
```

Good:

```text
Budi Santoso
Rina Pratiwi
Andika Ramadhan

Camping Ground Puncak
Rimba Camp Bandung
Sukabumi Riverside Camp

Glamping Family
Regular Camping Spot
Campervan Spot
```

Use Indonesian phone, currency, date, and location conventions.

---

# 69. Currency

Use:

```text
IDR
```

Display:

```text
Rp700.000

Rp1.200.000
```

Centralize currency formatting.

Example utility:

```text
formatCurrency()
```

Do not manually concatenate currency values throughout components.

---

# 70. Dates

Centralize date formatting.

Display should generally follow Indonesian conventions.

Examples:

```text
8 Sep 2026

8 September 2026

20–22 Des 2026
```

Do not hardcode formatted date strings everywhere.

---

# 71. Mock Services

If component logic starts becoming complex, create simple frontend services.

Example:

```text
src/services/
├── mockAvailabilityService.ts
├── mockPricingService.ts
└── mockBookingService.ts
```

These services operate ONLY on local mock data.

Do not call network APIs.

Example:

```ts
getMockAvailability({
  propertyId,
  checkIn,
  checkOut,
})
```

This is acceptable.

---

# 72. Availability Mock Logic

Availability should behave consistently enough for UX testing.

Use mock rules based on:

```text
Property

Unit Type

Date Range

Existing Mock Bookings
```

Do not simply generate a random availability number every render.

Same input should produce the same result.

---

# 73. Mock Pricing Logic

Mock pricing should replicate future backend behavior.

For each stay date:

```text
Special Rate
else Weekend
else Weekday
```

Example:

```ts
calculateMockNightlyRates()
```

The purpose is to make frontend states realistic.

This logic is temporary and will later be replaced by backend responses.

Keep it isolated.

---

# 74. No Duplicate Business Logic

Do not implement pricing calculations directly inside components.

Bad:

```text
PropertyCard.tsx
BookingSummary.tsx
Checkout.tsx
BookingDetail.tsx
```

each independently calculating prices.

Instead:

```text
mockPricingService
```

returns normalized data.

---

# 75. Component Architecture

Prefer reusable domain-aware components.

Example:

```text
components/
├── ui/
├── property/
├── booking/
├── pricing/
├── payment/
├── staff/
├── admin/
└── shared/
```

Avoid:

```text
components/
├── Card1.tsx
├── Card2.tsx
├── Box.tsx
├── Widget1.tsx
└── Widget2.tsx
```

Names should describe purpose.

---

# 76. UI Primitives

Recommended reusable UI primitives:

```text
Button

Input

Textarea

Select

Checkbox

Radio

Date Picker

Date Range Picker

Dialog

Drawer

Dropdown

Tabs

Badge

Table

Pagination

Tooltip

Toast

Skeleton

Empty State
```

Do not create multiple nearly identical implementations of the same primitive.

---

# 77. Domain Components

Recommended:

```text
PropertyCard

PropertyGallery

UnitTypeCard

AvailabilityBadge

BookingStatusBadge

PaymentStatusBadge

BookingSummary

NightlyPricingBreakdown

BookingTimeline

PaymentHistory

UnitAllocationPanel

StaffShiftSummary

PropertySelector
```

---

# 78. Forms

Forms must include:

```text
labels

errors

disabled states

helper text where necessary

loading state
```

Do not rely on placeholder text as the only field label.

---

# 79. Validation

Frontend mock validation is allowed.

Example:

```text
check-out must be after check-in

quantity must be > 0

guest name required

phone required for walk-in
```

Do not attempt to replicate every future backend validation rule.

Backend remains the eventual source of truth.

---

# 80. Loading States

Every data-heavy screen should have a reasonable loading representation.

Examples:

```text
Property list skeleton

Booking table skeleton

Property detail skeleton

Dashboard skeleton
```

Do not use a full-screen spinner for every interaction.

---

# 81. Empty States

Design realistic empty states.

Example:

```text
No upcoming bookings

Belum ada reservasi mendatang.
```

Action where appropriate:

```text
Cari Camping Ground
```

Staff example:

```text
Tidak ada tamu yang dijadwalkan check-in hari ini.
```

Avoid decorative illustrations unless genuinely helpful.

---

# 82. Error States

Examples:

```text
Failed to load properties

No availability

Invalid date range

Payment failed

Booking expired
```

Since backend is not connected, simulate these states through mock scenarios where useful.

---

# 83. Confirmation Dialogs

Use confirmations for impactful actions:

```text
Cancel Booking

Check-In

Check-Out

Deactivate Staff

Move Staff Property

Close Shift

Deactivate Property
```

Avoid confirmation dialogs for harmless actions.

---

# 84. Status Badge Style

Use restrained semantic styling.

Examples:

```text
Confirmed
green

Awaiting Payment
amber

Cancelled
red

Checked-In
blue / teal

Inactive
gray
```

Status must not rely solely on color.

Always include text.

---

# 85. Accessibility

Minimum requirements:

```text
Visible focus states

Keyboard-accessible controls

Readable contrast

Semantic HTML

Form labels

Button accessible names

44px recommended touch target on mobile
```

Images must have meaningful `alt` text.

Decorative images should use empty alt text.

---

# 86. Navigation Accessibility

Current route must be clearly distinguishable.

Do not rely solely on color.

Mobile navigation should remain usable with keyboard and touch input.

---

# 87. Image Handling

Use realistic camping ground images.

Images should represent:

```text
Camping sites

Forest camps

Glamping tents

Cabins

Campgrounds

Outdoor facilities
```

Avoid:

```text
generic corporate office photos

abstract AI artwork

futuristic landscape art
```

For development, images may use:

```text
local assets

reliable placeholder image URLs
```

Keep image source configuration easy to replace.

---

# 88. Copywriting

Use natural Indonesian interface copy.

Examples:

```text
Cari tempat camping

Cek ketersediaan

Pilih penginapan

3 unit tersedia

Rincian harga

Menunggu pembayaran

Pembayaran belum lunas

Assign unit

Konfirmasi check-in

Buka shift

Tutup shift

Staff tidak aktif
```

Avoid AI-like marketing language.

Do not write:

```text
Elevate your experience

Unlock endless possibilities

Seamless adventure management

Experience the future of camping
```

---

# 89. Desktop Tables

Staff and Admin screens should use real tables where appropriate.

Do not convert every desktop table row into cards.

Use:

```text
header

rows

sorting indicators if relevant

filters

pagination
```

Responsive mobile adaptations may use stacked layouts where necessary.

---

# 90. Filters

Filters should reflect actual product requirements.

Do not add arbitrary filters to make screens appear advanced.

Example booking filters:

```text
Property

Date

Status

Source

Guest

Booking Code
```

---

# 91. Search

Search interactions should be debounced only if actually needed.

For mock datasets, local filtering is acceptable.

No API search implementation.

---

# 92. URL State

Where useful, store navigation/filter context in URL query parameters.

Example customer search:

```text
/properties?city=bandung&checkIn=2026-12-20&checkOut=2026-12-22&guests=4
```

This is recommended because it mirrors future real application behavior.

---

# 93. State Management

Do not introduce a global state library without reason.

Prefer:

```text
local state

URL state

React Context where truly shared
```

Only introduce tools such as Zustand if application complexity clearly justifies it.

Do not introduce Redux for this mockup unless explicitly requested.

---

# 94. No Premature Backend Layer

DO NOT create:

```text
axios API clients

React Query API hooks

JWT interceptor

refresh token logic

backend DTO generation

OpenAPI client

WebSocket clients
```

during this phase.

These will be implemented later.

---

# 95. Future API Preparation

Components should receive data through props or clearly defined hooks/services.

Example:

```ts
<BookingSummary booking={booking} />
```

rather than importing the mock fixture directly inside the component.

Good:

```text
Page
↓
Mock Data / Mock Service
↓
Component props
```

This allows mock data to later be replaced with API data without rebuilding the visual components.

---

# 96. Recommended Frontend Layering

A practical structure:

```text
src/
│
├── app/
│
├── components/
│   ├── ui/
│   ├── shared/
│   ├── customer/
│   ├── staff/
│   └── admin/
│
├── features/
│   ├── properties/
│   ├── availability/
│   ├── bookings/
│   ├── pricing/
│   ├── payments/
│   ├── shifts/
│   └── staff/
│
├── mocks/
│
├── services/
│
├── types/
│
├── utils/
│
├── constants/
│
└── assets/
```

Adjust according to the existing framework.

Do not restructure an existing healthy project unnecessarily.

---

# 97. Type Definitions

Define domain types centrally.

Example:

```ts
type BookingStatus =
  | "PENDING"
  | "AWAITING_PAYMENT"
  | "CONFIRMED"
  | "CHECKED_IN"
  | "CHECKED_OUT"
  | "CANCELLED"
  | "EXPIRED"
  | "NO_SHOW"
```

Do not scatter string literals across components.

Same applies to:

```text
UserRole

UserStatus

PropertyStatus

UnitStatus

BookingSource

PaymentStatus

PaymentMethod
```

---

# 98. No `any`

Avoid TypeScript `any`.

Use proper types.

If temporary unknown data is required, prefer:

```ts
unknown
```

and narrow it appropriately.

---

# 99. Constants

Centralize business constants.

Example:

```text
BOOKING_STATUSES

PAYMENT_METHODS

UNIT_STATUSES

USER_STATUSES
```

Do not duplicate equivalent arrays inside multiple screens.

---

# 100. Formatting Utilities

Create shared helpers:

```text
formatCurrency

formatDate

formatDateRange

formatTime

formatBookingStatus

formatPaymentStatus
```

Avoid copy-pasted formatting code.

---

# 101. Routing

Routes should be logically grouped.

Example:

```text
Customer

/
 /properties
 /properties/:slug
 /booking/review
 /booking/success
 /my-bookings
 /my-bookings/:id
 /profile
```

Staff:

```text
/staff
/staff/bookings
/staff/bookings/:id
/staff/walk-in
/staff/check-in
/staff/check-out
/staff/shift
```

Admin:

```text
/admin
/admin/bookings
/admin/transactions
/admin/properties
/admin/properties/:id
/admin/unit-types
/admin/units
/admin/facilities
/admin/pricing
/admin/staff
/admin/staff/:id
/admin/reports
```

Exact routes may change, but preserve the product hierarchy.

---

# 102. Role Layouts

Use dedicated layouts.

Example:

```text
CustomerLayout

StaffLayout

AdminLayout
```

Do not overload one mega-layout with dozens of role conditionals.

---

# 103. Customer Mobile First

The customer booking process must be pleasant on mobile.

Priority screens:

```text
Home

Search

Property Detail

Accommodation Selection

Reservation Review

Booking Confirmation

My Bookings
```

Test around:

```text
390px width
```

---

# 104. Staff Operational Efficiency

Staff screens must minimize unnecessary clicks.

Receptionist workflows should favor:

```text
clear tables

search

large enough controls

visible payment state

visible booking state

quick actions
```

Do not optimize Staff UI for visual storytelling.

Optimize for operations.

---

# 105. Admin Information Density

Admin screens may be denser than Customer UI.

Prefer:

```text
tables

compact filters

structured forms

clear navigation
```

Do not turn the admin into a giant card-based landing page.

---

# 106. Mock Interaction Expectations

The mock frontend SHOULD support realistic local interactions such as:

```text
Change booking filters

Change property selector

Select stay dates

Change guest count

Select unit quantities

Create mock reservation

Move through reservation steps

Open booking detail

Allocate units

Simulate check-in

Simulate check-out

Open shift

Close shift

Change staff assignment

Activate/deactivate staff
```

Changes may exist only in local application state.

Persistence across browser reload is optional.

---

# 107. Local Persistence

If persistence improves the prototype, localStorage may be used.

Allowed for:

```text
selected mock role

temporary cart / reservation selection

mock state changes

staff shift simulation
```

Do not store sensitive fake credentials.

Keep localStorage access behind small utilities.

---

# 108. No Real Payment

The payment page may simulate:

```text
Payment Pending

Payment Success

Payment Failed

Partial Payment
```

Do NOT integrate:

```text
Midtrans

Stripe

Xendit

QRIS API
```

during frontend mockup development.

---

# 109. No Real Maps Required

Property location can currently use:

```text
map placeholder

static map visual

location panel
```

Do not integrate Google Maps or Mapbox unless explicitly requested later.

---

# 110. No Real Upload

Images may use local file preview for UI demonstration.

Do not upload images to:

```text
S3

Cloudinary

Supabase Storage

Firebase

backend server
```

during this phase.

---

# 111. No Backend Authentication

Sign-in screens can exist visually.

Mock login may simply select a predefined user.

Example:

```text
Customer Demo

Staff Demo

Owner Demo
```

Do not build password validation against a server.

---

# 112. Design Consistency

Before creating a new UI pattern, check whether an existing component can serve the same purpose.

Keep consistent:

```text
button hierarchy

form fields

table patterns

dialogs

badges

spacing

typography

empty states

error messages
```

---

# 113. Button Hierarchy

Recommended:

```text
Primary

Secondary

Ghost

Destructive
```

Avoid using primary buttons for every action.

Example Booking Detail:

```text
Check In
```

can be primary.

```text
Record Payment
Assign Unit
```

can be secondary.

```text
Cancel Booking
```

should be destructive but not visually dominate the screen.

---

# 114. Destructive Actions

Destructive styling should be reserved for actions such as:

```text
Cancel Booking

Deactivate Staff

Deactivate Property

Remove Image
```

Do not use red for ordinary secondary actions.

---

# 115. Mobile Bottom Actions

For critical customer flows, sticky bottom actions are acceptable.

Example:

```text
Rp2.400.000

Lanjutkan Reservasi
```

Ensure content remains visible and is not obscured by sticky UI.

---

# 116. Breadcrumbs

Admin and complex Staff detail screens may use breadcrumbs.

Example:

```text
Properties
/
Rimba Camp Bandung
/
Glamping Family
```

Customer-facing screens should avoid unnecessary enterprise-style breadcrumbs.

---

# 117. Design States to Include

At minimum demonstrate:

```text
Normal

Loading

Empty

Error

Disabled

Fully booked

Payment pending

Payment failed

Booking cancelled

Staff inactive

Physical unit maintenance

No active shift
```

---

# 118. Booking Availability Edge Cases

UI should be able to represent:

```text
0 available

1 available

multiple available

requested quantity exceeds availability
```

Example:

```text
Hanya 1 unit tersisa.
```

Disable quantity increments beyond mock availability.

---

# 119. Pricing Edge Cases

Support:

```text
all weekday

all weekend

mixed weekday/weekend

special holiday

mixed special and normal rates
```

Ensure price summaries remain understandable.

---

# 120. Payment Edge Cases

Support:

```text
Unpaid

Partially Paid

Paid

Refunded

Failed
```

The visual distinction between:

```text
Booking Status
```

and:

```text
Payment Status
```

must remain clear.

They are different concepts.

---

# 121. Development Discipline

Before implementing a screen:

1. Identify the role.
2. Identify the business task.
3. Identify the domain entities involved.
4. Identify existing reusable components.
5. Identify required states.
6. Implement responsive behavior.
7. Verify business rules.
8. Verify visual consistency.

Do not start by adding decorative UI.

---

# 122. When Modifying Existing Code

Prefer small, coherent changes.

Do not:

- rewrite unrelated modules
- replace libraries without reason
- rename the entire folder structure
- introduce new dependencies for trivial tasks
- change design tokens on one screen only
- duplicate existing components

---

# 123. Dependencies

Before adding a dependency:

- check whether an equivalent is already installed
- determine whether the dependency is actually necessary
- prefer established, lightweight libraries
- avoid adding large libraries for one small utility

---

# 124. Icons

Use one icon library consistently.

Do not mix several icon libraries unless required.

Icons should improve comprehension.

Avoid adding icons to every menu label, input label, and table cell.

---

# 125. Charts

Use charts only in Owner reporting where they add genuine value.

Suitable:

```text
Revenue over time

Occupancy trend
```

Avoid:

```text
decorative donut charts

random mini charts

charts for simple counts
```

Tables and numbers are often more useful.

---

# 126. Dashboard Rule

Every dashboard element must answer an operational question.

Example:

```text
How many guests arrive today?

How much revenue was received today?

Which guests still need to check out?

Which bookings still await payment?
```

Do not add widgets solely to occupy space.

---

# 127. No AI-ish UI

If a screen resembles a generic AI-generated dashboard, redesign it.

Common warning signs:

```text
12 giant rounded cards

gradient everywhere

generic "Welcome back" header

meaningless growth percentages

random charts

floating widgets

glowing icon blocks

huge hero text

excessive empty space

every block has a shadow
```

Instead create interfaces that clearly reflect:

```text
camping ground booking

front desk operations

property management

payment tracking

staff shifts
```

---

# 128. Page Completion Criteria

A page is not complete just because the default state looks good.

A completed page should consider:

```text
responsive layout

loading state

empty state

error state

interactive controls

realistic mock data

navigation

business rules

accessibility
```

---

# 129. Mockup Completion Priority

Develop in this order unless explicitly instructed otherwise.

## Phase 1 — Foundations

```text
Design tokens

UI primitives

Layouts

Navigation

Mock data

Types

Formatting utilities
```

## Phase 2 — Customer

```text
Home

Property Search

Property Detail

Availability

Reservation Review

Booking Confirmation

My Bookings

Booking Detail

Profile
```

## Phase 3 — Staff

```text
Today

Bookings

Booking Detail

Walk-In

Check-In

Check-Out

Unit Allocation

Shift
```

## Phase 4 — Owner

```text
Overview

Properties

Property Detail

Facilities

Unit Types

Units

Special Pricing

Bookings

Transactions

Staff

Staff Detail

Reports
```

## Phase 5 — States and Polish

```text
Loading

Empty

Errors

Responsive pass

Accessibility pass

Consistency pass
```

---

# 130. Definition of Done — Frontend Mockup

The frontend mockup phase is considered complete when:

- Customer can navigate the complete reservation flow using mock data.
- Customer can view booking history and booking details.
- Customer UI works properly on mobile.
- Staff can simulate walk-in booking.
- Staff can search mock bookings.
- Staff can simulate unit allocation.
- Staff can simulate check-in and check-out.
- Staff can simulate opening and closing a shift.
- Owner can navigate all property management screens.
- Owner can view transactions and bookings.
- Owner can manage mock staff.
- Owner can simulate staff reassignment.
- Owner can manage mock unit types and units.
- Owner can manage special pricing UI.
- Major states are designed.
- No backend API is required for the application to run.
- No database is required.
- No real payment integration exists.
- No real authentication integration exists.
- UI remains aligned with the business model.
- The application does not look like a generic AI-generated SaaS template.

---

# 131. Important Future Integration Boundary

When backend integration begins later, the intended transition should be approximately:

```text
Current:

Page
↓
Mock Service
↓
Mock Data
```

becomes:

```text
Future:

Page
↓
Frontend API Service
↓
Express REST API
↓
PostgreSQL
```

UI components should ideally remain mostly unchanged.

Therefore, keep mock-specific logic outside presentation components wherever practical.

---

# 132. Final Rule

During the current development phase, prioritize:

```text
Product correctness
+
UX
+
Visual quality
+
Reusable frontend architecture
```

over:

```text
Backend completeness
```

If a task requires choosing between implementing a fake backend and improving the frontend mockup:

```text
Choose the frontend mockup.
```

Do not integrate backend systems until explicitly instructed.