"""
Insight generator for the Morning Briefing Agent.

Takes collected data dicts from all sources and produces a prioritised
insight structure:

{
    "urgent":        [{"text": ..., "source": ..., "action": ..., "details": {...}}],
    "important":     [{"text": ..., "source": ..., "action": ..., "details": {...}}],
    "informational": [{"text": ..., "source": ..., "action": ..., "details": {...}}],
    "strategy":      [{"text": ..., "action_id": ..., "reply_code": "1"}]
}

Severity rules
--------------
Urgent:
- Lead with no response > 4 hrs
- Inventory discrepancy (when live)
- DealBuilder opened 3+ times with no follow-up

Important:
- New leads overnight
- Equipment crossed aging threshold (when inventory live)
- DealBuilder engagement spike

Informational:
- Lead response time stats
- Website traffic summary
- Listing view summary

Cross-source insights activate as sources connect:
- Lead for an aged unit
- DealBuilder opened + multiple listing views (serious buyer)
- Multiple leads in same category (demand spike)
"""

from __future__ import annotations

import uuid
from typing import Any


def _insight(text: str, source: str, action: str | None = None, **details: Any) -> dict:
    return {
        "text": text,
        "source": source,
        "action": action,
        "details": dict(details),
    }


def _strategy(text: str, action_id: str | None = None) -> dict:
    return {
        "text": text,
        "action_id": action_id or str(uuid.uuid4())[:8],
        "reply_code": "1",
    }


# ---------------------------------------------------------------------------
# Main entry point
# ---------------------------------------------------------------------------

