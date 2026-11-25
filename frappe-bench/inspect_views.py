import os, sys, json
os.chdir('/home/soleos/frappe-bench/sites')
sys.path.insert(0, '/home/soleos/frappe-bench/apps/frappe')
sys.path.insert(0, '/home/soleos/frappe-bench/apps/crm')
sys.path.insert(0, '/home/soleos/frappe-bench/apps/soleos')

import frappe
frappe.init(site='soleos.localhost', sites_path='/home/soleos/frappe-bench/sites')
frappe.connect()

views = frappe.get_all('CRM View Settings', filters={'dt': 'CRM Deal'}, fields=['name', 'label', 'type', 'fields', 'columns'])
for v in views:
    print(f"=== View: {v['label']} ({v['name']}) ===")
    print("Fields:", v['fields'])
    print("Columns:", v['columns'])
