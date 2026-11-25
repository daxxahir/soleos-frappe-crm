import frappe
from frappe import _

@frappe.whitelist()
def get_filtered_leads_for_autodialer(campaign=None, status="Open", limit=50):
    """
    Stage G - Frappe CRM Autodialer Lead Fetch Endpoint
    Fetches leads with valid phone numbers ready for autodialing.
    """
    filters = {}
    if status and status != "All":
        filters["status"] = status

    leads = frappe.get_all(
        "CRM Lead",
        filters=filters,
        fields=["name", "lead_name", "phone", "mobile_no", "email", "status", "organization", "territory"],
        limit_page_length=limit or 50,
        order_by="creation desc"
    )

    valid_leads = []
    for lead in leads:
        number = lead.get("mobile_no") or lead.get("phone")
        if number:
            clean_number = "".join(filter(str.isdigit, str(number)))
            if len(clean_number) >= 10:
                valid_leads.append({
                    "id": lead["name"],
                    "name": lead.get("lead_name") or lead["name"],
                    "phone": clean_number,
                    "status": lead.get("status"),
                    "organization": lead.get("organization"),
                    "territory": lead.get("territory"),
                })

    return {
        "status": "success",
        "count": len(valid_leads),
        "leads": valid_leads
    }

@frappe.whitelist()
def get_inbound_agent(did=None, caller=None):
    """
    Stage G - Inbound Voice AI Agent Configuration Resolver
    """
    return {
        "status": "success",
        "agent_id": "soleos-ai-primary",
        "name": "Soleos Customer Care Assistant",
        "did": did or "default",
        "caller_id": caller,
        "voice": "alloy",
        "language": "en",
        "model": "gpt-4o-realtime-preview",
        "fallback_extension": "9101",
        "prompt": "You are the AI assistant for Soleos Energy. Greet customers warmly and answer inquiries about solar installations."
    }

@frappe.whitelist()
def screen_pop(phone=None):
    """
    Stage G - Softphone Screen Pop Handler
    Resolves caller phone to active Lead/Contact/Deal in Frappe CRM.
    """
    if not phone:
        return {"found": False}

    clean_phone = "".join(filter(str.isdigit, str(phone)))[-10:]

    lead = frappe.db.get_value(
        "CRM Lead",
        {"mobile_no": ["like", f"%{clean_phone}%"]},
        ["name", "lead_name", "status", "email", "organization"],
        as_dict=True
    )

    if lead:
        return {
            "found": True,
            "doctype": "CRM Lead",
            "docname": lead.name,
            "title": lead.lead_name,
            "status": lead.status,
            "organization": lead.organization,
            "crm_url": f"/crm/leads/{lead.name}"
        }

    return {"found": False, "phone": phone}