def generate_insights(collected: dict[str, dict]) -> dict:
    """Generate prioritised insights from collected data.

    Parameters
    ----------
    collected : dict
        Keyed by source name (``leads``, ``dealbuilder``, ``inventory``,
        ``crm``, ``website``, ``marketplace``).  Each value is the
        standardised collector output dict.

    Returns
    -------
    dict with keys ``urgent``, ``important``, ``informational``, ``strategy``.
    """
    urgent: list[dict] = []
    important: list[dict] = []
    informational: list[dict] = []
    strategies: list[dict] = []

    leads_data = (collected.get("leads") or {}).get("data", {})
    db_data = (collected.get("dealbuilder") or {}).get("data", {})
    inv_data = (collected.get("inventory") or {}).get("data", {})
    crm_data = (collected.get("crm") or {}).get("data", {})
    web_data = (collected.get("website") or {}).get("data", {})
    mkt_data = (collected.get("marketplace") or {}).get("data", {})

    inv_live = (collected.get("inventory") or {}).get("status") == "live"
    crm_live = (collected.get("crm") or {}).get("status") == "live"

    # ------------------------------------------------------------------
    # LEADS
    # ------------------------------------------------------------------
    unresponded = leads_data.get("unresponded_leads", [])
    overdue = [l for l in unresponded if (l.get("elapsed_hours") or 0) > 4]

    for lead in overdue:
        hrs = lead.get("elapsed_hours", "?")
        name = lead.get("name", "A lead")
        equip = lead.get("equipment_interest") or "equipment"
        urgent.append(_insight(
            f"{name} asked about {equip} {hrs}hrs ago with no response.",
            source="leads",
            action="flag_salesperson",
            lead_id=lead.get("lead_id"),
            elapsed_hours=hrs,
        ))

    # Non-overdue unresponded leads are still important
    fresh_unresponded = [l for l in unresponded if (l.get("elapsed_hours") or 0) <= 4]
    if fresh_unresponded:
        count = len(fresh_unresponded)
        important.append(_insight(
            f"{count} new lead{'s' if count != 1 else ''} overnight awaiting response.",
            source="leads",
            action=None,
            leads=fresh_unresponded,
        ))

    total_new = leads_data.get("total_new_leads", 0)
    if total_new > 0:
        avg_rt = leads_data.get("avg_response_time_min")
        responded = leads_data.get("responded", 0)
        if avg_rt is not None:
            informational.append(_insight(
                f"{total_new} lead{'s' if total_new != 1 else ''} in the last 24hrs. "
                f"{responded} responded (avg {avg_rt} min).",
                source="leads",
            ))
        else:
            informational.append(_insight(
                f"{total_new} lead{'s' if total_new != 1 else ''} in the last 24hrs. "
                f"{responded} responded.",
                source="leads",
            ))

    # ------------------------------------------------------------------
    # DEALBUILDER
    # ------------------------------------------------------------------
    repeat_visitors = db_data.get("repeat_visitors", [])
    for rv in repeat_visitors:
        name = rv.get("name") or rv.get("visitor_id", "A visitor")
        opens = rv.get("opens", 3)
        equip = rv.get("equipment_interest") or "a unit"
        urgent.append(_insight(
            f"{name} opened DealBuilder {opens}x on {equip} with no follow-up.",
            source="dealbuilder",
            action="flag_salesperson",
            visitor_id=rv.get("visitor_id"),
            opens=opens,
        ))

    total_opens = db_data.get("total_opens", 0)
    unique_visitors = db_data.get("unique_visitors", 0)
    financing = db_data.get("financing_clicks", 0)

    if total_opens > 0 and not repeat_visitors:
        important.append(_insight(
            f"DealBuilder had {total_opens} open{'s' if total_opens != 1 else ''} "
            f"from {unique_visitors} visitor{'s' if unique_visitors != 1 else ''} overnight.",
            source="dealbuilder",
        ))

    if financing > 0:
        important.append(_insight(
            f"{financing} financing click{'s' if financing != 1 else ''} in DealBuilder overnight.",
            source="dealbuilder",
            action=None,
            financing_clicks=financing,
        ))

    # ------------------------------------------------------------------
    # INVENTORY (activates when live)
    # ------------------------------------------------------------------
    aged_units = inv_data.get("units_over_threshold", [])
    if aged_units and inv_live:
        for unit in aged_units:
            days = unit.get("days_on_lot", "?")
            desc = f"{unit.get('year', '')} {unit.get('make', '')} {unit.get('model', '')}".strip()
            important.append(_insight(
                f"{desc} ({unit.get('stock_id', '?')}) has been on the lot {days} days.",
                source="inventory",
                action=None,
                stock_id=unit.get("stock_id"),
                days_on_lot=days,
            ))

    # ------------------------------------------------------------------
    # CRM (activates when live)
    # ------------------------------------------------------------------
    if crm_live:
        stalled = crm_data.get("stalled_deals", [])
        for deal in stalled:
            contact = deal.get("contact", "A deal")
            equip = deal.get("equipment", "equipment")
            days_stalled = deal.get("days_in_stage", "?")
            important.append(_insight(
                f"Deal with {contact} for {equip} stalled {days_stalled} days in {deal.get('stage', 'pipeline')}.",
                source="crm",
                action=None,
                deal_id=deal.get("deal_id"),
            ))

        closing = crm_data.get("closing_this_week", [])
        for deal in closing:
            contact = deal.get("contact", "A deal")
            value = deal.get("value", 0)
            informational.append(_insight(
                f"{contact} closing this week (${value:,.0f}).",
                source="crm",
            ))

    # ------------------------------------------------------------------
    # WEBSITE (informational when available)
    # ------------------------------------------------------------------
    visitors = web_data.get("visitors", {})
    total_visitors = visitors.get("total")
    if total_visitors is not None:
        informational.append(_insight(
            f"{total_visitors} website visitors in the last 24hrs "
            f"({visitors.get('unique', '?')} unique).",
            source="website",
        ))

    # ------------------------------------------------------------------
    # MARKETPLACE (informational when available)
    # ------------------------------------------------------------------
    mkt_summary = mkt_data.get("market_summary", {})
    mkt_views = mkt_summary.get("total_views_24h")
    mkt_inquiries = mkt_summary.get("total_inquiries_24h")
    if mkt_views is not None:
        informational.append(_insight(
            f"Marketplace listings received {mkt_views} views and {mkt_inquiries or 0} inquiries.",
            source="marketplace",
        ))

    # ------------------------------------------------------------------
    # CROSS-SOURCE INSIGHTS
    # ------------------------------------------------------------------
    _cross_source_lead_aged_unit(urgent, important, unresponded, inv_data, inv_live)
    _cross_source_serious_buyer(urgent, important, db_data, mkt_data)
    _cross_source_demand_spike(important, leads_data)

    # ------------------------------------------------------------------
    # STRATEGY
    # ------------------------------------------------------------------
    strategies = _derive_strategies(urgent, important, informational, leads_data, db_data)

    # Guarantee at least an informational summary
    if not urgent and not important and not informational:
        informational.append(_insight(
            "Quiet night. No new leads, DealBuilder activity, or notable changes.",
            source="summary",
        ))

    if not strategies:
        strategies.append(_strategy(
            "No high-priority actions this morning. Review your pipeline and check back after lunch."
        ))

    return {
        "urgent": urgent,
        "important": important,
        "informational": informational,
        "strategy": strategies,
    }


