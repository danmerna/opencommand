// ─── Anvil Pro DMS Types ────────────────────────────────────────────────────

/** Column mapping from Anvil Pro CSV headers to our inventory fields */
export interface AnvilProColumnMap {
  stockNumber?: string;
  serialNumber?: string;
  make?: string;
  model?: string;
  year?: string;
  category?: string;
  condition?: string;
  price?: string;
  location?: string;
  hours?: string;
  description?: string;
  listingUrl?: string;
  dealBuilderUrl?: string;
  photos?: string;
}

export interface AnvilProParseResult {
  items: ParsedInventoryItem[];
  errors: string[];
  skipped: number;
  total: number;
}

export interface ParsedInventoryItem {
  stockNumber?: string;
  serialNumber?: string;
  make?: string;
  model?: string;
  year?: number;
  category?: string;
  condition?: "new" | "used";
  price?: number;
  location?: string;
  hours?: number;
  description?: string;
  listingUrl?: string;
  dealBuilderUrl?: string;
  photos?: string[];
}

// ─── TractorHouse Types ─────────────────────────────────────────────────────

export interface TractorHouseLeadEmail {
  contactName: string | null;
  contactEmail: string | null;
  contactPhone: string | null;
  contactLocation: string | null;
  equipmentInterest: string | null;
  rawBody: string;
}

export interface TractorHouseCompetitorListing {
  make: string | null;
  model: string | null;
  year: number | null;
  condition: "new" | "used";
  askingPrice: number | null;
  dealerName: string | null;
  dealerLocation: string | null;
  listingUrl: string | null;
  hours: number | null;
}
