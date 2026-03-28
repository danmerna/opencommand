"""
Data collectors for the Morning Briefing Agent.

Each collector returns a standardized dict:
{
    "source": str,          # e.g. "leads", "dealbuilder", "inventory"
    "status": str,          # "live" or "stubbed"
    "data": dict,           # source-specific payload
    "collected_at": str     # ISO 8601 timestamp
}

Day 1 live sources: leads, dealbuilder (both read from the Scribe log file).
Stubbed sources: inventory, crm, website, marketplace.
"""

import json
import os
from datetime import datetime, timedelta, timezone
from pathlib import Path


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _read_scribe_entries(scribe_log_file: str, hours: int = 24) -> list[dict]:
    """Read entries from the Scribe log file within the last *hours* hours."""
    path = Path(scribe_log_file)
    if not path.exists():
        return []

    cutoff = datetime.now(timezone.utc) - timedelta(hours=hours)
    entries: list[dict] = []

    with open(path, "r", encoding="utf-8") as fh:
        for line in fh:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
            except json.JSONDecodeError:
                continue

            # Accept entries with a parseable timestamp after the cutoff
            ts_raw = entry.get("timestamp") or entry.get("collected_at") or entry.get("created_at")
            if ts_raw:
                try:
                    ts = datetime.fromisoformat(ts_raw.replace("Z", "+00:00"))
                    if ts >= cutoff:
                        entries.append(entry)
                except (ValueError, TypeError):
                    # If we cannot parse the timestamp, include it anyway so
                    # the agent is conservative (better to over-report).
                    entries.append(entry)
            else:
                entries.append(entry)

    return entries


# ---------------------------------------------------------------------------
# Live collectors (day 1)
# ---------------------------------------------------------------------------

def collect_leads(scribe_log_file: str) -> dict:
    """Collect lead activity from the Scribe log for the last 24 hours.

    Reads ``verified_scribe.jsonl`` and filters for entries whose ``type``
    field is ``"lead"`` or ``"lead_response"``.  Computes:
    - total new leads
    - responded / unresponded counts
    - average response time (minutes)
    - list of unresponded leads with elapsed time
    """
    entries = _read_scribe_entries(scribe_log_file)

    leads: list[dict] = []
    responses: dict[str, dict] = {}  # lead_id -> response entry

    for entry in entries:
        entry_type = entry.get("type", "")
        if entry_type == "lead":
            leads.append(entry)
        elif entry_type == "lead_response":
            lid = entry.get("lead_id") or entry.get("reference_id")
            if lid:
                responses[lid] = entry

    now = datetime.now(timezone.utc)
    unresponded: list[dict] = []
    response_times: list[float] = []

    for lead in leads:
        lid = lead.get("lead_id") or lead.get("id")
        if lid and lid in responses:
            # Calculate response time
            lead_ts = lead.get("timestamp") or lead.get("created_at")
            resp_ts = responses[lid].get("timestamp") or responses[lid].get("created_at")
            if lead_ts and resp_ts:
                try:
                    t_lead = datetime.fromisoformat(lead_ts.replace("Z", "+00:00"))
                    t_resp = datetime.fromisoformat(resp_ts.replace("Z", "+00:00"))
                    delta_min = (t_resp - t_lead).total_seconds() / 60.0
                    response_times.append(delta_min)
                except (ValueError, TypeError):
                    pass
        else:
            # Unresponded
            lead_ts = lead.get("timestamp") or lead.get("created_at")
            elapsed_hrs = None
            if lead_ts:
                try:
                    t_lead = datetime.fromisoformat(lead_ts.replace("Z", "+00:00"))
                    elapsed_hrs = round((now - t_lead).total_seconds() / 3600.0, 1)
                except (ValueError, TypeError):
                    pass
            unresponded.append({
                "lead_id": lid,
                "name": lead.get("name", "Unknown"),
                "source": lead.get("source", "unknown"),
                "equipment_interest": lead.get("equipment_interest"),
                "elapsed_hours": elapsed_hrs,
            })

    avg_response_min = round(sum(response_times) / len(response_times), 1) if response_times else None

    return {
        "source": "leads",
        "status": "live",
        "data": {
            "total_new_leads": len(leads),
            "responded": len(responses),
            "unresponded": len(unresponded),
            "unresponded_leads": unresponded,
            "avg_response_time_min": avg_response_min,
            "response_times": response_times,
        },
        "collected_at": _now_iso(),
    }


def collect_dealbuilder(scribe_log_file: str) -> dict:
    """Collect DealBuilder engagement from the Scribe log for the last 24 hours.

    Filters for entries whose ``type`` is ``"dealbuilder"`` or starts with
    ``"dealbuilder_"``.  Aggregates:
    - total page opens
    - unique visitors (by visitor_id or phone)
    - time on page (seconds) when available
    - financing clicks
    - repeat visitors (3+ opens)
    """
    entries = _read_scribe_entries(scribe_log_file)

    db_events: list[dict] = []
    for entry in entries:
        entry_type = entry.get("type", "")
        if entry_type == "dealbuilder" or entry_type.startswith("dealbuilder_"):
            db_events.append(entry)

    # Aggregate by visitor
    visitor_opens: dict[str, int] = {}
    visitor_details: dict[str, dict] = {}
    total_time_on_page: list[float] = []
    financing_clicks = 0

    for evt in db_events:
        vid = evt.get("visitor_id") or evt.get("phone") or evt.get("session_id") or "anonymous"
        visitor_opens[vid] = visitor_opens.get(vid, 0) + 1

        if vid not in visitor_details:
            visitor_details[vid] = {
                "visitor_id": vid,
                "name": evt.get("name"),
                "equipment_interest": evt.get("equipment_interest") or evt.get("unit"),
            }

        top = evt.get("time_on_page_seconds") or evt.get("duration_seconds")
        if top is not None:
            try:
                total_time_on_page.append(float(top))
            except (ValueError, TypeError):
                pass

        action = evt.get("action") or evt.get("event")
        if action in ("financing_click", "financing", "apply_financing"):
            financing_clicks += 1

    repeat_visitors = [
        {**visitor_details.get(vid, {}), "opens": count}
        for vid, count in visitor_opens.items()
        if count >= 3
    ]

    return {
        "source": "dealbuilder",
        "status": "live",
        "data": {
            "total_opens": len(db_events),
            "unique_visitors": len(visitor_opens),
            "repeat_visitors": repeat_visitors,
            "avg_time_on_page_seconds": (
                round(sum(total_time_on_page) / len(total_time_on_page), 1)
                if total_time_on_page
                else None
            ),
            "financing_clicks": financing_clicks,
        },
        "collected_at": _now_iso(),
    }


