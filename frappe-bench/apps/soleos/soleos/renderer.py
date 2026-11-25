import frappe
from frappe.website.page_renderers.template_page import TemplatePage


class SoleosCRMPageRenderer(TemplatePage):
    def can_render(self):
        if self.path == "crm":
            return super().can_render()
        return False

    def render(self):
        html = self.get_html()
        html = self.add_csrf_token(html)

        soleos_injections = """
        <!-- Soleos CRM Custom Enhancements -->
        <link rel="stylesheet" href="/assets/soleos/css/soleos_crm.css">
        <script defer src="/assets/soleos/js/soleos_crm.js"></script>
        </body>
        """
        if "</body>" in html:
            html = html.replace("</body>", soleos_injections)
        else:
            html += soleos_injections

        return self.build_response(html)
