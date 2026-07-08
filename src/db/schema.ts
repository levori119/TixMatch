/**
 * TixMatch database schema (Phase 0 — approved data model).
 * Money is stored as INTEGER in agorot (1 ILS = 100 agorot) to avoid float errors.
 * See CLAUDE.md §4 (matching/FCFS), §6 (stack), and the software-architect skill.
 */
import {
  pgTable,
  pgEnum,
  serial,
  bigserial,
  integer,
  text,
  boolean,
  timestamp,
  jsonb,
  doublePrecision,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";

// ---------- enums ----------
export const userRole = pgEnum("user_role", ["client", "admin"]);
export const verificationStatus = pgEnum("verification_status", [
  "pending",
  "verified",
  "rejected",
  "manual_review",
]);
export const deliveryType = pgEnum("delivery_type", ["physical", "digital"]);
export const priceType = pgEnum("price_type", ["at_cost", "above_cost", "discount"]);
export const listingStatus = pgEnum("listing_status", [
  "active",
  "reserved",
  "sold",
  "cancelled",
]);
export const ticketUnitState = pgEnum("ticket_unit_state", [
  "available",
  "held",
  "delivered",
]);
export const showStatus = pgEnum("show_status", ["on_sale", "sold_out", "past"]);
export const buyRequestStatus = pgEnum("buy_request_status", [
  "queued",
  "matched",
  "fulfilled",
  "expired",
  "cancelled",
]);
export const tradeState = pgEnum("trade_state", [
  "offer_accepted",
  "funds_held",
  "ticket_delivered",
  "buyer_confirmed",
  "released",
  "timed_out",
  "cancelled",
  "disputed",
  "refunded",
]);
export const ledgerAccount = pgEnum("ledger_account", [
  "buyer",
  "seller",
  "platform",
  "escrow",
]);
export const ledgerDirection = pgEnum("ledger_direction", ["debit", "credit"]);
export const disputeStatus = pgEnum("dispute_status", ["open", "resolved", "rejected"]);

// ---------- users & payment ----------
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  phone: text("phone"),
  friendmatchOptout: boolean("friendmatch_optout").notNull().default(false),
  trustScore: integer("trust_score").notNull().default(0),
  role: userRole("role").notNull().default("client"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const paymentMethods = pgTable("payment_methods", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull().references(() => users.id),
  gatewayToken: text("gateway_token").notNull(), // tokenized — never store PAN
  last4: text("last4"),
  brand: text("brand"),
  verificationStatus: verificationStatus("verification_status").notNull().default("pending"),
  verificationHoldId: text("verification_hold_id"), // the ₪1 hold reference
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- catalog: events / venues / shows ----------
export const events = pgTable("events", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  artist: text("artist"),
  category: text("category"),
});

export const venues = pgTable("venues", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  city: text("city"),
  address: text("address"),
  capacity: integer("capacity"),
});

export const shows = pgTable(
  "shows",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull().references(() => events.id),
    venueId: integer("venue_id").notNull().references(() => venues.id),
    startsAt: timestamp("starts_at", { withTimezone: true }).notNull(),
    status: showStatus("status").notNull().default("on_sale"),
  },
  (t) => ({
    byEvent: index("shows_event_idx").on(t.eventId),
  }),
);

// ---------- listings (seller offers) ----------
export const seatType = pgEnum("seat_type", ["seated", "standing"]);

export const listings = pgTable(
  "listings",
  {
    id: serial("id").primaryKey(),
    sellerId: integer("seller_id").notNull().references(() => users.id),
    showId: integer("show_id").notNull().references(() => shows.id),
    note: text("note"),
    deliveryType: deliveryType("delivery_type").notNull(),
    priceType: priceType("price_type").notNull(),
    quantityTotal: integer("quantity_total").notNull(),
    quantityAvailable: integer("quantity_available").notNull(),
    soldIndividually: boolean("sold_individually").notNull().default(true),
    minTicketsPerSale: integer("min_tickets_per_sale").notNull().default(1),
    // optional specific location
    seatKind: seatType("seat_kind"),
    seatSection: text("seat_section"),
    seatRow: text("seat_row"),
    seatNumber: text("seat_number"),
    status: listingStatus("status").notNull().default("active"),
    version: integer("version").notNull().default(0), // optimistic lock (FCFS safety)
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byShow: index("listings_show_idx").on(t.showId),
  }),
);

export const listingPriceTiers = pgTable("listing_price_tiers", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => listings.id),
  minQty: integer("min_qty").notNull(),
  unitPriceAgorot: integer("unit_price_agorot").notNull(),
});

// uploaded ticket file + its barcode lifecycle (upload -> on sale: rotate)
export const ticketFiles = pgTable(
  "ticket_files",
  {
    id: serial("id").primaryKey(),
    listingId: integer("listing_id").notNull().references(() => listings.id),
    fileName: text("file_name"),
    mime: text("mime"),
    dataBase64: text("data_base64"), // small ticket PDFs/images, base64
    barcode: text("barcode"), // current valid barcode
    previousBarcode: text("previous_barcode"), // invalidated on transfer
    rotatedAt: timestamp("rotated_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byListing: index("ticket_files_listing_idx").on(t.listingId),
    byBarcode: index("ticket_files_barcode_idx").on(t.barcode),
  }),
);

export const ticketUnits = pgTable("ticket_units", {
  id: serial("id").primaryKey(),
  listingId: integer("listing_id").notNull().references(() => listings.id),
  verificationStatus: verificationStatus("verification_status").notNull().default("pending"),
  assetRef: text("asset_ref"), // pointer to encrypted/off-DB ticket asset
  state: ticketUnitState("state").notNull().default("available"),
});

