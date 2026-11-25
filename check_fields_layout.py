import os, frappe

os.chdir("/home/soleos/frappe-bench/sites")
frappe.init("soleos.localhost")
frappe.connect()

layouts = frappe.get_all("CRM Fields Layout", fields=["name", "dt", "type"])
print("CRM Fields Layouts:", layouts)
for l in layouts:
    doc = frappe.get_doc("CRM Fields Layout", l.name)
    print(f"\nLayout: {l.name} ({l.dt})")
    for f in doc.fields[:10]:
        print(f"  field: {f.fieldname} ({f.label})")
