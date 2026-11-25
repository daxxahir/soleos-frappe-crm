import frappe
import json

@frappe.whitelist()
def get_stage_automations(stage=None):
    """Fetch automation details for a specific stage or all stages."""
    filters = {}
    if stage:
        filters["stage"] = stage
    
    records = frappe.get_all(
        "Soleos Stage Automation",
        filters=filters,
        fields=["name", "stage", "pipeline", "enabled", "description", "criteria", "actions"]
    )
    res = {}
    for r in records:
        try:
            r["actions"] = json.loads(r.get("actions") or "[]")
        except Exception:
            r["actions"] = []
        try:
            r["criteria"] = json.loads(r.get("criteria") or "[]")
        except Exception:
            r["criteria"] = []
        res[r["stage"]] = r
    
    if stage:
        return res.get(stage, {
            "stage": stage,
            "pipeline": "",
            "enabled": 1,
            "description": "",
            "criteria": [],
            "actions": []
        })
    return res


@frappe.whitelist()
def save_stage_automation(stage, pipeline=None, criteria=None, actions=None, description=None, enabled=1):
    """Create or update a stage automation rule."""
    if not stage:
        frappe.throw("Stage is required")
        
    if isinstance(actions, list):
        actions_str = json.dumps(actions)
    else:
        actions_str = str(actions or "[]")

    if isinstance(criteria, list):
        criteria_str = json.dumps(criteria)
    else:
        criteria_str = str(criteria or "[]")

    if frappe.db.exists("Soleos Stage Automation", stage):
        doc = frappe.get_doc("Soleos Stage Automation", stage)
        doc.pipeline = pipeline or doc.pipeline
        doc.criteria = criteria_str
        doc.actions = actions_str
        doc.description = description if description is not None else doc.description
        doc.enabled = int(enabled)
        doc.save(ignore_permissions=True)
    else:
        doc = frappe.get_doc({
            "doctype": "Soleos Stage Automation",
            "stage": stage,
            "pipeline": pipeline or "",
            "criteria": criteria_str,
            "actions": actions_str,
            "description": description or "",
            "enabled": int(enabled)
        })
        doc.insert(ignore_permissions=True)

    frappe.db.commit()
    return {"message": "Success", "stage": stage}


@frappe.whitelist()
def create_stage(stage_name, pipeline=None, position=None, color="blue"):
    """Create a new CRM Deal Status and attach it to views."""
    stage_name = (stage_name or "").strip()
    if not stage_name:
        frappe.throw("Stage Name is required")
        
    if not frappe.db.exists("CRM Deal Status", stage_name):
        max_pos = frappe.db.sql("SELECT MAX(position) FROM `tabCRM Deal Status`")[0][0] or 0
        doc = frappe.get_doc({
            "doctype": "CRM Deal Status",
            "deal_status": stage_name,
            "type": "Ongoing",
            "position": position or (max_pos + 1),
            "color": color,
            "probability": 50
        })
        doc.insert(ignore_permissions=True)
        frappe.db.commit()

    return {"message": "Created", "stage": stage_name}


@frappe.whitelist()
def delete_stage(stage_name):
    """Delete a CRM Deal Status or remove it if no active deals."""
    stage_name = (stage_name or "").strip()
    if not stage_name:
        return {"message": "No stage specified"}
        
    deal_count = frappe.db.count("CRM Deal", {"status": stage_name})
    if deal_count > 0:
        frappe.throw(f"Cannot delete stage '{stage_name}' because it contains {deal_count} deal(s). Please move them first.")
        
    if frappe.db.exists("CRM Deal Status", stage_name):
        frappe.delete_doc("CRM Deal Status", stage_name, force=True)
        frappe.db.commit()
        
    return {"message": "Deleted", "stage": stage_name}


@frappe.whitelist()
def get_deals_stage_summary(pipeline=None):
    """Get accurate counts and sum of project size MW per stage."""
    filters = {}
    if pipeline:
        filters["pipeline"] = pipeline
        
    deals = frappe.get_all(
        "CRM Deal",
        filters=filters,
        fields=["name", "status", "project_size_mw", "pipeline"]
    )
    
    summary = {}
    for d in deals:
        st = d.status or "Unknown"
        if st not in summary:
            summary[st] = {"count": 0, "total_mw": 0.0}
        summary[st]["count"] += 1
        summary[st]["total_mw"] += float(d.project_size_mw or 0.0)

    # Include all configured stages even if 0 deals
    all_statuses = frappe.get_all("CRM Deal Status", fields=["deal_status", "color", "type", "position"], order_by="position asc")
    for s in all_statuses:
        name = s.deal_status
        if name not in summary:
            summary[name] = {"count": 0, "total_mw": 0.0}
        summary[name]["color"] = s.color
        summary[name]["type"] = s.type
        summary[name]["position"] = s.position

    # Fetch stage descriptions and automations
    autos = get_stage_automations()
    for st, info in autos.items():
        if st in summary:
            summary[st]["description"] = info.get("description", "")
            summary[st]["has_automation"] = bool(info.get("actions"))

    return summary