# ---------------------------------------------------------------------------
# Stubbed collectors (interfaces defined, return sample data)
# ---------------------------------------------------------------------------

def collect_inventory() -> dict:
    """Collect current inventory snapshot.

    **Stubbed for day 1.**  When connected to a live DMS or inventory feed,
    this function will query the dealer's equipment database and return units
    with age, hours, pricing, and aging flags.

    The real integration will:
    - Call the DMS REST API (e.g., CDK, Charter, DIS)
    - Map each unit to the standardized schema
    - Compute ``days_on_lot`` and ``aging_flag`` based on AGING_THRESHOLD_DAYS
    """
    sample_path = Path(__file__).parent / "sample_data" / "inventory.json"
    if sample_path.exists():
        with open(sample_path, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
    else:
        raw = {"units": []}

    aging_threshold = int(os.getenv("AGING_THRESHOLD_DAYS", "45"))
    units = raw.get("units", [])
    for unit in units:
        unit["aging_flag"] = unit.get("days_on_lot", 0) > aging_threshold

    return {
        "source": "inventory",
        "status": "stubbed",
        "data": {
            "total_units": len(units),
            "units": units,
            "aging_threshold_days": aging_threshold,
            "units_over_threshold": [u for u in units if u.get("aging_flag")],
        },
        "collected_at": _now_iso(),
    }


def collect_crm() -> dict:
    """Collect CRM pipeline snapshot.

    **Stubbed for day 1.**  When connected to a live CRM (HubSpot,
    Salesforce, DealerSocket, etc.), this function will pull pipeline deals,
    identify stalled opportunities, and flag upcoming closes.

    The real integration will:
    - Authenticate via OAuth / API key
    - Query deals updated in the last 24 hrs + all open deals
    - Compute ``stalled`` flag (no activity > N days per stage)
    """
    sample_path = Path(__file__).parent / "sample_data" / "crm.json"
    if sample_path.exists():
        with open(sample_path, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
    else:
        raw = {"pipeline": [], "summary": {}}

    pipeline = raw.get("pipeline", [])
    summary = raw.get("summary", {})

    return {
        "source": "crm",
        "status": "stubbed",
        "data": {
            "pipeline": pipeline,
            "stalled_deals": [d for d in pipeline if d.get("stalled")],
            "closing_this_week": [d for d in pipeline if d.get("stage") == "Closing"],
            "summary": summary,
        },
        "collected_at": _now_iso(),
    }


def collect_website() -> dict:
    """Collect website analytics for the last 24 hours.

    **Stubbed for day 1.**  When connected to Google Analytics (GA4) or a
    similar analytics platform, this function will pull visitor counts, top
    pages, search terms, and referral sources.

    The real integration will:
    - Use the GA4 Data API (``google-analytics-data`` client)
    - Query ``runReport`` for the date range
    - Map dimensions/metrics to the standardized schema
    """
    sample_path = Path(__file__).parent / "sample_data" / "website.json"
    if sample_path.exists():
        with open(sample_path, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
    else:
        raw = {"visitors": {}, "top_pages": [], "search_terms": []}

    return {
        "source": "website",
        "status": "stubbed",
        "data": {
            "visitors": raw.get("visitors", {}),
            "top_pages": raw.get("top_pages", []),
            "search_terms": raw.get("search_terms", []),
            "referral_sources": raw.get("referral_sources", []),
        },
        "collected_at": _now_iso(),
    }


def collect_marketplace() -> dict:
    """Collect marketplace listing performance.

    **Stubbed for day 1.**  When connected to TractorHouse / MachineryTrader
    APIs (or a scraping layer), this function will pull listing views,
    inquiry counts, and competitor price comparisons.

    The real integration will:
    - Authenticate to the marketplace dealer portal API
    - Pull per-listing metrics for the last 24 hours
    - Cross-reference competitor prices from aggregated data
    """
    sample_path = Path(__file__).parent / "sample_data" / "marketplace.json"
    if sample_path.exists():
        with open(sample_path, "r", encoding="utf-8") as fh:
            raw = json.load(fh)
    else:
        raw = {"listings": [], "market_summary": {}}

    return {
        "source": "marketplace",
        "status": "stubbed",
        "data": {
            "listings": raw.get("listings", []),
            "market_summary": raw.get("market_summary", {}),
        },
        "collected_at": _now_iso(),
    }


# ---------------------------------------------------------------------------
# Convenience: collect all sources
# ---------------------------------------------------------------------------

def collect_all(scribe_log_file: str) -> dict[str, dict]:
    """Run every collector and return results keyed by source name."""
    return {
        "leads": collect_leads(scribe_log_file),
        "dealbuilder": collect_dealbuilder(scribe_log_file),
        "inventory": collect_inventory(),
        "crm": collect_crm(),
        "website": collect_website(),
        "marketplace": collect_marketplace(),
    }
