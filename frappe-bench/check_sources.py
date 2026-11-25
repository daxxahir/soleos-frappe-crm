import os, sys
os.chdir('/home/soleos/frappe-bench/sites')
sys.path.insert(0, '/home/soleos/frappe-bench/apps/frappe')
sys.path.insert(0, '/home/soleos/frappe-bench/apps/crm')
sys.path.insert(0, '/home/soleos/frappe-bench/apps/soleos')

import frappe
frappe.init(site='soleos.localhost', sites_path='/home/soleos/frappe-bench/sites')
frappe.connect()

sources = frappe.get_all('CRM Lead Source', fields=['name', 'title'])
print('CRM Lead Sources:', sources)
