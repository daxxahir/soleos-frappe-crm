app_name = "soleos"
app_title = "Soleos"
app_publisher = "Soleos"
app_description = "Soleos App"
app_email = "admin@soleosenergy.com"
app_license = "mit"

# Migration / Setup Hooks
after_migrate = ["soleos.setup_crm.setup_all"]
after_install = ["soleos.setup_crm.setup_all"]

# Document Events
doc_events = {
    "CRM Deal": {
        "validate": "soleos.setup_crm.validate_deal"
    }
}

# Page Renderer Hook to inject Soleos CRM extensions into the Frappe CRM SPA
page_renderer = "soleos.renderer.SoleosCRMPageRenderer"
