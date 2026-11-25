import frappe

frappe.init(site="soleos.localhost", sites_path="/home/soleos/frappe-bench/sites")
frappe.connect()

print("--- Custom Fields on CRM Deal with in_standard_filter=1 ---")
cfs = frappe.get_all("Custom Field", filters={"dt": "CRM Deal", "in_standard_filter": 1}, fields=["name", "fieldname", "in_standard_filter"])
for cf in cfs:
    print(cf)

print("\n--- DocFields on CRM Deal with in_standard_filter=1 ---")
meta = frappe.get_meta("CRM Deal")
for f in meta.fields:
    if f.in_standard_filter:
        print(f.fieldname, f.label)
