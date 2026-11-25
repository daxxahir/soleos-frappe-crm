# ERPNext Local Setup: Context, State & Roadmap

This document captures all context, architecture decisions, environment details, and execution plans established during the setup process.

---

## 1. Executive Summary & Objective

- **Goal:** Replicate and set up the company's production ERP system (currently running on Frappe Cloud at `soleos.frappe.cloud`) in a local development environment using Windows WSL2, managed through Google Antigravity.
- **Production System:** Frappe + ERPNext with a custom application named **`soleos`** (installed and visible on the ERP desk sidebar).
- **Current Constraint:** The user has ERP web access, but does **not** have Frappe Cloud management dashboard / admin repository access to pull the git repo directly.
- **Data Safety:** The restoration workflow is strictly **one-way** (`Cloud Copy -> Local Server`). Production `soleos.frappe.cloud` remains untouched.
- **Database Engine:** **MariaDB 10.11** is the dedicated database engine for this setup. (PostgreSQL has been completely removed).

---

## 2. Target Architecture

Once migration/restoration is complete, your local system operates as a fully independent, offline-capable ERP environment:

```text
                     /home/soleos/frappe-bench
                                │
             ┌──────────────────┴──────────────────┐
             │            FRAPPE BENCH             │
             │                                     │
             │   ├── apps/soleos    (Custom App)   │
             │   ├── apps/erpnext   (ERP Engine)   │
             │   └── apps/frappe    (Framework)    │
             └──────────────────┬──────────────────┘
                                │
                       MARIADB 10.11 ENGINE
                                │
             ┌──────────────────▼──────────────────┐
             │          YOUR ERP DATABASE          │
             │                                     │
             │  • Customers & Suppliers            │
             │  • Items & Inventory                │
             │  • Sales Orders & Invoices          │
             │  • Accounting & General Ledger      │
             │  • Employees & Payroll              │
             │  • Custom Reports & Print Formats   │
             │  • Company Settings & Masters       │
             └─────────────────────────────────────┘
```

---

## 3. The 4 Essential Pillars for Migration

A complete local reproduction requires 4 elements:

| Component | What it Contains | Why it is Needed |
| :--- | :--- | :--- |
| **1. Database Backup** | Database dump (`.sql` / `.sql.gz`) | Contains all business records, master data, ledger transactions, and user records. |
| **2. `soleos` App Source** | Python, JS, DocTypes, Reports, Print Formats, Hooks | Contains your company-specific business logic and custom doctype schemas. |
| **3. Files & Attachments** | `/files` (public) & `/private/files` | Stores uploaded customer documents, item photos, invoice PDFs, logos. |
| **4. Version Alignment** | Frappe/ERPNext release versions | Ensures database schema migration runs cleanly without deprecation errors. |

---

## 4. Environment & System Specifications

| Component | Status / Version | Notes |
| :--- | :--- | :--- |
| **Operating System** | Windows + WSL2 | Host platform |
| **WSL Distribution** | **Ubuntu 24.04.5 LTS** (`Ubuntu-24.04`) | *Target environment.* (Ubuntu 26.04 is ignored) |
| **Linux User & Home** | `soleos` (`/home/soleos`) | Standard Linux non-root user |
| **Bench Workspace** | `/home/soleos/frappe-bench` | Connected as active workspace in Antigravity |
| **Bench CLI** | `5.31.0` | Installed via `uv tool` (`~/.local/bin/bench`) |
| **Python** | `3.14.8` | Verified in WSL environment |
| **Node.js** | `v24.21.0` | Managed via NVM (`~/.nvm`) |
| **Yarn** | `1.22.22` | Node package manager |
| **PDF Engine** | `wkhtmltopdf 0.12.6.1 (with patched qt)` | Installed via deb package |
| **Frappe Framework** | `16.36.1` | Branch `version-16`, Commit `97a5dd9` (`apps/frappe`) |
| **ERPNext** | `16.37.0` | Branch `version-16`, Commit `af63cde` (`apps/erpnext`) |
| **Database Engine** | **MariaDB 10.11.14** ✅ | Installed, active, utf8mb4 configured, root user set |
| **PostgreSQL** | **REMOVED** ❌ | Purged from system packages, services, clusters, and directories |
| **Redis** | `7.0.15` | Cache and background queue service |

---

## 5. Strict Guardrails & Operational Constraints

1. **NO Dummy Sites (`bench new-site`):**
   - Do **NOT** create a blank or generic site right now. Site creation/restoration will happen with the actual database.
2. **NO Dummy App (`bench new-app soleos`):**
   - Do **NOT** generate a blank skeleton app named `soleos`. The actual custom code and DocTypes will be placed when provided.
3. **DO NOT Touch Production Cloud (`soleos.frappe.cloud`):**
   - The production cloud ERP is strictly read-only from our perspective.
4. **Distribution Integrity:**
   - Always operate inside `Ubuntu-24.04`. Never use `Ubuntu-26.04`.
5. **Shell Environment Awareness:**
   - Non-interactive subshells must source environment profiles (`source ~/.bashrc` or `~/.nvm/nvm.sh` and `~/.local/bin`) to access Node, Yarn, and Bench.

---

## 6. Two-Phase Execution Plan

### Phase 1: Environment Readiness (COMPLETE ✅)
- WSL2 & Ubuntu 24.04 configured.
- Python, Node, Yarn, Bench, and wkhtmltopdf installed and verified.
- PostgreSQL 16 completely uninstalled and purged.
- MariaDB 10.11 installed, running, and configured with `utf8mb4` character set.
- Frappe and ERPNext v16 repositories cloned in `/home/soleos/frappe-bench/apps`.

### Phase 2: Ingestion & Restoration (AWAITING USER ASSETS ⏳)
When you provide your software source code, database backup, and files:
1. **Place App:** Copy the `soleos` folder into `/home/soleos/frappe-bench/apps/soleos`.
2. **Install App:** Run `bench setup requirements` and link `soleos` into the bench environment.
3. **Database Restore:** Restore the database dump into MariaDB.
4. **Files Restore:** Place public and private attachment folders into the site directory.
5. **Site Config:** Update `site_config.json` with matching database credentials and encryption keys.
6. **Migrate & Build:** Run `bench --site <site-name> migrate` and `bench build`.
7. **Launch & Develop:** Run `bench start` and access the fully populated local ERP in your browser and 
