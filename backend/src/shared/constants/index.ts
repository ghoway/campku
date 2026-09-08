export const ROLES = {
  OWNER: "OWNER",
  STAFF: "STAFF",
  CUSTOMER: "CUSTOMER",
} as const;

export type RoleCode = keyof typeof ROLES;

export const BOOKING_STATUS = {
  PENDING: "PENDING",
  AWAITING_PAYMENT: "AWAITING_PAYMENT",
  CONFIRMED: "CONFIRMED",
  CHECKED_IN: "CHECKED_IN",
  CHECKED_OUT: "CHECKED_OUT",
  CANCELLED: "CANCELLED",
  EXPIRED: "EXPIRED",
  NO_SHOW: "NO_SHOW",
} as const;

export type BookingStatus = keyof typeof BOOKING_STATUS;

// Status yang memblokir inventory
export const BLOCKING_BOOKING_STATUSES = [
  "PENDING",
  "AWAITING_PAYMENT",
  "CONFIRMED",
  "CHECKED_IN",
] as const;

export const NON_BLOCKING_BOOKING_STATUSES = [
  "CANCELLED",
  "EXPIRED",
  "CHECKED_OUT",
  "NO_SHOW",
] as const;

export const PAYMENT_METHODS = {
  CASH: "CASH",
  BANK_TRANSFER: "BANK_TRANSFER",
  QRIS: "QRIS",
  PAYMENT_GATEWAY: "PAYMENT_GATEWAY",
  OTHER: "OTHER",
} as const;

export type PaymentMethod = keyof typeof PAYMENT_METHODS;

export const PAYMENT_STATUS = {
  PENDING: "PENDING",
  PAID: "PAID",
  FAILED: "FAILED",
  CANCELLED: "CANCELLED",
  REFUNDED: "REFUNDED",
} as const;

export type PaymentStatus = keyof typeof PAYMENT_STATUS;

export const UNIT_STATUS = {
  AVAILABLE: "AVAILABLE",
  MAINTENANCE: "MAINTENANCE",
  INACTIVE: "INACTIVE",
} as const;

export const BOOKING_SOURCES = {
  SELF_RESERVATION: "SELF_RESERVATION",
  WALK_IN: "WALK_IN",
  ADMIN: "ADMIN",
} as const;

export const WAITLIST_STATUS = {
  WAITING: "WAITING",
  NOTIFIED: "NOTIFIED",
  BOOKED: "BOOKED",
  EXPIRED: "EXPIRED",
  CANCELLED: "CANCELLED",
} as const;

export const REVIEW_STATUS = {
  APPROVED: "APPROVED",
  HIDDEN: "HIDDEN",
  PENDING: "PENDING",
} as const;

export const DISCOUNT_TYPE = {
  PERCENTAGE: "PERCENTAGE",
  FIXED: "FIXED",
} as const;

export const SHIFT_STATUS = {
  OPEN: "OPEN",
  CLOSED: "CLOSED",
} as const;

export const WEEKEND_DAYS = [5, 6, 0]; // Fri, Sat, Sun
