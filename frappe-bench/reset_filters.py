import os, sys
os.chdir('/home/soleos/frappe-bench/sites')
sys.path.insert(0, '/home/soleos/frappe-bench/apps/frappe')
sys.path.insert(0, '/home/soleos/frappe-bench/apps/crm')
sys.path.insert(0, '/home/soleos/frappe-bench/apps/soleos')

import frappe
frappe.init(site='soleos.localhost', sites_path='/home/soleos/frappe-bench/sites')
frappe.connect()

for fn in ['deal_name', 'project_size_mw']:
    cf_name = frappe.db.exists('Custom Field', {'dt': 'CRM Deal', 'fieldname': fn})
    if cf_name:
        frappe.db.set_value('Custom Field', cf_name, 'in_standard_filter', 0)

frappe.db.commit()
frappe.clear_cache()
print('Reset in_standard_filter for deal_name and project_size_mw')
