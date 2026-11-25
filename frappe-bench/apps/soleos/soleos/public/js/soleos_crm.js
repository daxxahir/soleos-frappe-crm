/**
 * Soleos CRM - Zoho Bigin Parity & Mobile/Web Enhancements
 * 
 * Injects:
 * 1. Activities Taskbar: [ 📅 Calendar ] [ Tasks ] [ Events ] [ Calls ] (Zoho Bigin layout)
 * 2. Tasks Footer Summary: Total Tasks, Open Tasks, Completed, Overdue
 * 3. Deals Views Dropdown: [ All Deals ▾ ] with All Views, Favorites, Search, Public Views list
 * 4. Clickable Contacts and Phone Numbers (Click-to-Call with tel:...) across Web & Mobile
 * 5. Kanban Column Deal Count below Stage Title (e.g., "3 Deals", "12 Deals", "0 Deal")
 * 6. Kanban Column Three-Dot Customization Menu (+ New Deal, New Stage, Stage Automation, etc. + Banner)
 * 7. Slide-over Stage Automation Drawer with criteria builder, 10 actions palette, and persistent save
 */

(function () {
  'use strict';

  console.log('[Soleos CRM] Initializing Zoho Bigin Parity Extensions...');

  // State
  let cachedStageSummary = {};

  /* --------------------------------------------------------------------------
     API Helper
     -------------------------------------------------------------------------- */
  async function callApi(method, args = {}) {
    if (window.frappe && window.frappe.call) {
      return new Promise((resolve, reject) => {
        window.frappe.call({
          method: method,
          args: args,
          callback: (r) => resolve(r.message),
          error: (err) => reject(err)
        });
      });
    }

    // Fallback to fetch
    const csrfToken = window.csrf_token || (document.cookie.match(/csrf_token=([^;]+)/) ? document.cookie.match(/csrf_token=([^;]+)/)[1] : '');
    const res = await fetch(`/api/method/${method}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Frappe-CSRF-Token': csrfToken
      },
      body: JSON.stringify(args)
    });
    const data = await res.json();
    if (data.exc) {
      throw new Error(data._server_messages || 'Server Error');
    }
    return data.message;
  }

  /* --------------------------------------------------------------------------
     Toast Notification Helper
     -------------------------------------------------------------------------- */
  function showToast(message) {
    const existing = document.querySelector('.soleos-toast');
    if (existing) existing.remove();

    const toast = document.createElement('div');
    toast.className = 'soleos-toast';
    toast.innerText = message;
    document.body.appendChild(toast);

    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transition = 'opacity 0.3s ease';
      setTimeout(() => toast.remove(), 300);
    }, 3200);
  }

  /* --------------------------------------------------------------------------
     1. Activities Taskbar & Footer Cleanup (Preserve Clean Native Views)
     -------------------------------------------------------------------------- */
  function removeCustomActivitiesTaskbars() {
    const existing = document.getElementById('soleos-activities-taskbar');
    if (existing) existing.remove();
    const existingFooter = document.getElementById('soleos-tasks-footer-summary');
    if (existingFooter) existingFooter.remove();
    const zohoBar = document.getElementById('zoho-activities-taskbar');
    if (zohoBar) zohoBar.remove();
  }

  /* --------------------------------------------------------------------------
     3. Calendar & Events Modal Dialogs
     -------------------------------------------------------------------------- */
  function openCalendarModal() {
    let existing = document.getElementById('soleos-calendar-modal-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'soleos-calendar-modal-backdrop';
    backdrop.innerHTML = `
      <div id="soleos-calendar-modal-content">
        <div class="soleos-modal-header">
          <h3><span>📅</span> Activities Calendar (Month / Week / Day)</h3>
          <div class="soleos-modal-actions">
            <a href="/app/event/view/calendar" target="_blank">Open in Desk ↗</a>
            <button class="soleos-modal-close-btn" id="soleos-close-calendar">✕ Close</button>
          </div>
        </div>
        <div style="flex:1;position:relative;">
          <iframe src="/app/event/view/calendar" style="width:100%;height:100%;border:none;"></iframe>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.getElementById('soleos-close-calendar').onclick = () => backdrop.remove();
    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove();
    };
  }

  function openEventsModal() {
    let existing = document.getElementById('soleos-calendar-modal-backdrop');
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = 'soleos-calendar-modal-backdrop';
    backdrop.innerHTML = `
      <div id="soleos-calendar-modal-content">
        <div class="soleos-modal-header">
          <h3><span>🎟️</span> Activities Events</h3>
          <div class="soleos-modal-actions">
            <a href="/app/event" target="_blank">Open in Desk ↗</a>
            <button class="soleos-modal-close-btn" id="soleos-close-calendar">✕ Close</button>
          </div>
        </div>
        <div style="flex:1;position:relative;">
          <iframe src="/app/event" style="width:100%;height:100%;border:none;"></iframe>
        </div>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.getElementById('soleos-close-calendar').onclick = () => backdrop.remove();
    backdrop.onclick = (e) => {
      if (e.target === backdrop) backdrop.remove();
    };
  }

  /* --------------------------------------------------------------------------
     4. Remove Custom Deals Views Dropdown (Revert to Native View Controls)
     -------------------------------------------------------------------------- */
  function removeCustomDealsViewsDropdown() {
    const existing = document.getElementById('soleos-deals-view-dropdown-container');
    if (existing) existing.remove();
    const existingMenu = document.getElementById('soleos-views-menu');
    if (existingMenu) existingMenu.remove();
  }

  /* --------------------------------------------------------------------------
     5. Kanban Enhancements: Column Deal Counts & Three-Dot Customization Menu
     -------------------------------------------------------------------------- */
  async function fetchStageSummary() {
    try {
      const summary = await callApi('soleos.api.get_deals_stage_summary');
      if (summary) {
        cachedStageSummary = summary;
      }
    } catch (e) {
      console.warn('[Soleos CRM] Failed to fetch stage summary:', e);
    }
  }

  function enhanceKanbanColumns() {
    const path = window.location.pathname;
    if (!path.includes('/crm/deals')) return;

    // Clean up any mistakenly inserted count elements inside cards or card list
    document.querySelectorAll('[data-column] .soleos-stage-deal-count, [data-name] .soleos-stage-deal-count, .overflow-y-auto .soleos-stage-deal-count').forEach(el => el.remove());
    document.querySelectorAll('[data-column] .soleos-stage-title-wrap, [data-name] .soleos-stage-title-wrap, .overflow-y-auto .soleos-stage-title-wrap').forEach(wrap => {
      const parent = wrap.parentNode;
      if (!parent) return;
      while (wrap.firstChild) {
        if (wrap.firstChild.classList?.contains('soleos-stage-deal-count')) {
          wrap.firstChild.remove();
        } else {
          parent.insertBefore(wrap.firstChild, wrap);
        }
      }
      wrap.remove();
    });

    // Find ONLY actual top-level Kanban columns (exclude any child containers or scroll wrappers)
    const allCols = Array.from(document.querySelectorAll('.min-w-72.w-72, .min-w-72'));
    const columns = allCols.filter(c => !c.closest('.overflow-y-auto') && !c.closest('[data-column]'));
    if (!columns || columns.length === 0) return;

    // Close any open popovers on outside click
    if (!window._soleosStageMenuListenerAttached) {
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.soleos-stage-dropdown-menu') && !e.target.closest('.soleos-stage-more-btn')) {
          document.querySelectorAll('.soleos-stage-dropdown-menu').forEach(m => m.remove());
        }
      });
      window._soleosStageMenuListenerAttached = true;
    }

    columns.forEach(col => {
      // 1. Column Header (strictly the top header row)
      const header = col.querySelector(':scope > .flex.gap-2.items-center, :scope > div:first-child');
      if (!header) return;

      const titleBlock = header.querySelector('.flex.items-center.text-base');
      if (!titleBlock) return;

      // Find the stage title element ONLY directly inside titleBlock
      let titleEl = titleBlock.querySelector(':scope > div.text-ink-gray-9, :scope > .soleos-stage-title-wrap > div.text-ink-gray-9, .text-ink-gray-9');
      if (!titleEl || titleEl.closest('[data-column]') || titleEl.closest('.overflow-y-auto')) return;

      // 2. Identify stage name
      const draggable = col.querySelector('[data-column]');
      let stageName = draggable ? draggable.getAttribute('data-column') : '';
      if (!stageName && titleEl) {
        stageName = titleEl.textContent.trim();
      }
      if (!stageName) return;

      // 3. Count Deals in this column
      let count = 0;
      if (draggable) {
        const cards = draggable.querySelectorAll(':scope > [data-name], :scope > div, :scope > a');
        count = cards.length;
      }
      if (count === 0 && cachedStageSummary[stageName]) {
        count = cachedStageSummary[stageName].count || 0;
      }

      // Label: "1 Deal", "0 Deal", "3 Deals", "12 Deals" (matching Zoho Bigin exactly)
      const countLabel = count === 1 ? '1 Deal' : `${count} ${count === 0 ? 'Deal' : 'Deals'}`;

      // 4. Insert or update Stage Deal Count ONLY in titleBlock (Header Title)
      let titleWrap = titleEl.closest('.soleos-stage-title-wrap');
      if (!titleWrap || titleWrap.parentNode !== titleBlock) {
        titleWrap = document.createElement('div');
        titleWrap.className = 'soleos-stage-title-wrap';
        titleEl.parentNode.insertBefore(titleWrap, titleEl);
        titleWrap.appendChild(titleEl);
      }

      let countEl = titleWrap.querySelector('.soleos-stage-deal-count');
      if (!countEl) {
        countEl = document.createElement('div');
        countEl.className = 'soleos-stage-deal-count';
        titleWrap.appendChild(countEl);
      }
      if (countEl.textContent !== countLabel) {
        countEl.textContent = countLabel;
      }

      // 5. Custom Three-Dot Column Menu Button in header
      const headerRight = header.querySelector('.flex:last-child') || header.querySelector('.flex');
      if (headerRight && !headerRight.querySelector('.soleos-stage-more-btn')) {
        const nativeMoreBtn = headerRight.querySelector('button[icon="lucide-more-horizontal"], button svg.lucide-more-horizontal')?.closest('button');
        if (nativeMoreBtn) {
          nativeMoreBtn.style.display = 'none';
        }

        const moreBtn = document.createElement('button');
        moreBtn.className = 'soleos-stage-more-btn';
        moreBtn.title = 'Stage Customization';
        moreBtn.innerHTML = '···';
        moreBtn.setAttribute('data-stage', stageName);

        headerRight.style.position = 'relative';
        headerRight.prepend(moreBtn);

        moreBtn.onclick = (e) => {
          e.stopPropagation();
          e.preventDefault();
          toggleStageDropdownMenu(stageName, col, moreBtn, headerRight);
        };
      }
    });
  }

  /* --------------------------------------------------------------------------
     Zoho Bigin Column Dropdown Menu Popover
     -------------------------------------------------------------------------- */
  function toggleStageDropdownMenu(stageName, colEl, moreBtn, parentContainer) {
    const existingMenu = parentContainer.querySelector('.soleos-stage-dropdown-menu');
    if (existingMenu) {
      existingMenu.remove();
      return;
    }

    document.querySelectorAll('.soleos-stage-dropdown-menu').forEach(m => m.remove());

    const menu = document.createElement('div');
    menu.className = 'soleos-stage-dropdown-menu';
    menu.innerHTML = `
      <div class="soleos-stage-dropdown-item" data-action="new-deal">
        <span class="soleos-item-icon">➕</span>
        <span>New Deal</span>
      </div>
      <div class="soleos-stage-dropdown-item" data-action="new-stage">
        <span class="soleos-item-icon">📋</span>
        <span>New Stage</span>
      </div>
      <div class="soleos-stage-dropdown-item" data-action="stage-automation">
        <span class="soleos-item-icon">⚡</span>
        <span>Stage Automation</span>
      </div>
      <div class="soleos-stage-dropdown-item" data-action="add-description">
        <span class="soleos-item-icon">📝</span>
        <span>Add Description</span>
      </div>
      <div class="soleos-stage-dropdown-item" data-action="move-right">
        <span class="soleos-item-icon">➡️</span>
        <span>Move Right</span>
      </div>
      <div class="soleos-stage-dropdown-item" data-action="collapse-stage">
        <span class="soleos-item-icon">⬅️</span>
        <span>Collapse Stage</span>
      </div>
      <div class="soleos-stage-dropdown-item danger" data-action="delete-stage">
        <span class="soleos-item-icon">🗑️</span>
        <span>Delete Stage</span>
      </div>

      <div class="soleos-stage-menu-banner">
        <p class="soleos-banner-text">
          Trigger automated actions like sending an email whenever a deal is moved to this stage.
        </p>
        <button class="soleos-banner-btn" id="soleos-try-it-now-btn">Try it Now</button>
      </div>
    `;

    parentContainer.appendChild(menu);

    // Menu Item Click Handlers
    menu.querySelector('[data-action="new-deal"]').onclick = (e) => {
      e.stopPropagation();
      menu.remove();
      // Click native column plus button if present
      const nativePlus = colEl.querySelector('button[icon="lucide-plus"], button svg.lucide-plus')?.closest('button');
      if (nativePlus) {
        nativePlus.click();
      } else {
        const topNewDealBtn = document.querySelector('button:has(.lucide-plus)');
        if (topNewDealBtn) topNewDealBtn.click();
      }
    };

    menu.querySelector('[data-action="new-stage"]').onclick = async (e) => {
      e.stopPropagation();
      menu.remove();
      const stageNamePrompt = prompt('Enter new Sales Pipeline Stage name:');
      if (stageNamePrompt && stageNamePrompt.trim()) {
        try {
          await callApi('soleos.api.create_stage', { stage_name: stageNamePrompt.trim() });
          showToast(`Stage "${stageNamePrompt.trim()}" created successfully!`);
          window.location.reload();
        } catch (err) {
          alert('Failed to create stage: ' + (err.message || err));
        }
      }
    };

    menu.querySelector('[data-action="stage-automation"]').onclick = (e) => {
      e.stopPropagation();
      menu.remove();
      openStageAutomationDrawer(stageName);
    };

    menu.querySelector('#soleos-try-it-now-btn').onclick = (e) => {
      e.stopPropagation();
      menu.remove();
      openStageAutomationDrawer(stageName);
    };

    menu.querySelector('[data-action="add-description"]').onclick = async (e) => {
      e.stopPropagation();
      menu.remove();
      const existingDesc = cachedStageSummary[stageName]?.description || '';
      const descPrompt = prompt(`Enter description for stage "${stageName}":`, existingDesc);
      if (descPrompt !== null) {
        try {
          await callApi('soleos.api.save_stage_automation', {
            stage: stageName,
            description: descPrompt.trim()
          });
          if (cachedStageSummary[stageName]) {
            cachedStageSummary[stageName].description = descPrompt.trim();
          }
          showToast(`Description for "${stageName}" updated!`);
        } catch (err) {
          alert('Failed to update description: ' + (err.message || err));
        }
      }
    };

    menu.querySelector('[data-action="move-right"]').onclick = (e) => {
      e.stopPropagation();
      menu.remove();
      const nextSibling = colEl.nextElementSibling;
      if (nextSibling && colEl.parentNode) {
        colEl.parentNode.insertBefore(nextSibling, colEl);
        showToast(`Moved stage "${stageName}" right.`);
      } else {
        showToast(`Stage "${stageName}" is already at the rightmost position.`);
      }
    };

    menu.querySelector('[data-action="collapse-stage"]').onclick = (e) => {
      e.stopPropagation();
      menu.remove();
      const isCollapsed = colEl.classList.toggle('soleos-column-collapsed');
      if (isCollapsed) {
        colEl.title = 'Click to expand column';
        colEl.onclick = function expandHandler(ev) {
          if (colEl.classList.contains('soleos-column-collapsed')) {
            colEl.classList.remove('soleos-column-collapsed');
            colEl.onclick = null;
          }
        };
      }
    };

    menu.querySelector('[data-action="delete-stage"]').onclick = async (e) => {
      e.stopPropagation();
      menu.remove();
      if (confirm(`Are you sure you want to delete stage "${stageName}"?`)) {
        try {
          await callApi('soleos.api.delete_stage', { stage_name: stageName });
          showToast(`Stage "${stageName}" deleted.`);
          colEl.remove();
        } catch (err) {
          alert(err.message || 'Cannot delete stage with active deals.');
        }
      }
    };
  }

  /* --------------------------------------------------------------------------
     6. Slide-Over Stage Automation Drawer (Matching Zoho Bigin Parity)
     -------------------------------------------------------------------------- */
  async function openStageAutomationDrawer(stageName) {
    const existing = document.getElementById('soleos-stage-automation-backdrop');
    if (existing) existing.remove();

    // Fetch existing rule if any
    let existingRule = {
      stage: stageName,
      pipeline: '',
      enabled: 1,
      criteria: [],
      actions: []
    };

    try {
      const data = await callApi('soleos.api.get_stage_automations', { stage: stageName });
      if (data && data.stage) {
        existingRule = data;
      }
    } catch (e) {
      console.warn('[Soleos CRM] Failed to load existing stage automation:', e);
    }

    const backdrop = document.createElement('div');
    backdrop.id = 'soleos-stage-automation-backdrop';

    const drawer = document.createElement('div');
    drawer.id = 'soleos-stage-automation-drawer';

    drawer.innerHTML = `
      <div class="soleos-drawer-header">
        <div class="soleos-drawer-title-row">
          <h2 class="soleos-drawer-title">Create Stage Automation</h2>
          <span class="soleos-stage-pill">${stageName}</span>
        </div>
        <button class="soleos-drawer-close-btn" id="soleos-close-drawer">✕</button>
      </div>

      <div class="soleos-drawer-subtitle">
        The actions you specify in this rule will be executed whenever a Deal enters the stage '<strong>${stageName}</strong>'.
      </div>

      <div class="soleos-drawer-body">
        <!-- Criteria Section -->
        <div>
          <button class="soleos-criteria-btn" id="soleos-add-criteria-btn">
            <span>+</span> Add Criteria
          </button>
          <div class="soleos-criteria-list" id="soleos-criteria-container"></div>
        </div>

        <!-- Actions Section -->
        <div>
          <h4 class="soleos-section-heading">Actions</h4>
          <div class="soleos-actions-palette">
            <div class="soleos-action-trigger" data-action-type="email">
              <span class="soleos-action-plus">+</span>
              <span class="soleos-action-title">Send Email</span>
            </div>
            <div class="soleos-action-trigger" data-action-type="update_field">
              <span class="soleos-action-plus">+</span>
              <span class="soleos-action-title">Update Field</span>
            </div>
            <div class="soleos-action-trigger" data-action-type="whatsapp">
              <span class="soleos-action-plus">+</span>
              <span class="soleos-action-title">Send Whatsapp Message</span>
            </div>
            <div class="soleos-action-trigger" data-action-type="assign_owner">
              <span class="soleos-action-plus">+</span>
              <span class="soleos-action-title">Assign Owner</span>
            </div>
            <div class="soleos-action-trigger" data-action-type="connected_record">
              <span class="soleos-action-plus">+</span>
              <span class="soleos-action-title">Create Connected Record</span>
            </div>
            <div class="soleos-action-trigger" data-action-type="webhook">
              <span class="soleos-action-plus">+</span>
              <span class="soleos-action-title">Webhooks</span>
              <span class="soleos-badge-new">New</span>
            </div>
            <div class="soleos-action-trigger" data-action-type="activity">
              <span class="soleos-action-plus">+</span>
              <span class="soleos-action-title">Create Activity</span>
              <span class="soleos-action-arrow">›</span>
            </div>
            <div class="soleos-action-trigger" data-action-type="zoho_flow">
              <span class="soleos-action-plus">+</span>
              <span class="soleos-action-title">Zoho Flow Actions</span>
            </div>
            <div class="soleos-action-trigger" data-action-type="tags">
              <span class="soleos-action-plus">+</span>
              <span class="soleos-action-title">Tags</span>
              <span class="soleos-action-arrow">›</span>
            </div>
            <div class="soleos-action-trigger" data-action-type="share_deal">
              <span class="soleos-action-plus">+</span>
              <span class="soleos-action-title">Share Deal Externally</span>
              <span class="soleos-action-arrow">›</span>
            </div>
          </div>

          <!-- Active Configured Actions List -->
          <div class="soleos-configured-actions-list" id="soleos-configured-actions-container"></div>
        </div>
      </div>

      <div class="soleos-drawer-footer">
        <button class="soleos-btn-cancel" id="soleos-btn-cancel-drawer">Cancel</button>
        <button class="soleos-btn-save" id="soleos-btn-save-drawer">Save</button>
      </div>
    `;

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    const closeDrawer = () => {
      drawer.classList.add('closing');
      backdrop.style.opacity = '0';
      setTimeout(() => {
        drawer.remove();
        backdrop.remove();
      }, 250);
    };

    document.getElementById('soleos-close-drawer').onclick = closeDrawer;
    document.getElementById('soleos-btn-cancel-drawer').onclick = closeDrawer;
    backdrop.onclick = closeDrawer;

    // --- Criteria Builder ---
    const criteriaContainer = document.getElementById('soleos-criteria-container');
    const addCriterionRow = (field = 'project_size_mw', op = '>', val = '1') => {
      const row = document.createElement('div');
      row.className = 'soleos-criteria-row';
      row.innerHTML = `
        <select class="soleos-criteria-select soleos-crit-field">
          <option value="project_size_mw" ${field === 'project_size_mw' ? 'selected' : ''}>Project Size (MW)</option>
          <option value="deal_name" ${field === 'deal_name' ? 'selected' : ''}>Deal Name</option>
          <option value="territory" ${field === 'territory' ? 'selected' : ''}>Territory</option>
          <option value="owner" ${field === 'owner' ? 'selected' : ''}>Owner</option>
          <option value="probability" ${field === 'probability' ? 'selected' : ''}>Probability (%)</option>
          <option value="india_hq" ${field === 'india_hq' ? 'selected' : ''}>India HQ</option>
          <option value="lead_source" ${field === 'lead_source' ? 'selected' : ''}>Lead Source</option>
        </select>
        <select class="soleos-criteria-select soleos-crit-op">
          <option value="=" ${op === '=' ? 'selected' : ''}>Equals</option>
          <option value="!=" ${op === '!=' ? 'selected' : ''}>Not Equals</option>
          <option value=">" ${op === '>' ? 'selected' : ''}>Greater Than</option>
          <option value="<" ${op === '<' ? 'selected' : ''}>Less Than</option>
          <option value="like" ${op === 'like' ? 'selected' : ''}>Contains</option>
        </select>
        <input type="text" class="soleos-criteria-input soleos-crit-val" placeholder="Value" value="${val}" style="flex:1;" />
        <button class="soleos-criteria-remove" title="Remove Criteria">✕</button>
      `;
      row.querySelector('.soleos-criteria-remove').onclick = () => row.remove();
      criteriaContainer.appendChild(row);
    };

    document.getElementById('soleos-add-criteria-btn').onclick = () => addCriterionRow();

    // Populate existing criteria
    if (existingRule.criteria && Array.isArray(existingRule.criteria)) {
      existingRule.criteria.forEach(c => addCriterionRow(c.field, c.operator, c.value));
    }

    // --- Action Configurations ---
    const actionsContainer = document.getElementById('soleos-configured-actions-container');

    const addActionCard = (type, config = {}) => {
      const card = document.createElement('div');
      card.className = 'soleos-action-card';
      card.setAttribute('data-action-type', type);

      let title = 'Action';
      let formHtml = '';

      if (type === 'email') {
        title = '📧 Send Email';
        formHtml = `
          <div class="soleos-card-row">
            <label>Recipient:</label>
            <select class="soleos-act-recipient">
              <option value="contact" ${config.recipient === 'contact' ? 'selected' : ''}>Primary Contact</option>
              <option value="owner" ${config.recipient === 'owner' ? 'selected' : ''}>Deal Owner</option>
              <option value="custom" ${config.recipient === 'custom' ? 'selected' : ''}>Custom Email</option>
            </select>
          </div>
          <div class="soleos-card-row">
            <label>Subject:</label>
            <input type="text" class="soleos-act-subject" placeholder="Welcome to ${stageName} - Soleos Energy" value="${config.subject || ''}" />
          </div>
          <div class="soleos-card-row">
            <label>Email Body / Template:</label>
            <textarea class="soleos-act-body" placeholder="Dear Customer, Thank you for partnering with Soleos...">${config.body || ''}</textarea>
          </div>
        `;
      } else if (type === 'update_field') {
        title = '✏️ Update Field';
        formHtml = `
          <div class="soleos-card-row">
            <label>Field to Update:</label>
            <select class="soleos-act-field">
              <option value="probability" ${config.field === 'probability' ? 'selected' : ''}>Probability (%)</option>
              <option value="project_size_mw" ${config.field === 'project_size_mw' ? 'selected' : ''}>Project Size (MW)</option>
              <option value="expected_closing" ${config.field === 'expected_closing' ? 'selected' : ''}>Expected Closing Date</option>
              <option value="territory" ${config.field === 'territory' ? 'selected' : ''}>Territory</option>
            </select>
          </div>
          <div class="soleos-card-row">
            <label>New Value:</label>
            <input type="text" class="soleos-act-value" placeholder="e.g. 70" value="${config.value || ''}" />
          </div>
        `;
      } else if (type === 'whatsapp') {
        title = '💬 Send Whatsapp Message';
        formHtml = `
          <div class="soleos-card-row">
            <label>Recipient:</label>
            <select class="soleos-act-recipient">
              <option value="contact" ${config.recipient === 'contact' ? 'selected' : ''}>Primary Contact Mobile</option>
              <option value="owner" ${config.recipient === 'owner' ? 'selected' : ''}>Deal Owner Mobile</option>
            </select>
          </div>
          <div class="soleos-card-row">
            <label>WhatsApp Message Template:</label>
            <textarea class="soleos-act-body" placeholder="Hello {{ contact_name }}, your deal has progressed to stage ${stageName}!">${config.body || ''}</textarea>
          </div>
        `;
      } else if (type === 'assign_owner') {
        title = '👤 Assign Owner';
        formHtml = `
          <div class="soleos-card-row">
            <label>Select User:</label>
            <select class="soleos-act-owner">
              <option value="Administrator" ${config.owner === 'Administrator' ? 'selected' : ''}>Administrator</option>
              <option value="admin@soleosenergy.com" ${config.owner === 'admin@soleosenergy.com' ? 'selected' : ''}>admin@soleosenergy.com</option>
            </select>
          </div>
        `;
      } else if (type === 'webhook') {
        title = '🔗 Webhooks (New)';
        formHtml = `
          <div class="soleos-card-row">
            <label>Webhook URL:</label>
            <input type="text" class="soleos-act-url" placeholder="https://api.external.com/webhooks/deals" value="${config.url || ''}" />
          </div>
          <div class="soleos-card-row">
            <label>Method:</label>
            <select class="soleos-act-method">
              <option value="POST" ${config.method === 'POST' ? 'selected' : ''}>POST (JSON)</option>
              <option value="GET" ${config.method === 'GET' ? 'selected' : ''}>GET</option>
            </select>
          </div>
        `;
      } else if (type === 'activity') {
        title = '📅 Create Activity';
        formHtml = `
          <div class="soleos-card-row">
            <label>Activity Type:</label>
            <select class="soleos-act-activity-type">
              <option value="Task" ${config.activity_type === 'Task' ? 'selected' : ''}>Task</option>
              <option value="Call" ${config.activity_type === 'Call' ? 'selected' : ''}>Call Log</option>
              <option value="Meeting" ${config.activity_type === 'Meeting' ? 'selected' : ''}>Event / Meeting</option>
            </select>
          </div>
          <div class="soleos-card-row">
            <label>Title:</label>
            <input type="text" class="soleos-act-title" placeholder="Follow up on stage ${stageName}" value="${config.title || ''}" />
          </div>
        `;
      } else if (type === 'tags') {
        title = '🏷️ Add Tags';
        formHtml = `
          <div class="soleos-card-row">
            <label>Tag to attach:</label>
            <input type="text" class="soleos-act-tag" placeholder="High-Priority-Solar" value="${config.tag || ''}" />
          </div>
        `;
      } else {
        title = `⚡ ${type.replace('_', ' ').toUpperCase()}`;
        formHtml = `
          <div class="soleos-card-row">
            <label>Action Notes / Parameter:</label>
            <input type="text" class="soleos-act-custom" placeholder="Parameter value" value="${config.param || ''}" />
          </div>
        `;
      }

      card.innerHTML = `
        <div class="soleos-action-card-header">
          <span class="soleos-action-card-title">${title}</span>
          <button class="soleos-action-card-delete" title="Remove Action">✕</button>
        </div>
        ${formHtml}
      `;

      card.querySelector('.soleos-action-card-delete').onclick = () => card.remove();
      actionsContainer.appendChild(card);
    };

    // Attach click triggers for palette
    document.querySelectorAll('.soleos-action-trigger').forEach(trigger => {
      trigger.onclick = () => {
        const type = trigger.getAttribute('data-action-type');
        addActionCard(type);
      };
    });

    // Populate existing actions
    if (existingRule.actions && Array.isArray(existingRule.actions)) {
      existingRule.actions.forEach(a => addActionCard(a.type, a.config || {}));
    }

    // --- Save Button Handler ---
    document.getElementById('soleos-btn-save-drawer').onclick = async () => {
      const criteria = [];
      criteriaContainer.querySelectorAll('.soleos-criteria-row').forEach(row => {
        const field = row.querySelector('.soleos-crit-field')?.value;
        const op = row.querySelector('.soleos-crit-op')?.value;
        const val = row.querySelector('.soleos-crit-val')?.value;
        if (field) {
          criteria.push({ field, operator: op, value: val });
        }
      });

      const actions = [];
      actionsContainer.querySelectorAll('.soleos-action-card').forEach(card => {
        const type = card.getAttribute('data-action-type');
        const config = {};
        if (type === 'email') {
          config.recipient = card.querySelector('.soleos-act-recipient')?.value;
          config.subject = card.querySelector('.soleos-act-subject')?.value;
          config.body = card.querySelector('.soleos-act-body')?.value;
        } else if (type === 'update_field') {
          config.field = card.querySelector('.soleos-act-field')?.value;
          config.value = card.querySelector('.soleos-act-value')?.value;
        } else if (type === 'whatsapp') {
          config.recipient = card.querySelector('.soleos-act-recipient')?.value;
          config.body = card.querySelector('.soleos-act-body')?.value;
        } else if (type === 'assign_owner') {
          config.owner = card.querySelector('.soleos-act-owner')?.value;
        } else if (type === 'webhook') {
          config.url = card.querySelector('.soleos-act-url')?.value;
          config.method = card.querySelector('.soleos-act-method')?.value;
        } else if (type === 'activity') {
          config.activity_type = card.querySelector('.soleos-act-activity-type')?.value;
          config.title = card.querySelector('.soleos-act-title')?.value;
        } else if (type === 'tags') {
          config.tag = card.querySelector('.soleos-act-tag')?.value;
        } else {
          config.param = card.querySelector('.soleos-act-custom')?.value;
        }
        actions.push({ type, config });
      });

      try {
        await callApi('soleos.api.save_stage_automation', {
          stage: stageName,
          criteria: criteria,
          actions: actions,
          enabled: 1
        });
        showToast(`Stage Automation for "${stageName}" saved successfully!`);
        closeDrawer();
      } catch (err) {
        alert('Failed to save automation: ' + (err.message || err));
      }
    };
  }

  /* --------------------------------------------------------------------------
     7. Click-to-Call & Clickable Contacts
     -------------------------------------------------------------------------- */
  function enhanceContactsAndPhones() {
    const phoneRegex = /(?:\+?\d{1,4}[-.\s]?)?\(?\d{2,4}\)?[-.\s]?\d{3,5}[-.\s]?\d{3,5}/g;

    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          if (!node.nodeValue || node.nodeValue.trim().length < 7) return NodeFilter.FILTER_REJECT;
          const parent = node.parentElement;
          if (!parent) return NodeFilter.FILTER_REJECT;
          const tag = parent.tagName.toLowerCase();
          if (['script', 'style', 'input', 'textarea', 'a', 'button'].includes(tag)) return NodeFilter.FILTER_REJECT;
          if (parent.closest('.soleos-phone-link, .soleos-criteria-row, .soleos-action-card')) return NodeFilter.FILTER_REJECT;
          return NodeFilter.FILTER_ACCEPT;
        }
      }
    );

    const nodesToReplace = [];
    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (phoneRegex.test(node.nodeValue)) {
        nodesToReplace.push(node);
      }
    }

    nodesToReplace.forEach(node => {
      const val = node.nodeValue;
      phoneRegex.lastIndex = 0;
      const match = phoneRegex.exec(val);
      if (match) {
        const cleanNumber = match[0].replace(/[^\d+]/g, '');
        if (cleanNumber.length >= 7) {
          const span = document.createElement('span');
          span.innerHTML = val.replace(
            match[0],
            `<a href="tel:${cleanNumber}" class="soleos-phone-link">${match[0]}</a>`
          );
          if (node.parentNode) {
            node.parentNode.replaceChild(span, node);
          }
        }
      }
    });

    const contactElements = document.querySelectorAll('[data-contact-name], .contact-cell');
    contactElements.forEach(el => {
      if (el.querySelector('a')) return;
      const name = el.innerText.trim();
      if (!name) return;
      el.innerHTML = `<a href="/crm/contacts" class="soleos-contact-link">${name}</a>`;
    });
  }

  /* --------------------------------------------------------------------------
     8. Create Deal Modal Enhancements (Zoho Bigin Parity)
     -------------------------------------------------------------------------- */
  function enhanceCreateDealModal() {
    const dialogs = document.querySelectorAll('[role="dialog"]');
    dialogs.forEach(dialog => {
      const title = dialog.querySelector('h3, [role="heading"]');
      if (!title || !title.textContent.includes('Create Deal')) return;

      // 1. Description placeholder
      const descInput = dialog.querySelector('[data-fieldname="deal_description"] textarea, textarea[name="deal_description"]');
      if (descInput && !descInput.getAttribute('placeholder')) {
        descInput.setAttribute('placeholder', 'A few words about this deal');
      }

      // 2. Closing Date placeholder
      const dateInput = dialog.querySelector('[data-fieldname="expected_closure_date"] input');
      if (dateInput && !dateInput.getAttribute('placeholder')) {
        dateInput.setAttribute('placeholder', 'MM/DD/YYYY');
      }

      // 3. Stage placeholder
      const stageInput = dialog.querySelector('[data-fieldname="status"] input, [data-fieldname="status"] button');
      if (stageInput && !stageInput.textContent.trim() && !stageInput.value) {
        stageInput.setAttribute('placeholder', 'Choose a stage');
      }

      // 4. Default Project Configuration to "Solar Ground" if empty
      const configSelect = dialog.querySelector('[data-fieldname="project_configuration"] select, [data-fieldname="project_configuration"] input');
      if (configSelect && !configSelect.value) {
        configSelect.value = 'Solar Ground';
        configSelect.dispatchEvent(new Event('input', { bubbles: true }));
        configSelect.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  /* --------------------------------------------------------------------------
     9. Hide View "Save Changes" & "Cancel" Filter Buttons (No Need to Save Changes)
     -------------------------------------------------------------------------- */
  function hideViewSaveChangesPrompt() {
    const buttons = document.querySelectorAll('button');
    buttons.forEach(btn => {
      const text = (btn.textContent || '').trim();
      if (text === 'Save Changes' || text === 'Cancel') {
        btn.style.setProperty('display', 'none', 'important');
        const container = btn.closest('.border-r.pr-2, .border-r') || btn.parentElement;
        if (container) {
          container.style.setProperty('display', 'none', 'important');
          container.classList.add('soleos-hidden-save-view');
        }
      }
    });

    document.querySelectorAll('.border-r.pr-2, .border-r').forEach(el => {
      if (el.textContent.includes('Save Changes') || el.textContent.includes('Cancel')) {
        el.style.setProperty('display', 'none', 'important');
        el.classList.add('soleos-hidden-save-view');
      }
    });
  }

  /* --------------------------------------------------------------------------
     10. Navigation & Observer Engine
     -------------------------------------------------------------------------- */
  function navigateToRoute(route) {
    if (window.history && window.history.pushState) {
      window.history.pushState({}, '', route);
      window.dispatchEvent(new Event('popstate'));
    } else {
      window.location.href = route;
    }
  }

  function syncThemeColorMeta() {
    const meta = document.querySelector('meta[name="theme-color"]');
    if (!meta) return;
    const isDark = document.documentElement.getAttribute('data-theme') === 'dark';
    const next = isDark ? '#171717' : '#ffffff';
    if (meta.getAttribute('content') !== next) {
      meta.setAttribute('content', next);
    }
  }

  function runAllEnhancements() {
    syncThemeColorMeta();
    removeCustomActivitiesTaskbars();
    removeCustomDealsViewsDropdown();
    enhanceKanbanColumns();
    enhanceContactsAndPhones();
    enhanceCreateDealModal();
    hideViewSaveChangesPrompt();
  }

  // Initial Run
  syncThemeColorMeta();
  fetchStageSummary();

  new MutationObserver(syncThemeColorMeta).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['data-theme'],
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', runAllEnhancements);
  } else {
    runAllEnhancements();
  }

  // Observe SPA DOM transitions
  let throttleTimer = null;
  const observer = new MutationObserver(() => {
    if (!throttleTimer) {
      throttleTimer = setTimeout(() => {
        throttleTimer = null;
        runAllEnhancements();
      }, 200);
    }
  });

  observer.observe(document.body, { childList: true, subtree: true });

  window.addEventListener('popstate', () => {
    setTimeout(runAllEnhancements, 100);
  });

  console.log('[Soleos CRM] Zoho Bigin Parity Extensions Active!');
})();
