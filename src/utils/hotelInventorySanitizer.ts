/**
 * Utility to align hotel_inventory payloads with the Supabase PostgreSQL schema.
 * Database columns for public.hotel_inventory:
 *  - id (UUID)
 *  - hotel_id (UUID)
 *  - room_type (TEXT)
 *  - allocation_count (INTEGER)
 *  - price (NUMERIC)
 *  - created_at (TIMESTAMPTZ)
 *
 * Any unknown properties (such as rooms_count, allocation_status, room_id, date,
 * total_inventory, booked_count, blocked_count, etc.) trigger PostgREST 400 validation
 * errors (PGRST204) and must be stripped or mapped to schema columns.
 */

export interface SanitizedHotelInventory {
  id?: string;
  hotel_id?: string;
  room_type?: string;
  allocation_count?: number;
  price?: number;
  created_at?: string;
}

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function sanitizeHotelInventoryPayload(item: any): SanitizedHotelInventory {
  if (!item || typeof item !== 'object') {
    return {};
  }

  const sanitized: SanitizedHotelInventory = {};

  // 1. id: Only include if it is a valid UUID format.
  // Non-UUID strings (e.g. "inv-1234") cause PostgREST 400 "invalid input syntax for type uuid".
  const idStr = item.id !== undefined && item.id !== null ? String(item.id).trim() : '';
  if (UUID_REGEX.test(idStr)) {
    sanitized.id = idStr;
  }

  // 2. hotel_id
  const rawHotelId = item.hotel_id ?? item.hotelId;
  if (rawHotelId !== undefined && rawHotelId !== null) {
    sanitized.hotel_id = String(rawHotelId).trim();
  }

  // 3. room_type (maps roomType, room_type, room_name, name)
  const rawRoomType = item.room_type ?? item.roomType ?? item.room_name ?? item.roomName ?? item.name;
  if (rawRoomType !== undefined && rawRoomType !== null) {
    sanitized.room_type = String(rawRoomType).trim() || 'Standard Devotee Room';
  }

  // 4. allocation_count (maps allocation_count, allocationCount, rooms_count, roomsCount, total_inventory, totalInventory, available_count, availableCount)
  const rawAllocation =
    item.allocation_count ??
    item.allocationCount ??
    item.rooms_count ??
    item.roomsCount ??
    item.total_inventory ??
    item.totalInventory ??
    item.available_count ??
    item.availableCount;

  if (rawAllocation !== undefined && rawAllocation !== null && !isNaN(Number(rawAllocation))) {
    sanitized.allocation_count = Math.max(0, Math.floor(Number(rawAllocation)));
  }

  // 5. price (maps price, price_override, priceOverride, base_rate, baseRate, basePrice, roomOnlyPrice)
  const rawPrice =
    item.price ??
    item.price_override ??
    item.priceOverride ??
    item.base_rate ??
    item.baseRate ??
    item.basePrice ??
    item.roomOnlyPrice;

  if (rawPrice !== undefined && rawPrice !== null && !isNaN(Number(rawPrice))) {
    sanitized.price = Number(rawPrice);
  }

  // 6. created_at (optional)
  if (item.created_at) {
    sanitized.created_at = String(item.created_at);
  }

  return sanitized;
}

/**
 * Sanitizes a single object or an array of objects for hotel_inventory upsert/insert.
 */
export function sanitizeHotelInventoryList(payload: any): SanitizedHotelInventory | SanitizedHotelInventory[] {
  if (Array.isArray(payload)) {
    return payload.map(sanitizeHotelInventoryPayload);
  }
  return sanitizeHotelInventoryPayload(payload);
}
