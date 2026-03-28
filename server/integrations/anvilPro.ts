/**
 * Anvil Pro DMS Connector
 *
 * Parses messy dealer CSV exports (inconsistent headers, quoted fields,
 * mixed delimiters) and normalizes into inventory items.
 */

import type { AnvilProColumnMap, AnvilProParseResult, ParsedInventoryItem } from "./types";

// Common Anvil Pro header variations → our field names
const HEADER_ALIASES: Record<string, keyof AnvilProColumnMap> = {
  // Stock number
  "stock": "stockNumber",
  "stock #": "stockNumber",
  "stock#": "stockNumber",
  "stocknumber": "stockNumber",
  "stock number": "stockNumber",
  "stk": "stockNumber",
  "stk #": "stockNumber",
  "stk#": "stockNumber",
  "unit #": "stockNumber",
  "unit#": "stockNumber",
  "unitnumber": "stockNumber",

  // Serial number
  "serial": "serialNumber",
  "serial #": "serialNumber",
  "serial#": "serialNumber",
  "serialnumber": "serialNumber",
  "serial number": "serialNumber",
  "vin": "serialNumber",

  // Make
  "make": "make",
  "manufacturer": "make",
  "mfg": "make",
  "brand": "make",

  // Model
  "model": "model",
  "model #": "model",
  "model#": "model",

  // Year
  "year": "year",
  "yr": "year",
  "model year": "year",

  // Category
  "category": "category",
  "cat": "category",
  "type": "category",
  "equipment type": "category",
  "equip type": "category",

  // Condition
  "condition": "condition",
  "cond": "condition",
  "new/used": "condition",
  "new / used": "condition",
  "status": "condition",

  // Price
  "price": "price",
  "asking price": "price",
  "list price": "price",
  "asking": "price",
  "retail": "price",
  "msrp": "price",
  "sale price": "price",

  // Location
  "location": "location",
  "loc": "location",
  "store": "location",
  "branch": "location",
  "dealer": "location",
  "dealership": "location",

  // Hours
  "hours": "hours",
  "hrs": "hours",
  "meter": "hours",
  "meter hours": "hours",
  "hour meter": "hours",

  // Description
  "description": "description",
  "desc": "description",
  "notes": "description",
  "comments": "description",
  "details": "description",

  // URLs
  "listing url": "listingUrl",
  "url": "listingUrl",
  "link": "listingUrl",
  "listing": "listingUrl",
  "dealbuilder": "dealBuilderUrl",
  "deal builder": "dealBuilderUrl",
  "dealbuilder url": "dealBuilderUrl",
  "deal builder url": "dealBuilderUrl",
  "deal builder link": "dealBuilderUrl",

  // Photos
  "photos": "photos",
  "photo": "photos",
  "images": "photos",
  "image": "photos",
  "image url": "photos",
  "photo url": "photos",
  "image urls": "photos",
};

/**
 * Parse a raw CSV string from Anvil Pro DMS export.
 * Handles quoted fields, inconsistent headers, and messy data.
 */
export function parseAnvilProCsv(
  csvText: string,
  overrideMapping?: Partial<AnvilProColumnMap>,
): AnvilProParseResult {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return { items: [], errors: ["CSV must have at least a header row and one data row"], skipped: 0, total: 0 };
  }

  // Detect delimiter (comma, tab, pipe)
  const delimiter = detectDelimiter(lines[0]);

  // Parse header row
  const headers = splitCsvLine(lines[0], delimiter).map(h => h.trim().toLowerCase());
  const columnMap = overrideMapping ?? autoMapHeaders(headers);

  if (Object.keys(columnMap).length === 0) {
    return { items: [], errors: ["Could not map any CSV headers to inventory fields. Headers found: " + headers.join(", ")], skipped: 0, total: 0 };
  }

  const items: ParsedInventoryItem[] = [];
  const errors: string[] = [];
  let skipped = 0;

  for (let i = 1; i < lines.length; i++) {
    const values = splitCsvLine(lines[i], delimiter);
    try {
      const item = mapRowToItem(headers, values, columnMap);
      if (item.make || item.model || item.stockNumber) {
        items.push(item);
      } else {
        skipped++;
      }
    } catch (err) {
      errors.push(`Row ${i + 1}: ${err instanceof Error ? err.message : String(err)}`);
      skipped++;
    }
  }

  return { items, errors, skipped, total: lines.length - 1 };
}