# ---------------------------------------------------------------------------
# Cross-source helpers
# ---------------------------------------------------------------------------

def _cross_source_lead_aged_unit(
    urgent: list, important: list,
    unresponded: list, inv_data: dict, inv_live: bool,
) -> None:
    """If a lead is asking about an aged unit, flag it."""
    if not inv_live:
        return
    aged_stocks = {
        u.get("stock_id") for u in inv_data.get("units_over_threshold", [])
    }
    if not aged_stocks:
        return

    for lead in unresponded:
        equip = (lead.get("equipment_interest") or "").upper()
        for sid in aged_stocks:
            if sid and sid.upper() in equip:
                important.append(_insight(
                    f"Lead from {lead.get('name', 'unknown')} is for {sid}, "
                    f"your longest-sitting unit. Respond quickly.",
                    source="leads+inventory",
                    action="prioritize_response",
                    lead_id=lead.get("lead_id"),
                    stock_id=sid,
                ))


def _cross_source_serious_buyer(
    urgent: list, important: list,
    db_data: dict, mkt_data: dict,
) -> None:
    """DealBuilder repeat visitor + multiple marketplace views = serious buyer."""
    repeat_visitors = db_data.get("repeat_visitors", [])
    listings = mkt_data.get("listings", [])

    if not repeat_visitors or not listings:
        return

    high_view_stocks = {
        l.get("stock_id") for l in listings
        if (l.get("views_24h") or 0) >= 15
    }

    for rv in repeat_visitors:
        equip = (rv.get("equipment_interest") or "").upper()
        for sid in high_view_stocks:
            if sid and sid.upper() in equip:
                important.append(_insight(
                    f"This buyer ({rv.get('name') or rv.get('visitor_id')}) is serious: "
                    f"DealBuilder {rv.get('opens', '3+')}x + high listing views on {sid}.",
                    source="dealbuilder+marketplace",
                    action="prioritize_outreach",
                    visitor_id=rv.get("visitor_id"),
                    stock_id=sid,
                ))


def _cross_source_demand_spike(important: list, leads_data: dict) -> None:
    """Multiple leads in the same equipment category = demand spiking."""
    unresponded = leads_data.get("unresponded_leads", [])
    all_leads_count = leads_data.get("total_new_leads", 0)

    # Group by equipment interest keyword
    categories: dict[str, int] = {}
    for lead in unresponded:
        equip = lead.get("equipment_interest")
        if equip:
            key = equip.strip().lower()
            categories[key] = categories.get(key, 0) + 1

    for cat, count in categories.items():
        if count >= 2:
            important.append(_insight(
                f"Demand spiking: {count} leads asking about {cat}.",
                source="leads",
                action=None,
                category=cat,
                lead_count=count,
            ))


def _derive_strategies(
    urgent: list, important: list, informational: list,
    leads_data: dict, db_data: dict,
) -> list[dict]:
    """Derive strategy suggestions from the highest-priority insights."""
    strategies: list[dict] = []

    # Strategy from urgent leads
    overdue_leads = [
        i for i in urgent
        if i.get("source") == "leads" and i.get("action") == "flag_salesperson"
    ]
    if overdue_leads:
        lead = overdue_leads[0]
        name = lead["details"].get("lead_id", "the overdue lead")
        strategies.append(_strategy(
            f"Call back {lead['text'].split(' asked')[0]} first thing. "
            f"They've been waiting {lead['details'].get('elapsed_hours', '4+')} hours.",
            action_id=f"callback-{name}",
        ))
        return strategies  # One primary strategy is enough

    # Strategy from DealBuilder repeat visitors
    db_urgent = [
        i for i in urgent
        if i.get("source") == "dealbuilder"
    ]
    if db_urgent:
        visitor = db_urgent[0]
        strategies.append(_strategy(
            f"Reach out to the DealBuilder repeat visitor. "
            f"{visitor['text']}",
            action_id=f"outreach-db-{visitor['details'].get('visitor_id', 'unknown')}",
        ))
        return strategies

    # Strategy from new leads
    new_leads_items = [
        i for i in important
        if i.get("source") == "leads"
    ]
    if new_leads_items:
        strategies.append(_strategy(
            "Respond to new overnight leads before 9 AM to keep response times under 1 hour.",
            action_id="respond-leads",
        ))
        return strategies

    # Strategy from DealBuilder engagement
    if db_data.get("financing_clicks", 0) > 0:
        strategies.append(_strategy(
            "Follow up with DealBuilder visitors who clicked financing. They are further down the funnel.",
            action_id="followup-financing",
        ))
        return strategies

    return strategies
