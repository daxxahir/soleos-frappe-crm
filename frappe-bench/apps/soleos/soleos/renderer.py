import json
import os
import frappe
from frappe.website.page_renderers.template_page import TemplatePage
from werkzeug.wrappers import Response


def _asset_version(rel_path: str) -> str:
    """Return the asset file mtime as a cache-busting query string."""
    try:
        full_path = frappe.get_app_path("soleos", "public", *rel_path.split("/"))
        return str(int(os.path.getmtime(full_path)))
    except OSError:
        return "1"


PWA_MANIFEST = {
    "id": "/crm",
    "name": "Soleos CRM",
    "short_name": "Soleos CRM",
    "description": "Soleos Solar Sales & CRM",
    "start_url": "/crm",
    "scope": "/",
    "display": "standalone",
    "background_color": "#ffffff",
    "theme_color": "#ffffff",
    "lang": "en",
    "icons": [
        {
            "src": "/assets/crm/manifest/manifest-icon-192.maskable.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "any",
        },
        {
            "src": "/assets/crm/manifest/manifest-icon-192.maskable.png",
            "sizes": "192x192",
            "type": "image/png",
            "purpose": "maskable",
        },
        {
            "src": "/assets/crm/manifest/manifest-icon-512.maskable.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "any",
        },
        {
            "src": "/assets/crm/manifest/manifest-icon-512.maskable.png",
            "sizes": "512x512",
            "type": "image/png",
            "purpose": "maskable",
        },
    ],
}

PWA_SW_JS = """/* Soleos CRM PWA SW v2 */
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))).then(() => self.clients.claim())
  );
});
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  const url = new URL(event.request.url);
  if (
    event.request.mode === 'navigate' ||
    url.pathname === '/crm-manifest.webmanifest' ||
    url.pathname.startsWith('/assets/soleos/')
  ) {
    event.respondWith(fetch(event.request, { cache: 'no-store' }));
    return;
  }
  event.respondWith(fetch(event.request));
});
"""


class SoleosCRMPageRenderer(TemplatePage):
    def can_render(self):
        if self.path in ("crm-manifest.webmanifest", "sw.js"):
            return True
        if self.path == "crm":
            return super().can_render()
        return False

    def render(self):
        if self.path == "crm-manifest.webmanifest":
            return Response(
                json.dumps(PWA_MANIFEST),
                status=200,
                mimetype="application/manifest+json",
                headers={"Cache-Control": "no-cache"},
            )

        if self.path == "sw.js":
            return Response(
                PWA_SW_JS,
                status=200,
                mimetype="application/javascript",
                headers={"Cache-Control": "no-cache", "Service-Worker-Allowed": "/"},
            )

        html = self.get_html()
        html = self.add_csrf_token(html)

        html = html.replace(
            '<meta name="apple-mobile-web-app-title" content="Frappe CRM" />',
            '<meta name="apple-mobile-web-app-title" content="Soleos CRM" />\n    <meta name="theme-color" id="soleos-theme-color" content="#ffffff" />',
        )
        html = html.replace(
            '<meta name="apple-mobile-web-app-status-bar-style" content="white" />',
            '<meta name="apple-mobile-web-app-status-bar-style" content="default" />',
        )
        html = html.replace(
            'href="/assets/crm/frontend/manifest.webmanifest"',
            'crossorigin="use-credentials" href="/crm-manifest.webmanifest"',
        )
        html = html.replace(
            '<script id="vite-plugin-pwa:register-sw" src="/assets/crm/frontend/registerSW.js"></script>',
            '<script id="soleos-pwa-register-sw">if("serviceWorker" in navigator){window.addEventListener("load",async()=>{const regs=await navigator.serviceWorker.getRegistrations();for(const r of regs){if(r.scope.includes("/assets/crm/"))await r.unregister();}const reg=await navigator.serviceWorker.register("/sw.js",{scope:"/",updateViaCache:"none"});reg.update().catch(()=>{});});}</script>',
        )

        css_v = _asset_version("css/soleos_crm.css")
        js_v = _asset_version("js/soleos_crm.js")
        soleos_injections = f"""
        <!-- Soleos CRM Custom Enhancements -->
        <link rel="stylesheet" href="/assets/soleos/css/soleos_crm.css?v={css_v}">
        <script defer src="/assets/soleos/js/soleos_crm.js?v={js_v}"></script>
        </body>
        """
        if "</body>" in html:
            html = html.replace("</body>", soleos_injections)
        else:
            html += soleos_injections

        return self.build_response(html)