/**
 * Detect CSV delimiter by checking which delimiter produces the most columns.
 */
function detectDelimiter(headerLine: string): string {
  const candidates = [",", "\t", "|", ";"];
  let best = ",";
  let bestCount = 0;

  for (const d of candidates) {
    const count = splitCsvLine(headerLine, d).length;
    if (count > bestCount) {
      bestCount = count;
      best = d;
    }
  }

  return best;
}

/**
 * Split a CSV line respecting quoted fields.
 */
function splitCsvLine(line: string, delimiter: string = ","): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++; // skip escaped quote
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === delimiter && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

/**
 * Auto-map CSV headers to inventory fields using known aliases.
 */
function autoMapHeaders(headers: string[]): AnvilProColumnMap {
  const map: AnvilProColumnMap = {};

  for (let i = 0; i < headers.length; i++) {
    const header = headers[i].replace(/[^a-z0-9 /#]/gi, "").trim().toLowerCase();
    const field = HEADER_ALIASES[header];
    if (field) {
      (map as any)[field] = headers[i]; // store original header for lookup
    }
  }

  return map;
}

/**
 * Map a single CSV row to a ParsedInventoryItem.
 */
function mapRowToItem(
  headers: string[],
  values: string[],
  columnMap: AnvilProColumnMap,
): ParsedInventoryItem {
  const getValue = (field: keyof AnvilProColumnMap): string | undefined => {
    const headerName = columnMap[field];
    if (!headerName) return undefined;
    const idx = headers.indexOf(headerName.toLowerCase());
    if (idx === -1) return undefined;
    const val = values[idx]?.trim();
    return val && val.length > 0 ? val : undefined;
  };

  const yearStr = getValue("year");
  const priceStr = getValue("price");
  const hoursStr = getValue("hours");
  const conditionStr = getValue("condition");
  const photosStr = getValue("photos");

  return {
    stockNumber: getValue("stockNumber"),
    serialNumber: getValue("serialNumber"),
    make: getValue("make"),
    model: getValue("model"),
    year: yearStr ? parseInt(yearStr, 10) || undefined : undefined,
    category: getValue("category"),
    condition: normalizeCondition(conditionStr),
    price: priceStr ? parsePrice(priceStr) : undefined,
    location: getValue("location"),
    hours: hoursStr ? parseInt(hoursStr.replace(/,/g, ""), 10) || undefined : undefined,
    description: getValue("description"),
    listingUrl: getValue("listingUrl"),
    dealBuilderUrl: getValue("dealBuilderUrl"),
    photos: photosStr ? photosStr.split(/[;|,]/).map(u => u.trim()).filter(u => u.length > 0) : undefined,
  };
}

/**
 * Parse price strings like "$45,000.00", "45000", "$45K", etc.
 */
function parsePrice(raw: string): number | undefined {
  let cleaned = raw.replace(/[$,\s]/g, "");

  // Handle "45K" or "45k"
  if (/^\d+(\.\d+)?[kK]$/.test(cleaned)) {
    return parseFloat(cleaned.replace(/[kK]/, "")) * 1000;
  }

  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? undefined : parsed;
}

/**
 * Normalize condition strings to "new" or "used".
 */
function normalizeCondition(raw: string | undefined): "new" | "used" {
  if (!raw) return "used";
  const lower = raw.toLowerCase().trim();
  if (lower === "new" || lower === "n") return "new";
  return "used";
}