// ---------- buy requests (the FCFS queue) ----------
export const buyRequests = pgTable(
  "buy_requests",
  {
    id: serial("id").primaryKey(),
    buyerId: integer("buyer_id").notNull().references(() => users.id),
    showId: integer("show_id").notNull().references(() => shows.id),
    priceMinAgorot: integer("price_min_agorot").notNull(),
    priceMaxAgorot: integer("price_max_agorot").notNull(),
    qtyMin: integer("qty_min").notNull().default(1),
    qtyMax: integer("qty_max").notNull().default(1),
    seq: bigserial("seq", { mode: "number" }).notNull(), // server-assigned arrival order (FCFS)
    status: buyRequestStatus("status").notNull().default("queued"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    fcfs: index("buy_requests_show_seq_idx").on(t.showId, t.seq),
  }),
);

// ---------- matches & escrow ----------
export const matches = pgTable("matches", {
  id: serial("id").primaryKey(),
  buyRequestId: integer("buy_request_id").notNull().references(() => buyRequests.id),
  listingId: integer("listing_id").notNull().references(() => listings.id),
  qty: integer("qty").notNull(),
  agreedUnitPriceAgorot: integer("agreed_unit_price_agorot").notNull(),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const trades = pgTable("trades", {
  id: serial("id").primaryKey(),
  matchId: integer("match_id").notNull().references(() => matches.id),
  buyerId: integer("buyer_id").notNull().references(() => users.id),
  sellerId: integer("seller_id").notNull().references(() => users.id),
  amountAgorot: integer("amount_agorot").notNull(),
  commissionAgorot: integer("commission_agorot").notNull().default(0),
  state: tradeState("state").notNull().default("offer_accepted"),
  stateChangedAt: timestamp("state_changed_at", { withTimezone: true }).notNull().defaultNow(),
  timeoutAt: timestamp("timeout_at", { withTimezone: true }),
});

// double-entry ledger — every trade's entries must sum to zero
export const ledgerEntries = pgTable("ledger_entries", {
  id: bigserial("id", { mode: "number" }).primaryKey(),
  tradeId: integer("trade_id").references(() => trades.id),
  account: ledgerAccount("account").notNull(),
  direction: ledgerDirection("direction").notNull(),
  amountAgorot: integer("amount_agorot").notNull(),
  memo: text("memo"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const disputes = pgTable("disputes", {
  id: serial("id").primaryKey(),
  tradeId: integer("trade_id").notNull().references(() => trades.id),
  openedBy: integer("opened_by").notNull().references(() => users.id),
  reason: text("reason").notNull(),
  status: disputeStatus("status").notNull().default("open"),
  resolution: text("resolution"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ---------- platform settings (admin-editable; e.g. commission) ----------
// Single-row config table (id is always 1). Edited from the Admin dashboard.
export const platformSettings = pgTable("platform_settings", {
  id: integer("id").primaryKey().default(1),
  commissionBps: integer("commission_bps").notNull().default(250), // 250 = 2.50%
  commissionFixedAgorot: integer("commission_fixed_agorot").notNull().default(0),
  verificationHoldAgorot: integer("verification_hold_agorot").notNull().default(100), // ₪1
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  updatedBy: integer("updated_by").references(() => users.id),
});

// ---------- audit log (every admin action) ----------
export const auditLog = pgTable(
  "audit_log",
  {
    id: bigserial("id", { mode: "number" }).primaryKey(),
    actorId: integer("actor_id").references(() => users.id),
    action: text("action").notNull(),
    entity: text("entity"),
    entityId: text("entity_id"),
    payload: jsonb("payload"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    byActor: index("audit_actor_idx").on(t.actorId),
  }),
);

// ---------- music genres, event tagging, and per-user taste ----------
export const genres = pgTable("genres", {
  id: serial("id").primaryKey(),
  slug: text("slug").notNull().unique(),
  nameHe: text("name_he").notNull(),
  emoji: text("emoji"),
});

export const eventGenres = pgTable(
  "event_genres",
  {
    id: serial("id").primaryKey(),
    eventId: integer("event_id").notNull().references(() => events.id),
    genreId: integer("genre_id").notNull().references(() => genres.id),
  },
  (t) => ({
    uniq: uniqueIndex("event_genre_uniq").on(t.eventId, t.genreId),
    byEvent: index("event_genres_event_idx").on(t.eventId),
  }),
);

export const userGenreAffinity = pgTable(
  "user_genre_affinity",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    genreId: integer("genre_id").notNull().references(() => genres.id),
    score: integer("score").notNull().default(0),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("user_genre_uniq").on(t.userId, t.genreId),
  }),
);

// ---------- FriendMatch: attendance + phone friendships ----------
export const attendances = pgTable(
  "attendances",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    showId: integer("show_id").notNull().references(() => shows.id),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("attendance_uniq").on(t.userId, t.showId),
    byShow: index("attendance_show_idx").on(t.showId),
  }),
);

export const friendships = pgTable(
  "friendships",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id), // requester
    friendId: integer("friend_id").notNull().references(() => users.id), // addressee
    status: text("status").notNull().default("pending"), // pending | accepted
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("friendship_uniq").on(t.userId, t.friendId),
  }),
);

// FriendMatch Phase 2: opt-in event-day location (proximity)
export const locations = pgTable(
  "locations",
  {
    id: serial("id").primaryKey(),
    userId: integer("user_id").notNull().references(() => users.id),
    showId: integer("show_id").notNull().references(() => shows.id),
    lat: doublePrecision("lat").notNull(),
    lng: doublePrecision("lng").notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    uniq: uniqueIndex("location_uniq").on(t.userId, t.showId),
    byShow: index("location_show_idx").on(t.showId, t.updatedAt),
  }),
);
