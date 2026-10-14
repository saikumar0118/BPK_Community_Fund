
/* ==============================================================================
   PBK COMMUNITY CHANDA FUND — ADMIN CONTROL CENTER CLIENT SCRIPT (script.js)
   ==============================================================================
   This module powers the Single Page Application (SPA) for the Admin Dashboard.
   It manages all administrative workflows across 10 specialized tabs:
     1.  Overview: Real-time KPIs, visual balance charts & financial year filtering
     2.  Members: Directory list, CRUD, search, pagination, bulk status & 30-day deletion
     3.  Funds: Fund allocations, annual targets, expenditures & dynamic QR settings
     4.  Receipts: Audit trail, status verification, print/PDF voucher preview & CSV
     5.  Causes & Events: Per-member target campaigns, descriptions & raised totals
     6.  Announcements: Broadcast notice board, publish/draft toggles & audience reach
     7.  Active Login & Activity Log: Chronological audit events, actor trail & filters
     8.  Recycle Bin: Soft-deleted items, 30-day retention countdown & active restore
     9.  Reports: Multi-category financial statements, CSV exports & printable summaries
     10. Settings: Super Admin profile, password security & invitation generation
   ============================================================================== */

/* ============================================================================== */
/* SECTION 1: GLOBAL STATE, LOCAL DATA STORE (DB) & ROLE-BASED ACCESS CONTROL (RBAC)*/
/* Manages client state, in-memory caches, API base URL, session authorization,   */
/* and the native fetch interceptor for role-based security headers.              */
/* ============================================================================== */

    let editingAnnouncementId = null;

    const DB = {
      members: [],
      contributions: [],
      funds: [],
      causes: [],
      announcements: [],
      fundUsage: [],
      activity: []
    };

    const API_BASE = 'http://127.0.0.1:8000/api';

    function getAdminSession() {
      try {
        return JSON.parse(sessionStorage.getItem('pbk_admin') || 'null');
      } catch (e) {
        return null;
      }
    }

    function getAdminRole() {
      const s = getAdminSession();
      return (s && s.role) ? s.role : 'Super Admin';
    }

    function isSuperAdmin() {
      return getAdminRole() === 'Super Admin';
    }

    function isAdmin() {
      const r = getAdminRole();
      return r === 'Super Admin' || r === 'Admin';
    }

    function canEditMembers() {
      return isSuperAdmin();
    }

    function canEditFunds() {
      return isAdmin();
    }

    function canEditReceipts() {
      return isAdmin();
    }

    function canGenerateInvitations() {
      return isSuperAdmin();
    }

    // Intercept fetch calls to automatically attach admin role headers to API requests
    const _nativeFetch = window.fetch;
    window.fetch = function (url, options = {}) {
      const sessionAdmin = getAdminSession();
      if (sessionAdmin && typeof url === 'string' && url.includes('/api/')) {
        options = options || {};
        if (!options.headers) {
          options.headers = {};
        }
        if (options.headers instanceof Headers) {
          if (sessionAdmin.role && !options.headers.has('X-Admin-Role')) {
            options.headers.set('X-Admin-Role', sessionAdmin.role);
          }
          if (sessionAdmin.admin_id && !options.headers.has('X-Admin-Id')) {
            options.headers.set('X-Admin-Id', String(sessionAdmin.admin_id));
          }
        } else {
          if (sessionAdmin.role && !options.headers['X-Admin-Role']) {
            options.headers['X-Admin-Role'] = sessionAdmin.role;
          }
          if (sessionAdmin.admin_id && !options.headers['X-Admin-Id']) {
            options.headers['X-Admin-Id'] = String(sessionAdmin.admin_id);
          }
        }
      }
      return _nativeFetch(url, options);
    };

    function applyRoleBasedPermissions() {
      // Member management controls (restricted to Super Admin)
      const memberAddBtns = document.querySelectorAll('[data-open="memberModal"]');
      memberAddBtns.forEach(btn => {
        btn.style.display = canEditMembers() ? '' : 'none';
      });

      const memberImportBtns = document.querySelectorAll('button[onclick="importMembers()"]');
      memberImportBtns.forEach(btn => {
        btn.style.display = canEditMembers() ? '' : 'none';
      });

      const memberBulkActivate = document.querySelector('button[onclick="bulkActivate()"]');
      if (memberBulkActivate) memberBulkActivate.style.display = canEditMembers() ? '' : 'none';
      const memberBulkDisable = document.querySelector('button[onclick="bulkDisable()"]');
      if (memberBulkDisable) memberBulkDisable.style.display = canEditMembers() ? '' : 'none';
      const memberBulkVerify = document.querySelector('button[onclick="bulkVerify()"]');
      if (memberBulkVerify) memberBulkVerify.style.display = canEditMembers() ? '' : 'none';

      // Fund management controls (restricted to Super Admin and Admin; hidden for General Admin)
      const fundAddBtns = document.querySelectorAll('button[onclick="openAddFundModal()"]');
      fundAddBtns.forEach(btn => {
        btn.style.display = canEditFunds() ? '' : 'none';
      });

      const fundUsageAddBtns = document.querySelectorAll('button[onclick="openFundUsageModal()"]');
      fundUsageAddBtns.forEach(btn => {
        btn.style.display = canEditFunds() ? '' : 'none';
      });
    }

    async function loadAdminDataFromBackend() {
      try {
        const [membersRes, contribsRes, fundsRes, causesRes, annsRes, usageRes, activityRes, statsRes] = await Promise.all([
          fetch(`${API_BASE}/admin/members`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_BASE}/admin/contributions`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_BASE}/funds`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_BASE}/causes`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_BASE}/announcements`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_BASE}/fund-usage`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_BASE}/admin/activity-logs`).then(r => r.ok ? r.json() : null).catch(() => null),
          fetch(`${API_BASE}/admin/dashboard-stats`).then(r => r.ok ? r.json() : null).catch(() => null)
        ]);

        if (Array.isArray(membersRes)) {
          DB.members = membersRes.map(m => ({
            id: m.id,
            db_id: m.db_id,
            name: m.name,
            firstName: m.firstName,
            lastName: m.lastName,
            dob: m.dob || '',
            gender: m.gender,
            phone: m.phone,
            email: m.email,
            memberType: m.memberType || 'General',
            status: m.status,
            verified: m.verified,
            joinDate: m.joinDate
          }));
        }

        if (Array.isArray(contribsRes)) {
          DB.contributions = contribsRes.map(c => ({
            id: c.id,
            db_id: c.db_id,
            member: c.member,
            fund: c.fund,
            amount: c.amount,
            method: c.method,
            status: c.status,
            date: c.date,
            ref: c.ref,
            notes: c.notes
          }));
        }

        if (Array.isArray(fundsRes)) {
          DB.funds = fundsRes.map(f => ({
            id: 'F' + String(f.id).padStart(3, '0'),
            db_id: f.id,
            year: f.financial_year,
            name: f.name,
            target: f.target_amount,
            collected: f.collected_amount,
            used: f.used_amount,
            status: f.status
          }));
        }

        if (Array.isArray(causesRes)) {
          DB.causes = causesRes.map(c => ({
            id: c.cause_code || ('CAUSE-' + String(c.id).padStart(3, '0')),
            db_id: c.id,
            name: c.name,
            desc: c.description || '',
            target_per_member: Number(c.target_per_member || c.target_amount || 0),
            target: Number(c.target_amount || 0),
            raised: Number(c.raised_amount || 0),
            status: c.status || 'Draft'
          }));
        }

        if (Array.isArray(annsRes)) {
          DB.announcements = annsRes.map(a => ({
            id: 'ANN-' + String(a.id).padStart(3, '0'),
            db_id: a.id,
            title: a.title,
            text: a.message,
            status: a.status,
            date: a.date
          }));
        }

        if (Array.isArray(usageRes)) {
          DB.fundUsage = usageRes.map(u => ({
            id: 'FU-' + String(u.id).padStart(3, '0'),
            db_id: u.id,
            date: u.date,
            raw_date: u.raw_date,
            fundType: u.fundType,
            purpose: u.purpose,
            amount: u.amount,
            status: u.status,
            notes: u.notes
          }));
        }

        if (Array.isArray(activityRes)) {
          DB.activity = activityRes;
        }

        renderDynamicHeaders();
        renderMembers();
        renderFundManagement();
        renderFundUsage();
        renderCauses();
        renderAnnouncements();
        renderReceipts();
        renderActivity();
        renderRecent();
        updateOverviewStats();
        if (typeof populateFundUsageTypes === 'function') populateFundUsageTypes();
        if (typeof drawChart === 'function') setTimeout(drawChart, 50);
        applyRoleBasedPermissions();
        if (typeof fetchRecycleBinRecords === 'function') fetchRecycleBinRecords();
        if (typeof lucide !== 'undefined') lucide.createIcons();
      } catch (err) {
        console.warn('Backend sync warning:', err);
      }
    }

    let chartInstance = null;
    let donutChartInstance = null;
    let contribDonutChartInstance = null;

    let currentMemberPage = 1;
    let memberPageSize = 10;
    let selectedMemberIds = new Set();

    let selectedContribIds = new Set();
    let contribCurrentYear = '2026 - 2027';

/* ============================================================================== */
/* SECTION 2: SHARED UI UTILITIES, MODAL CONTROLS & SPA VIEW ROUTER             */
/* Provides currency formatters, status badges, toast notification system,     */
/* modal display handlers, and tab-switching SPA navigation engine.             */
/* ============================================================================== */

    function money(n) { return '₹' + Number(n).toLocaleString('en-IN') }
    function badge(status) {
      let c = status === 'Completed' || status === 'Active' || status === 'Published' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : status === 'Pending' || status === 'Draft' ? 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400' : 'bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400';
      return `<span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold ${c}">${status}</span>`;
    }
    function memberTypeBadge(type) {
      let c = type === 'Developer' ? 'bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400' : type === 'Youth' ? 'bg-sky-50 text-sky-700 dark:bg-sky-950/40 dark:text-sky-400' : type === 'Village' ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
      return `<span class="px-2.5 py-1 rounded-full text-[11px] font-bold ${c}">${type || 'General'}</span>`;
    }
    function toast(msg) {
      const box = document.getElementById('toastBox');
      if (!box) return;
      const d = document.createElement('div');
      d.className = 'toast bg-gray-900 text-white px-4 py-3 rounded-xl shadow-xl text-sm font-bold border border-gray-700';
      d.textContent = msg;
      box.appendChild(d);
      setTimeout(() => d.remove(), 2800);
    }

    function showView(v) {
      document.querySelectorAll('.view').forEach(x => x.classList.remove('active'));
      document.getElementById('view-' + v)?.classList.add('active');
      document.querySelectorAll('.sidebar-link').forEach(x => x.classList.toggle('active', x.dataset.view === v));
      document.getElementById('sidebar').classList.add('-translate-x-[calc(100%+1rem)]');
      document.getElementById('overlay').classList.add('hidden');
      window.scrollTo({ top: 0, behavior: 'smooth' });
      if (v === 'overview') { updateOverviewStats(); drawChart(); }
      if (v === 'funds') { renderFundManagement(); renderFundUsage(); if (typeof fetchAdminDonationSettings === 'function') fetchAdminDonationSettings(); }
      if (v === 'members') renderMembers();
      if (v === 'receipts') renderReceipts();
      if (v === 'causes') renderCauses();
      if (v === 'announcements') renderAnnouncements();
      if (v === 'activity') renderActivity();
      if (v === 'recycle-bin') {
        if (typeof fetchRecycleBinRecords === 'function') fetchRecycleBinRecords();
      }
      applyRoleBasedPermissions();
    }
    function openModal(id) {
      if (id === 'memberModal') {
        if (!canEditMembers()) {
          toast('Permission Denied: Only Super Admin can add or edit members.');
          return;
        }
      }
      if (id === 'memberModal' && !document.getElementById('saveMember')?.dataset.edit) {
        const fn = document.getElementById('mFirstName'); if (fn) fn.value = '';
        const ln = document.getElementById('mLastName'); if (ln) ln.value = '';
        const dob = document.getElementById('mDob'); if (dob) dob.value = '';
        const gen = document.getElementById('mGender'); if (gen) gen.value = 'Male';
        const ph = document.getElementById('mPhone'); if (ph) ph.value = '';
        const em = document.getElementById('mEmail'); if (em) em.value = '';
        const mt = document.getElementById('mType'); if (mt) mt.value = 'General';
        const st = document.getElementById('mStatus'); if (st) st.value = 'Active';
        const pwd = document.getElementById('mPassword'); if (pwd) pwd.value = 'Member@123';
        const pwdGroup = document.getElementById('mPasswordGroup'); if (pwdGroup) pwdGroup.style.display = 'block';
        const head = document.getElementById('memberModalHead');
        if (head) head.innerHTML = `<div class="flex justify-between items-center mb-5"><h2 class="text-xl font-extrabold">Add New Member</h2><button data-close="memberModal" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"><i data-lucide="x"></i></button></div>`;
        if (typeof lucide !== 'undefined') lucide.createIcons();
      }
      document.getElementById(id)?.classList.add('open');
    }
    function closeModal(id) {
      if (id === 'memberModal') {
        delete document.getElementById('saveMember')?.dataset.edit;
      }
      document.getElementById(id)?.classList.remove('open');
    }

    function renderDynamicHeaders() {
      const headers = {
        'container-receipts-header': { title: 'Receipt Management', sub: 'Review receipt records and verification status.' },
        'container-causes-header': { title: 'Causes & Events', sub: 'Publish and manage community projects and events.', btn: 'Add Cause', icon: 'plus', action: 'openAddCauseModal()' },
        'container-ann-header': { title: 'Announcements & Content', sub: 'Create notices and content that can appear on the member portal.', btn: 'New Announcement', icon: 'megaphone', action: 'openNewAnnouncementModal()' },
        'container-reports-header': { title: 'Reports', sub: 'Generate operational and financial summaries.' },
        'container-activity-header': { title: 'Activity & Audit Log', sub: 'Real-time chronological timeline of administrative actions and member activities.', btn: 'Export Log', icon: 'download', action: "exportReport('activityLogin')" },
        'container-recycle-header': { title: 'Recycle Bin', sub: 'Review and restore deleted members and records back into the active database within the 30-day retention grace period.', btn: 'Refresh', icon: 'refresh-cw', action: 'fetchRecycleBinRecords()' },
        'container-settings-header': { title: 'System Settings', sub: 'Configure portal-wide administration settings.' }
      };
      for (let id in headers) {
        const el = document.getElementById(id);
        if (el) {
          const h = headers[id];
          el.innerHTML = `<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6"><div><h1 class="text-2xl sm:text-3xl font-extrabold">${h.title}</h1><p class="text-sm text-gray-500 dark:text-gray-400 mt-1">${h.sub}</p></div>${h.btn ? `<button ${h.action ? `onclick="${h.action}"` : `data-open="${h.modal}"`} class="px-4 py-2.5 rounded-xl bg-[#b45309] hover:bg-[#963100] transition text-white font-bold flex gap-2 items-center cursor-pointer"><i data-lucide="${h.icon}"></i>${h.btn}</button>` : ''}</div>`;
        }
      }

      const modalHeads = {
        'contribModalHead': 'Add Contribution',
        'fundModalHead': 'Payment & Fund Settings',
        'causeModalHead': 'Create Cause / Event',
        'annModalHead': 'New Announcement'
      };
      for (let id in modalHeads) {
        const el = document.getElementById(id);
        if (el) {
          const modalId = id.replace('Head', '');
          el.innerHTML = `<div class="flex justify-between items-center mb-5"><h2 class="text-xl font-extrabold">${modalHeads[id]}</h2><button data-close="${modalId}" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"><i data-lucide="x"></i></button></div>`;
        }
      }

      const memberModalHead = document.getElementById('memberModalHead');
      if (memberModalHead) {
        memberModalHead.innerHTML = `<div class="flex justify-between items-center mb-5"><h2 class="text-xl font-extrabold">Member Registration & Details</h2><button data-close="memberModal" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"><i data-lucide="x"></i></button></div>`;
      }

      const reportsGrid = document.getElementById('reportsGrid');
      if (reportsGrid) {
        reportsGrid.innerHTML = `
      <div class="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 p-5"><div class="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 flex items-center justify-center"><i data-lucide="users"></i></div><h3 class="font-extrabold mt-4">Member Report</h3><p class="text-sm text-gray-500 mt-1">Member registration, status and verification.</p><div class="flex gap-2 mt-5"><button onclick="generateReport('member')" class="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm cursor-pointer">Generate</button><button onclick="exportReport('member')" class="px-3 py-2 rounded-xl border font-bold cursor-pointer" title="Export Member Report"><i data-lucide="download"></i></button></div></div>
      <div class="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 p-5"><div class="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 flex items-center justify-center"><i data-lucide="wallet"></i></div><h3 class="font-extrabold mt-4">Contribution Report</h3><p class="text-sm text-gray-500 mt-1">Transactions by date, member, fund and status.</p><div class="flex gap-2 mt-5"><button onclick="generateReport('contribution')" class="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm cursor-pointer">Generate</button><button onclick="exportReport('contribution')" class="px-3 py-2 rounded-xl border font-bold cursor-pointer" title="Export Contribution Report"><i data-lucide="download"></i></button></div></div>
      <div class="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 p-5"><div class="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 flex items-center justify-center"><i data-lucide="landmark"></i></div><h3 class="font-extrabold mt-4">Fund Report</h3><p class="text-sm text-gray-500 mt-1">Collected, used and balance by fund.</p><div class="flex gap-2 mt-5"><button onclick="generateReport('fund')" class="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm cursor-pointer">Generate</button><button onclick="exportReport('fund')" class="px-3 py-2 rounded-xl border font-bold cursor-pointer" title="Export Fund Report"><i data-lucide="download"></i></button></div></div>
      <div class="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 p-5"><div class="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 flex items-center justify-center"><i data-lucide="receipt-text"></i></div><h3 class="font-extrabold mt-4">Fund Usage Report</h3><p class="text-sm text-gray-500 mt-1">Track fund usage, purposes, amounts and status.</p><div class="flex gap-2 mt-5"><button onclick="generateReport('fundUsage')" class="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm cursor-pointer">Generate</button><button onclick="exportReport('fundUsage')" class="px-3 py-2 rounded-xl border font-bold cursor-pointer" title="Export Fund Usage Report"><i data-lucide="download"></i></button></div></div>
      <div class="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 p-5"><div class="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 flex items-center justify-center"><i data-lucide="activity"></i></div><h3 class="font-extrabold mt-4">Activity Login Report</h3><p class="text-sm text-gray-500 mt-1">Track member/admin logins, changes, activity type, time and date.</p><div class="flex gap-2 mt-5"><button onclick="generateReport('activityLogin')" class="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm cursor-pointer">Generate</button><button onclick="exportReport('activityLogin')" class="px-3 py-2 rounded-xl border font-bold cursor-pointer" title="Export Activity Login Report"><i data-lucide="download"></i></button></div></div>
      <div class="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 p-5"><div class="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 flex items-center justify-center"><i data-lucide="calendar-range"></i></div><h3 class="font-extrabold mt-4">Yearly Report</h3><p class="text-sm text-gray-500 mt-1">Compare financial years and totals.</p><div class="flex gap-2 mt-5"><button onclick="generateReport('yearly')" class="flex-1 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm cursor-pointer">Generate</button><button onclick="exportReport('yearly')" class="px-3 py-2 rounded-xl border font-bold cursor-pointer" title="Export Yearly Report"><i data-lucide="download"></i></button></div></div>
    `;
        lucide.createIcons();
      }

      const settingsContainer = document.getElementById('settingsGridContainer');
      if (settingsContainer) {
        settingsContainer.innerHTML = `
      <div class="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 p-5">
        <div class="flex items-center gap-3 mb-4"><div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 flex items-center justify-center"><i data-lucide="user"></i></div><h3 class="font-extrabold">Profile & Account</h3></div>
        <div class="space-y-2 text-sm"><div><span class="text-gray-500">Admin Name</span><div id="settingsAdminName" class="font-bold">Primary Administrator</div></div><div><span class="text-gray-500">Admin ID</span><div id="settingsAdminId" class="font-bold">PBK-A001</div></div><div><span class="text-gray-500">Email</span><div id="settingsAdminEmail" class="font-bold">admin@pbkcommunity.org</div></div><div><span class="text-gray-500">Mobile Number</span><div id="settingsAdminMobile" class="font-bold">Not set</div></div><div><span class="text-gray-500">Role</span><div id="settingsAdminRole" class="font-bold">Super Admin</div></div><div><span class="text-gray-500">Account Created</span><div class="font-bold">Not specified</div></div></div>
        <div class="mt-4 grid grid-cols-2 gap-2"><button onclick="editAdminProfile()" class="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer">Edit Profile</button><button onclick="changeAdminPassword()" class="w-full py-2 rounded-xl border font-bold hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">Change Password</button></div>
      </div>

      <div class="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 p-5">
        <div class="flex items-center gap-3 mb-4"><div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 flex items-center justify-center"><i data-lucide="palette"></i></div><h3 class="font-extrabold">Appearance</h3></div>
        <div class="space-y-3"><div><label class="label">Theme</label><select id="settingsTheme" class="field"><option value="system">System</option><option value="light">Light</option><option value="dark">Dark</option></select></div><div><label class="label">Language</label><select id="settingsLanguage" class="field"><option value="English">English</option><option value="Telugu">Telugu</option></select></div><button onclick="saveSimpleSettings()" class="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer">Save Appearance</button></div>
      </div>

      <div class="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 p-5">
        <div class="flex items-center gap-3 mb-4"><div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 flex items-center justify-center"><i data-lucide="sliders-horizontal"></i></div><h3 class="font-extrabold">Dashboard Preferences</h3></div>
        <div class="space-y-3"><div><label class="label">Default Page</label><select id="settingsDefaultPage" class="field"><option value="overview">Overview</option><option value="members">Members</option><option value="funds">Funds</option><option value="receipts">Receipts</option></select></div><div><label class="label">Financial Year</label><select id="settingsYear" class="field"><option>2026 - 2027</option><option>2025 - 2026</option><option>2024 - 2025</option></select></div><div><label class="label">Items per Page</label><select id="settingsPageSize" class="field"><option>10</option><option selected>25</option><option>50</option></select></div><button onclick="saveSimpleSettings()" class="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer">Save Preferences</button></div>
      </div>

      <div class="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 p-5">
        <div class="flex items-center gap-3 mb-4"><div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 flex items-center justify-center"><i data-lucide="bell"></i></div><h3 class="font-extrabold">Notifications</h3></div>
        <div class="space-y-3"><label class="flex items-center justify-between gap-3 text-sm font-bold"><span>Announcement notifications</span><input id="settingsAnnouncementAlerts" type="checkbox" checked class="w-5 h-5 accent-amber-600"></label><label class="flex items-center justify-between gap-3 text-sm font-bold"><span>Verification notifications</span><input id="settingsVerificationAlerts" type="checkbox" checked class="w-5 h-5 accent-amber-600"></label><button onclick="saveSimpleSettings()" class="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer">Save Notifications</button></div>
      </div>

      <div class="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 p-5">
        <div class="flex items-center gap-3 mb-4"><div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 flex items-center justify-center"><i data-lucide="shield-check"></i></div><h3 class="font-extrabold">Security</h3></div>
        <div class="space-y-3 text-sm"><div><span class="text-gray-500">Last Login</span><div class="font-bold">${new Date().toLocaleString('en-GB')}</div></div><button onclick="showView('activity')" class="w-full py-2 rounded-xl border font-bold hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">View Activity</button><button onclick="logoutAdmin()" class="w-full py-2 rounded-xl bg-gray-100 dark:bg-gray-800 font-bold hover:bg-gray-200 dark:hover:bg-gray-700 cursor-pointer">Logout</button></div>
      </div>

      ${canGenerateInvitations() ? `
      <div class="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 p-5">
        <div class="flex items-center gap-3 mb-4"><div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 flex items-center justify-center"><i data-lucide="key-round"></i></div><h3 class="font-extrabold">Admin Invitations</h3></div>
        <p class="text-xs text-gray-500 mb-3">Generate single-use invitation codes for onboarding new administrators. Choose the admin category before generating.</p>
        <div class="mb-3">
          <label class="block text-xs font-bold text-gray-700 dark:text-gray-300 mb-1">Select Administrator Role Category:</label>
          <select id="inviteRoleSelect" class="w-full py-2 px-3 rounded-xl border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-sm font-bold text-gray-900 dark:text-white">
            <option value="Admin" selected>Admin (Operations & Finance - Edit everything except Members)</option>
            <option value="General Admin">General Admin (Content & Reporting - View only for Members, Funds, Receipts)</option>
            <option value="Super Admin">Super Admin (Full Access to everything)</option>
          </select>
        </div>
        <button onclick="generateAdminInvitation()" class="w-full py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-sm cursor-pointer flex items-center justify-center gap-2"><i data-lucide="plus-circle" class="w-4 h-4"></i> Generate New Invitation Code</button>
        <div id="latestInviteCodeDisplay"></div>
      </div>
      ` : `
      <div class="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 p-5">
        <div class="flex items-center gap-3 mb-4"><div class="w-10 h-10 rounded-xl bg-gray-100 dark:bg-gray-800 text-gray-500 flex items-center justify-center"><i data-lucide="lock"></i></div><h3 class="font-extrabold">Admin Invitations</h3></div>
        <div class="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-xs text-amber-900 dark:text-amber-200">
          <p class="font-bold flex items-center gap-1.5"><i data-lucide="shield-alert" class="w-4 h-4 text-amber-600"></i> Generation Restricted</p>
          <p class="mt-1 text-gray-600 dark:text-gray-400">Admin invitation code generation is restricted to <strong>Super Admin</strong> only. Your current role is <strong>${getAdminRole()}</strong>.</p>
        </div>
      </div>
      `}

      <div class="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 p-5">
        <div class="flex items-center gap-3 mb-4"><div class="w-10 h-10 rounded-xl bg-amber-100 dark:bg-amber-950/40 text-amber-700 flex items-center justify-center"><i data-lucide="info"></i></div><h3 class="font-extrabold">System Information</h3></div>
        <div class="space-y-2 text-sm"><div class="flex justify-between gap-3"><span class="text-gray-500">Dashboard Version</span><strong>1.0.0</strong></div><div class="flex justify-between gap-3"><span class="text-gray-500">Data Mode</span><strong>Live MySQL Backend</strong></div><div class="flex justify-between gap-3"><span class="text-gray-500">Last Updated</span><strong>${new Date().toLocaleDateString('en-GB')}</strong></div></div>
      </div>
    `;
        const savedTheme = localStorage.getItem('pbk_admin_theme') || 'system';
        const themeSelect = document.getElementById('settingsTheme');
        if (themeSelect) themeSelect.value = savedTheme;
        const savedLanguage = localStorage.getItem('pbk_admin_language') || 'English';
        const langSelect = document.getElementById('settingsLanguage');
        if (langSelect) langSelect.value = savedLanguage;
        lucide.createIcons();
        loadAdminProfile();
      }
    }

/* ============================================================================== */
/* SECTION 10: SETTINGS TAB — SUPER ADMIN PROFILE & INVITATION SYSTEM            */
/* Handles Super Admin credentials, profile editing, password changes,          */
/* system appearance/theme options, single-use invitation codes, and logout.     */
/* ============================================================================== */

    function saveSimpleSettings() {
      const theme = document.getElementById('settingsTheme')?.value || 'system';
      const language = document.getElementById('settingsLanguage')?.value || 'English';
      localStorage.setItem('pbk_admin_theme', theme);
      localStorage.setItem('pbk_admin_language', language);
      if (typeof applyTheme === 'function') applyTheme(theme);
      toast('Settings saved');
      addActivity('Updated dashboard settings');
    }

    function editAdminProfile() {
      const saved = JSON.parse(localStorage.getItem('pbk_admin_profile') || '{}');
      const existing = document.getElementById('editAdminProfileModal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'editAdminProfileModal';
      modal.className = 'fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm';
      modal.innerHTML = `
    <div class="w-full max-w-lg bg-white dark:bg-gray-900 rounded-2xl shadow-2xl border dark:border-gray-800 p-6">
      <div class="flex items-center justify-between mb-5">
        <div>
          <h2 class="text-xl font-extrabold">Edit Profile</h2>
          <p class="text-sm text-gray-500 mt-1">Update your administrator profile details.</p>
        </div>
        <button type="button" id="closeEditAdminProfile" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer" aria-label="Close">
          <i data-lucide="x"></i>
        </button>
      </div>
      <div class="space-y-4">
        <div>
          <label class="label">Admin Name</label>
          <input id="editAdminName" class="field w-full" value="${String(saved.name || 'Primary Administrator').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}" autocomplete="name">
        </div>
        <div>
          <label class="label">Email</label>
          <input id="editAdminEmail" type="email" class="field w-full" value="${String(saved.email || 'admin@pbkcommunity.org').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}" autocomplete="email">
        </div>
        <div>
          <label class="label">Mobile Number</label>
          <input id="editAdminMobile" type="tel" class="field w-full" value="${String(saved.mobile || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}" autocomplete="tel">
        </div>
        <div>
          <label class="label">Profile Picture / Logo</label>
          <input id="editAdminPhoto" type="file" accept="image/*" class="field w-full">
          <div class="text-xs text-gray-500 mt-1">Optional. The selected image is saved in this browser.</div>
        </div>
      </div>
      <div class="flex justify-end gap-2 mt-6">
        <button type="button" id="cancelEditAdminProfile" class="px-4 py-2 rounded-xl border font-bold hover:bg-gray-50 dark:hover:bg-gray-800 cursor-pointer">Cancel</button>
        <button type="button" id="saveEditAdminProfile" class="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold cursor-pointer">Save Changes</button>
      </div>
    </div>`;

      document.body.appendChild(modal);
      if (window.lucide) lucide.createIcons();

      const close = () => modal.remove();
      document.getElementById('closeEditAdminProfile')?.addEventListener('click', close);
      document.getElementById('cancelEditAdminProfile')?.addEventListener('click', close);
      modal.addEventListener('click', e => { if (e.target === modal) close(); });

      document.getElementById('saveEditAdminProfile')?.addEventListener('click', () => {
        const name = document.getElementById('editAdminName')?.value.trim() || 'Primary Administrator';
        const email = document.getElementById('editAdminEmail')?.value.trim() || 'admin@pbkcommunity.org';
        const mobile = document.getElementById('editAdminMobile')?.value.trim() || '';
        const photoInput = document.getElementById('editAdminPhoto');
        const profile = { name, email, mobile, photo: saved.photo || '' };

        const saveProfile = () => {
          localStorage.setItem('pbk_admin_profile', JSON.stringify(profile));
          const n = document.getElementById('settingsAdminName');
          const e = document.getElementById('settingsAdminEmail');
          const m = document.getElementById('settingsAdminMobile');
          if (n) n.textContent = profile.name;
          if (e) e.textContent = profile.email;
          if (m) m.textContent = profile.mobile || 'Not set';
          close();
          toast('Profile updated successfully');
          if (typeof addActivity === 'function') addActivity('Updated admin profile');
        };

        if (photoInput?.files?.[0]) {
          const reader = new FileReader();
          reader.onload = () => { profile.photo = reader.result; saveProfile(); };
          reader.readAsDataURL(photoInput.files[0]);
        } else {
          saveProfile();
        }
      });
    }

    function loadAdminProfile() {
      const sessionAdmin = getAdminSession();
      const saved = JSON.parse(localStorage.getItem('pbk_admin_profile') || '{}');
      const adminName = sessionAdmin ? `${sessionAdmin.first_name} ${sessionAdmin.last_name || ''}`.trim() : (saved.name || 'Primary Administrator');
      const adminEmail = sessionAdmin?.email || saved.email || 'admin@pbkcommunity.org';
      const adminPhone = sessionAdmin?.phone || saved.mobile || 'Not set';
      const adminId = sessionAdmin ? ('PBK-A' + String(sessionAdmin.admin_id).padStart(3, '0')) : 'PBK-A001';
      const adminRole = sessionAdmin?.role || 'Super Admin';

      const n = document.getElementById('settingsAdminName');
      const e = document.getElementById('settingsAdminEmail');
      const m = document.getElementById('settingsAdminMobile');
      const idEl = document.getElementById('settingsAdminId');
      const roleEl = document.getElementById('settingsAdminRole');
      if (n) n.textContent = adminName;
      if (e) e.textContent = adminEmail;
      if (m) m.textContent = adminPhone;
      if (idEl) idEl.textContent = adminId;
      if (roleEl) roleEl.textContent = adminRole;

      const headerName = document.getElementById('adminHeaderName');
      const headerRole = document.getElementById('adminHeaderRole');
      const headerAvatar = document.getElementById('adminHeaderAvatar');
      if (headerName) headerName.textContent = adminName;
      if (headerRole) {
        headerRole.textContent = adminRole;
        if (adminRole === 'Super Admin') {
          headerRole.className = 'text-[10px] text-amber-500 font-extrabold';
        } else if (adminRole === 'Admin') {
          headerRole.className = 'text-[10px] text-blue-500 font-extrabold';
        } else {
          headerRole.className = 'text-[10px] text-emerald-500 font-extrabold';
        }
      }
      if (headerAvatar && adminName) headerAvatar.textContent = adminName[0].toUpperCase();

      applyRoleBasedPermissions();
    }

    function changeAdminPassword() {
      const sessionAdmin = JSON.parse(sessionStorage.getItem('pbk_admin') || 'null');
      const username = sessionAdmin?.phone || sessionAdmin?.email || prompt('Enter your registered phone or email:');
      if (!username) return;

      const currentPassword = prompt('Enter current password:');
      if (!currentPassword) return;

      const newPassword = prompt('Enter new password (min 6 characters):');
      if (!newPassword || newPassword.length < 6) {
        toast('New password must be at least 6 characters');
        return;
      }

      fetch(`${API_BASE}/auth/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: username.trim(),
          current_password: currentPassword,
          new_password: newPassword,
          user_type: 'Admin'
        })
      })
      .then(r => r.json().then(data => ({ ok: r.ok, data })))
      .then(({ ok, data }) => {
        if (ok) {
          toast('✓ Password updated successfully!');
          if (typeof addActivity === 'function') addActivity('Changed administrator password');
        } else {
          toast('❌ ' + (data.detail || 'Password update failed'));
        }
      })
      .catch(err => {
        toast('❌ Network error updating password');
      });
    }

    async function generateAdminInvitation() {
      if (!canGenerateInvitations()) {
        toast('Permission Denied: Only Super Admin can generate invitation codes.');
        return;
      }
      try {
        const sessionAdmin = getAdminSession();
        const roleSelect = document.getElementById('inviteRoleSelect');
        const selectedRole = roleSelect ? roleSelect.value : 'Admin';

        const res = await fetch(`${API_BASE}/admin-invitations/generate`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            role: selectedRole,
            admin_id: sessionAdmin?.admin_id || null
          })
        });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.detail || 'Failed to generate invitation');
        }

        const data = await res.json();
        const code = data.invitation_code;
        const assignedRole = data.role || selectedRole;

        if (navigator.clipboard) {
          navigator.clipboard.writeText(code).catch(() => {});
        }

        const displayEl = document.getElementById('latestInviteCodeDisplay');
        if (displayEl) {
          displayEl.innerHTML = `
            <div class="p-3 bg-amber-50 dark:bg-amber-950/60 border border-amber-300 dark:border-amber-700 rounded-xl mt-3">
              <div class="flex items-center justify-between mb-1">
                <p class="text-xs text-amber-900 dark:text-amber-200 font-bold">Active Invitation Code (Single Use · Copied!):</p>
                <span class="text-[11px] px-2 py-0.5 rounded-full font-extrabold bg-amber-200 dark:bg-amber-900 text-amber-900 dark:text-amber-100">${assignedRole}</span>
              </div>
              <div class="flex items-center justify-between gap-2">
                <span class="font-mono text-base font-extrabold text-amber-700 dark:text-amber-400 select-all">${code}</span>
                <button onclick="navigator.clipboard.writeText('${code}');toast('Code copied!')" class="px-3 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs cursor-pointer">Copy</button>
              </div>
              <p class="text-[11px] text-amber-800 dark:text-amber-300/80 mt-1.5 font-medium">⚠️ Only this newest code is valid. Role assigned: <strong>${assignedRole}</strong>. Any older codes are automatically disabled.</p>
            </div>
          `;
        }
        toast(`Invitation code for ${assignedRole} generated: ${code}`);
        if (typeof addActivity === 'function') addActivity(`Generated admin invitation code for role ${assignedRole}`);
      } catch (err) {
        toast(`Failed to generate invitation code: ${err.message}`);
      }
    }

    function logoutAdmin() {
      sessionStorage.removeItem('pbk_admin');
      window.location.href = '../HomeLogRegisPass/HomeLogRegisPass.html#login';
    }

/* ============================================================================== */
/* SECTION 4: MEMBERS TAB — DIRECTORY, LIFECYCLE & BULK MANAGEMENT             */
/* Handles member table rendering, pagination, multi-field search, filtering,   */
/* bulk activate/disable/verify, member edit/save, and 30-day deletion modal.   */
/* ============================================================================== */

    function renderMembers() {
      const searchInput = (document.getElementById('memberSearch')?.value || '').toLowerCase();
      const statusFilter = document.getElementById('memberStatus')?.value || 'All';
      const verFilter = document.getElementById('memberVerification')?.value || 'All';
      const typeFilter = document.getElementById('memberType')?.value || 'All';
      const sortOption = document.getElementById('memberSort')?.value || 'nameAsc';

      const totalCount = DB.members.length;
      const activeCount = DB.members.filter(m => m.status === 'Active').length;
      const pendingCount = DB.members.filter(m => m.status === 'Pending' || !m.verified).length;
      const inactiveCount = DB.members.filter(m => m.status === 'Inactive').length;

      if (document.getElementById('statTotalMembers')) document.getElementById('statTotalMembers').textContent = totalCount;
      if (document.getElementById('statActiveMembers')) document.getElementById('statActiveMembers').textContent = activeCount;
      if (document.getElementById('statActivePct')) document.getElementById('statActivePct').textContent = totalCount > 0 ? Math.round((activeCount / totalCount) * 100) + '%' : '0%';
      if (document.getElementById('statPendingMembers')) document.getElementById('statPendingMembers').textContent = pendingCount;
      if (document.getElementById('statInactiveMembers')) document.getElementById('statInactiveMembers').textContent = inactiveCount;
      if (document.getElementById('statInactivePct')) document.getElementById('statInactivePct').textContent = totalCount > 0 ? Math.round((inactiveCount / totalCount) * 100) + '%' : '0%';
      if (document.getElementById('kMembers')) document.getElementById('kMembers').textContent = totalCount;
      if (document.getElementById('kMembersSub')) document.getElementById('kMembersSub').textContent = `${activeCount} active member${activeCount === 1 ? '' : 's'}`;

      let filtered = DB.members.filter(m => {
        const matchSearch = [m.name, m.id, m.phone, m.email, m.dob || '', m.gender || '', m.memberType || ''].join(' ').toLowerCase().includes(searchInput);
        const matchStatus = (statusFilter === 'All' || m.status === statusFilter);
        const matchVer = (verFilter === 'All' || (verFilter === 'Verified' && m.verified) || (verFilter === 'Pending' && !m.verified));
        const matchType = (typeFilter === 'All' || m.memberType === typeFilter);
        return matchSearch && matchStatus && matchVer && matchType;
      });

      const getMemberContribData = (memberName) => {
        const inactiveFunds = new Set((DB.funds || []).filter(f => f.status === 'Inactive' || f.status === 'Disabled').map(f => f.name));
        const memContribs = (DB.contributions || []).filter(c => 
          c.member === memberName && 
          c.status === 'Completed' && 
          !inactiveFunds.has(c.fund)
        );
        const totalAmt = memContribs.reduce((sum, c) => sum + Number(c.amount || 0), 0);
        return { count: memContribs.length, amount: totalAmt };
      };

      filtered.sort((a, b) => {
        const aDisabled = a.status === 'Inactive' || a.status === 'Disabled';
        const bDisabled = b.status === 'Inactive' || b.status === 'Disabled';
        const contribA = aDisabled ? 0 : getMemberContribData(a.name).amount;
        const contribB = bDisabled ? 0 : getMemberContribData(b.name).amount;
        if (sortOption === 'nameAsc') return a.name.localeCompare(b.name);
        if (sortOption === 'nameDesc') return b.name.localeCompare(a.name);
        if (sortOption === 'newest') return new Date(b.joinDate || 0) - new Date(a.joinDate || 0);
        if (sortOption === 'oldest') return new Date(a.joinDate || 0) - new Date(b.joinDate || 0);
        if (sortOption === 'contribHigh') return contribB - contribA;
        if (sortOption === 'contribLow') return contribA - contribB;
        return 0;
      });

      const totalFiltered = filtered.length;
      const totalPages = Math.ceil(totalFiltered / memberPageSize) || 1;
      if (currentMemberPage > totalPages) currentMemberPage = totalPages;
      const startIndex = (currentMemberPage - 1) * memberPageSize;
      const paginatedMembers = filtered.slice(startIndex, startIndex + memberPageSize);

      const startNum = totalFiltered === 0 ? 0 : startIndex + 1;
      const endNum = Math.min(startIndex + memberPageSize, totalFiltered);
      if (document.getElementById('paginationInfo')) document.getElementById('paginationInfo').textContent = `Showing ${startNum}–${endNum} of ${totalFiltered} members`;

      const pagBtnsEl = document.getElementById('paginationButtons');
      if (pagBtnsEl) {
        let btnsHtml = `<button onclick="changeMemberPage(${currentMemberPage - 1})" ${currentMemberPage <= 1 ? 'disabled class="opacity-40 cursor-not-allowed px-2.5 py-1 rounded border dark:border-gray-700 font-bold"' : 'class="px-2.5 py-1 rounded border dark:border-gray-700 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition"'}>Prev</button>`;
        for (let i = 1; i <= totalPages; i++) {
          if (i === 1 || i === totalPages || (i >= currentMemberPage - 1 && i <= currentMemberPage + 1)) {
            btnsHtml += `<button onclick="changeMemberPage(${i})" class="px-3 py-1 rounded border ${i === currentMemberPage ? 'bg-amber-600 text-white border-amber-600' : 'border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'} font-bold transition">${i}</button>`;
          } else if (i === currentMemberPage - 2 || i === currentMemberPage + 2) {
            btnsHtml += `<span class="px-1 text-gray-400">...</span>`;
          }
        }
        btnsHtml += `<button onclick="changeMemberPage(${currentMemberPage + 1})" ${currentMemberPage >= totalPages ? 'disabled class="opacity-40 cursor-not-allowed px-2.5 py-1 rounded border dark:border-gray-700 font-bold"' : 'class="px-2.5 py-1 rounded border dark:border-gray-700 font-bold hover:bg-gray-100 dark:hover:bg-gray-800 transition"'}>Next</button>`;
        pagBtnsEl.innerHTML = btnsHtml;
      }

      const tbody = document.getElementById('membersTable');
      if (tbody) {
        if (paginatedMembers.length === 0) {
          tbody.innerHTML = `
        <tr>
          <td colspan="11" class="p-10 text-center text-gray-500">
            <div class="flex flex-col items-center justify-center gap-2">
              <i data-lucide="users" class="w-10 h-10 text-gray-400 opacity-50"></i>
              <div class="font-extrabold text-base">No members found</div>
              <p class="text-xs text-gray-400">Try adjusting your search or filter criteria.</p>
              <button onclick="clearMemberFilters()" class="mt-2 px-4 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs hover:bg-amber-700 transition cursor-pointer">Clear Filters</button>
            </div>
          </td>
        </tr>
      `;
        } else {
          tbody.innerHTML = paginatedMembers.map((m, index) => {
            const isSelected = selectedMemberIds.has(m.id);
            const isMemberDisabled = m.status === 'Inactive' || m.status === 'Disabled';
            const contribData = getMemberContribData(m.name);
            return `
          <tr class="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition ${isSelected ? 'bg-amber-50/50 dark:bg-amber-950/20' : ''}">
            <td class="p-3.5 text-center"><input type="checkbox" ${isSelected ? 'checked' : ''} ${!canEditMembers() ? 'disabled' : ''} onclick="toggleMemberSelection('${m.id}')" class="rounded accent-amber-600 w-4 h-4 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"></td>
            <td class="p-3.5 font-bold text-gray-400">#${startIndex + index + 1}</td>
            <td class="p-3.5">
              <div>
                <div class="font-extrabold text-gray-900 dark:text-white">${m.name}</div>
                <div class="text-xs text-gray-500">${m.email || '—'} · DOB: ${m.dob || '—'} · ${m.gender || ''}</div>
              </div>
            </td>
            <td class="p-3.5 font-mono font-bold text-amber-700 dark:text-amber-400">${m.id}</td>
            <td class="p-3.5 text-xs font-semibold">${m.phone || '—'}</td>
            <td class="p-3.5">${memberTypeBadge(m.memberType)}</td>
            <td class="p-3.5">${badge(m.status)}</td>
            <td class="p-3.5 font-bold">${m.verified ? '<span class="text-emerald-600 dark:text-emerald-400 flex items-center gap-1">✓ Verified</span>' : '<span class="text-gray-400">— Pending</span>'}</td>
            <td class="p-3.5">
              ${isMemberDisabled ? `
                <div class="font-bold text-gray-400 dark:text-gray-500">—</div>
                <div class="text-[11px] text-rose-500 dark:text-rose-400 font-bold">Disabled</div>
              ` : `
                <div class="font-extrabold text-gray-900 dark:text-white">${money(contribData.amount)}</div>
                <div class="text-[11px] text-gray-500">${contribData.count} contributions</div>
              `}
            </td>
            <td class="p-3.5 text-xs text-gray-500 font-semibold">${m.joinDate || '12 Jan 2025'}</td>
            <td class="p-3.5 text-right">
              <div class="flex items-center justify-end gap-1">
                <button onclick="viewMemberDetails('${m.id}')" class="px-2.5 py-1 rounded-lg bg-sky-50 dark:bg-sky-950/40 text-sky-600 dark:text-sky-400 font-bold text-xs hover:bg-sky-100 transition cursor-pointer" title="View Profile">View</button>
                ${canEditMembers() ? `
                  <button onclick="editMember('${m.id}')" class="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold text-xs hover:bg-amber-100 transition cursor-pointer" title="Edit Member">Edit</button>
                  ${isMemberDisabled ? `
                    <button onclick="toggleMemberStatusQuick('${m.id}', 'Active')" class="px-2.5 py-1 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 font-bold text-xs hover:bg-emerald-100 transition cursor-pointer" title="Enable Account">Enable</button>
                  ` : `
                    <button onclick="toggleMemberStatusQuick('${m.id}', 'Inactive')" class="px-2.5 py-1 rounded-lg bg-orange-50 dark:bg-orange-950/40 text-orange-700 dark:text-orange-400 font-bold text-xs hover:bg-orange-100 transition cursor-pointer" title="Disable Account">Disable</button>
                  `}
                  <button onclick="openDeleteMemberModal('${m.id}')" class="delete-action" title="Permanently Delete Member Account"><i data-lucide="trash-2"></i><span>Delete</span></button>
                ` : `
                  <span class="text-[11px] font-bold text-gray-400 dark:text-gray-500 px-2">View Only</span>
                `}
              </div>
            </td>

          </tr>
        `;
          }).join('');
        }
      }

      const selCountEl = document.getElementById('selectedCountLabel');
      if (selCountEl) selCountEl.textContent = `${selectedMemberIds.size} selected`;
      lucide.createIcons();
    }

    function changePageSize() {
      const sel = document.getElementById('pageSizeSelect');
      if (sel) {
        memberPageSize = Number(sel.value) || 10;
        currentMemberPage = 1;
        renderMembers();
      }
    }

    function changeMemberPage(page) {
      currentMemberPage = page;
      renderMembers();
    }

    function clearMemberFilters() {
      const s = document.getElementById('memberSearch'); if (s) s.value = '';
      const st = document.getElementById('memberStatus'); if (st) st.value = 'All';
      const v = document.getElementById('memberVerification'); if (v) v.value = 'All';
      const t = document.getElementById('memberType'); if (t) t.value = 'All';
      const so = document.getElementById('memberSort'); if (so) so.value = 'nameAsc';
      currentMemberPage = 1;
      renderMembers();
      toast('Filters cleared');
    }

    function toggleSelectAll(checkbox) {
      const searchInput = (document.getElementById('memberSearch')?.value || '').toLowerCase();
      const statusFilter = document.getElementById('memberStatus')?.value || 'All';
      const verFilter = document.getElementById('memberVerification')?.value || 'All';
      const typeFilter = document.getElementById('memberType')?.value || 'All';

      let filtered = DB.members.filter(m => {
        const matchSearch = [m.name, m.id, m.phone, m.email, m.dob || '', m.gender || '', m.memberType || ''].join(' ').toLowerCase().includes(searchInput);
        const matchStatus = (statusFilter === 'All' || m.status === statusFilter);
        const matchVer = (verFilter === 'All' || (verFilter === 'Verified' && m.verified) || (verFilter === 'Pending' && !m.verified));
        const matchType = (typeFilter === 'All' || m.memberType === typeFilter);
        return matchSearch && matchStatus && matchVer && matchType;
      });

      if (checkbox.checked) {
        filtered.forEach(m => selectedMemberIds.add(m.id));
      } else {
        selectedMemberIds.clear();
      }
      renderMembers();
    }

    function toggleMemberSelection(id) {
      if (selectedMemberIds.has(id)) {
        selectedMemberIds.delete(id);
      } else {
        selectedMemberIds.add(id);
      }
      renderMembers();
    }

    function bulkActivate() {
      if (!canEditMembers()) {
        toast('Permission Denied: Only Super Admin can modify members.');
        return;
      }
      if (selectedMemberIds.size === 0) { toast('No members selected'); return; }
      DB.members.forEach(m => {
        if (selectedMemberIds.has(m.id)) {
          m.status = 'Active';
          if (m.db_id) fetch(`${API_BASE}/admin/members/${m.db_id}/status?status=active`, { method: 'PUT' }).catch(() => {});
        }
      });
      toast(`Activated ${selectedMemberIds.size} members`);
      addActivity(`Bulk activated ${selectedMemberIds.size} members`);
      selectedMemberIds.clear();
      renderMembers();
    }

    function bulkDisable() {
      if (!canEditMembers()) {
        toast('Permission Denied: Only Super Admin can modify members.');
        return;
      }
      if (selectedMemberIds.size === 0) { toast('No members selected'); return; }
      DB.members.forEach(m => {
        if (selectedMemberIds.has(m.id)) {
          m.status = 'Inactive';
          if (m.db_id) fetch(`${API_BASE}/admin/members/${m.db_id}/status?status=inactive`, { method: 'PUT' }).catch(() => {});
        }
      });
      toast(`Disabled ${selectedMemberIds.size} members`);
      addActivity(`Bulk disabled ${selectedMemberIds.size} members`);
      selectedMemberIds.clear();
      renderMembers();
    }

    function bulkVerify() {
      if (!canEditMembers()) {
        toast('Permission Denied: Only Super Admin can modify members.');
        return;
      }
      if (selectedMemberIds.size === 0) { toast('No members selected'); return; }
      DB.members.forEach(m => {
        if (selectedMemberIds.has(m.id)) {
          m.verified = true;
          m.status = 'Active';
          if (m.db_id) fetch(`${API_BASE}/admin/members/${m.db_id}/status?status=active`, { method: 'PUT' }).catch(() => {});
        }
      });
      toast(`Verified ${selectedMemberIds.size} members`);
      addActivity(`Bulk verified ${selectedMemberIds.size} members`);
      selectedMemberIds.clear();
      renderMembers();
    }

    function exportMembers() {
      const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(DB.members, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute("href", dataStr);
      downloadAnchor.setAttribute("download", "pbk_community_members.json");
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
      toast('Member records exported successfully');
    }

    function importMembers() {
      if (!canEditMembers()) {
        toast('Permission Denied: Only Super Admin can import members.');
        return;
      }
      toast('Import feature opened in demo mode');
    }

    function viewMemberDetails(id) {
      const m = DB.members.find(x => x.id === id);
      if (!m) return;
      const isMemberDisabled = m.status === 'Inactive' || m.status === 'Disabled';
      const inactiveFunds = new Set((DB.funds || []).filter(f => f.status === 'Inactive' || f.status === 'Disabled').map(f => f.name));
      const memContribs = (DB.contributions || []).filter(c => c.member === m.name && c.status === 'Completed' && !inactiveFunds.has(c.fund));
      const totalAmt = memContribs.reduce((sum, c) => sum + Number(c.amount || 0), 0);

      const contentEl = document.getElementById('memberDetailsContent');
      contentEl.innerHTML = `
    <div class="flex items-center gap-4 pb-4 border-b dark:border-gray-800">
      <div class="w-14 h-14 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-extrabold text-lg flex items-center justify-center border-2 border-amber-300 dark:border-amber-700">
        ${m.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()}
      </div>
      <div>
        <h3 class="text-lg font-extrabold text-gray-900 dark:text-white">${m.name}</h3>
        <p class="text-xs font-mono font-bold text-amber-600 dark:text-amber-400">${m.id}</p>
        <div class="flex gap-2 mt-1">
          ${badge(m.status)}
          ${memberTypeBadge(m.memberType)}
          ${m.verified ? '<span class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400">Verified</span>' : ''}
        </div>
      </div>
    </div>
    <div class="grid grid-cols-2 gap-4 pt-2">
      <div><span class="text-xs font-bold text-gray-400 uppercase">Email Address</span><div class="font-semibold text-gray-900 dark:text-white">${m.email || '—'}</div></div>
      <div><span class="text-xs font-bold text-gray-400 uppercase">Phone Number</span><div class="font-semibold text-gray-900 dark:text-white">${m.phone || '—'}</div></div>
      <div><span class="text-xs font-bold text-gray-400 uppercase">Date of Birth</span><div class="font-semibold text-gray-900 dark:text-white">${m.dob || '—'}</div></div>
      <div><span class="text-xs font-bold text-gray-400 uppercase">Gender</span><div class="font-semibold text-gray-900 dark:text-white">${m.gender || '—'}</div></div>
      <div><span class="text-xs font-bold text-gray-400 uppercase">Registration Date</span><div class="font-semibold text-gray-900 dark:text-white">${m.joinDate || '12 Jan 2025'}</div></div>
      <div class="col-span-2"><span class="text-xs font-bold text-gray-400 uppercase">Total Contribution</span>
        ${isMemberDisabled ? `
          <div class="font-bold text-gray-400 dark:text-gray-500">— <span class="text-xs text-rose-500 font-bold">(Member Disabled)</span></div>
        ` : `
          <div class="font-bold text-emerald-600 dark:text-emerald-400">${money(totalAmt)} (${memContribs.length} transactions)</div>
        `}
      </div>
    </div>
    ${canEditMembers() ? `
    <div class="flex items-center justify-between p-3.5 rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 mt-4">
      <div>
        <span class="text-xs font-bold text-gray-500 dark:text-gray-400 block">Account Status Control</span>
        <span class="text-sm font-extrabold ${isMemberDisabled ? 'text-rose-500' : 'text-emerald-500'}">${m.status}</span>
      </div>
      <div class="flex items-center gap-2">
        ${isMemberDisabled ? `
          <button type="button" onclick="toggleMemberStatusQuick('${m.id}', 'Active'); closeModal('memberDetailsModal');" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition cursor-pointer">Enable Account</button>
        ` : `
          <button type="button" onclick="toggleMemberStatusQuick('${m.id}', 'Inactive'); closeModal('memberDetailsModal');" class="px-3 py-1.5 rounded-lg bg-orange-600 hover:bg-orange-700 text-white font-bold text-xs transition cursor-pointer">Disable Account</button>
        `}
        <button type="button" onclick="closeModal('memberDetailsModal'); openDeleteMemberModal('${m.id}');" class="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-xs transition cursor-pointer flex items-center gap-1"><i data-lucide="trash-2" class="w-3.5 h-3.5"></i>Delete Account</button>
      </div>
    </div>
    ` : `
    <div class="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700/60 mt-4 text-xs text-gray-500 flex items-center justify-between">
      <span>Account Status: <strong class="${isMemberDisabled ? 'text-rose-500' : 'text-emerald-500'} font-bold">${m.status}</strong></span>
      <span class="italic text-gray-400">Modifications restricted to Super Admin</span>
    </div>
    `}
  `;
      const editBtn = document.getElementById('editMemberFromDetails');
      if (editBtn) {
        editBtn.style.display = canEditMembers() ? '' : 'none';
        editBtn.onclick = () => {
          closeModal('memberDetailsModal');
          editMember(id);
        };
      }
      openModal('memberDetailsModal');
      lucide.createIcons();
    }

    async function toggleMemberStatusQuick(id, newStatus) {
      if (!canEditMembers()) {
        toast('Permission Denied: Only Super Admin can change member account status.');
        return;
      }
      const m = DB.members.find(x => x.id === id);
      if (!m) return;
      const targetDbId = m.db_id || (typeof m.id === 'string' && m.id.match(/\d+$/) ? parseInt(m.id.match(/\d+$/)[0], 10) : m.id);
      const statusLower = (newStatus || 'Active').toLowerCase();

      try {
        if (targetDbId) {
          const res = await fetch(`${API_BASE}/admin/members/${targetDbId}/status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: statusLower })
          });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            toast(errData.detail || 'Failed to update member status in database');
            return;
          }
        }
        m.status = newStatus === 'Active' ? 'Active' : 'Inactive';
        toast(`✓ Member ${m.name || m.id} account is now ${m.status}`);
        if (typeof addActivity === 'function') {
          addActivity(`Admin changed member ${m.id} (${m.name}) status to ${m.status}`);
        }
        renderMembers();
        updateOverviewStats();
      } catch (err) {
        console.error('Error updating member status:', err);
        toast('Network error updating member status');
      }
    }

    let pendingMemberDeleteId = null;

    function openDeleteMemberModal(id) {
      if (!canEditMembers()) {
        toast('Permission Denied: Only Super Admin can delete member accounts.');
        return;
      }
      const m = DB.members.find(x => x.id === id);
      if (!m) {
        toast('Member not found');
        return;
      }
      pendingMemberDeleteId = id;
      const isMemberDisabled = m.status === 'Inactive' || m.status === 'Disabled';
      const inactiveFunds = new Set((DB.funds || []).filter(f => f.status === 'Inactive' || f.status === 'Disabled').map(f => f.name));
      const memContribs = (DB.contributions || []).filter(c => c.member === m.name && c.status === 'Completed' && !inactiveFunds.has(c.fund));
      const totalAmt = memContribs.reduce((sum, c) => sum + Number(c.amount || 0), 0);

      const nameEl = document.getElementById('delMemberTargetName');
      const idEl = document.getElementById('delMemberTargetId');
      const statusEl = document.getElementById('delMemberTargetStatus');
      const phoneEl = document.getElementById('delMemberTargetPhone');
      const contribsEl = document.getElementById('delMemberTargetContribs');
      const confirmBtn = document.getElementById('confirmDeleteMemberBtn');

      if (nameEl) nameEl.textContent = m.name || 'Member';
      if (idEl) idEl.textContent = m.id || '—';
      if (statusEl) {
        statusEl.textContent = m.status || 'Active';
        statusEl.className = isMemberDisabled 
          ? 'px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-800'
          : 'px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-800';
      }
      if (phoneEl) phoneEl.textContent = m.phone || '—';
      if (contribsEl) contribsEl.textContent = isMemberDisabled ? '— (Disabled)' : (money(totalAmt) + ` (${memContribs.length} txns)`);

      if (confirmBtn) {
        confirmBtn.disabled = false;
        confirmBtn.innerHTML = '<i data-lucide="archive-restore" class="w-4 h-4"></i> Move to Recycle Bin (30 Days)';
      }

      openModal('deleteMemberAccountModal');
      lucide.createIcons();
    }

    async function executePermanentMemberDeletion() {
      if (!pendingMemberDeleteId) return;
      const id = pendingMemberDeleteId;
      const m = DB.members.find(x => x.id === id);
      const confirmBtn = document.getElementById('confirmDeleteMemberBtn');

      if (confirmBtn) {
        confirmBtn.disabled = true;
        confirmBtn.innerHTML = '<span class="animate-spin mr-2">⏳</span> Moving to Recycle Bin...';
      }

      const targetDbId = m?.db_id || (typeof id === 'string' && id.match(/\d+$/) ? parseInt(id.match(/\d+$/)[0], 10) : id);

      try {
        if (targetDbId) {
          const res = await fetch(`${API_BASE}/admin/members/${targetDbId}`, { method: 'DELETE' });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            toast(errData.detail || 'Failed to move member to Recycle Bin');
            if (confirmBtn) {
              confirmBtn.disabled = false;
              confirmBtn.innerHTML = '<i data-lucide="archive-restore" class="w-4 h-4"></i> Move to Recycle Bin (30 Days)';
            }
            return;
          }
        }
      } catch (err) {
        console.error('Delete member network error:', err);
      }

      const index = DB.members.findIndex(x => x.id === id);
      if (index >= 0) {
        DB.members.splice(index, 1);
      }
      if (typeof selectedMemberIds !== 'undefined') {
        selectedMemberIds.delete(id);
      }

      closeModal('deleteMemberAccountModal');
      closeModal('memberDetailsModal');
      pendingMemberDeleteId = null;

      toast(`✓ Member moved to Recycle Bin (30-day restore guarantee)`);
      if (typeof addActivity === 'function') {
        addActivity(`Moved member ${id} (${m?.name || ''}) to Recycle Bin with 30-day retention countdown`);
      }

      renderMembers();
      updateOverviewStats();
      if (typeof fetchRecycleBinRecords === 'function') {
        fetchRecycleBinRecords();
      }
    }

    function deleteMemberPrompt(id) {
      openDeleteMemberModal(id);
    }

/* ============================================================================== */
/* SECTION 8: RECYCLE BIN & 30-DAY RETENTION RESTORE CONTROLLER                  */
/* Manages soft-deleted member & fund records, calculates 30-day countdowns,     */
/* displays time-remaining badges, and triggers one-click active database undo.   */
/* ============================================================================== */
    let recycleBinRecords = [];
    let recycleBinFilter = 'all';

    function escapeHtml(str) {
      if (!str) return '';
      return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    function openRecycleBinModal() {
      showView('recycle-bin');
    }

    function closeRecycleBinModal() {
      showView('members');
    }

    function filterRecycleBin(filterType, btn) {
      recycleBinFilter = filterType;
      const pills = document.querySelectorAll('#rbFilterPills .rb-pill');
      pills.forEach(p => {
        p.classList.remove('bg-amber-600', 'text-white', 'active');
        p.classList.add('bg-gray-100', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');
      });
      if (btn) {
        btn.classList.remove('bg-gray-100', 'dark:bg-gray-800', 'text-gray-700', 'dark:text-gray-300');
        btn.classList.add('bg-amber-600', 'text-white', 'active');
      }
      renderRecycleBinTable();
    }

    async function fetchRecycleBinRecords() {
      try {
        const res = await fetch(`${API_BASE}/admin/deleted-records`);
        if (res.ok) {
          recycleBinRecords = await res.json();
        } else {
          recycleBinRecords = [];
        }
      } catch (err) {
        console.warn('Error fetching deleted records:', err);
        recycleBinRecords = [];
      }
      updateRecycleBinBadges();
      renderRecycleBinTable();
    }

    function updateRecycleBinBadges() {
      const total = (recycleBinRecords || []).length;
      const pending = (recycleBinRecords || []).filter(r => r.can_restore).length;
      const restored = (recycleBinRecords || []).filter(r => r.status === 'Restored').length;

      const totalEl = document.getElementById('rbTotalCount');
      const pendingEl = document.getElementById('rbPendingCount');
      const restoredEl = document.getElementById('rbRestoredCount');

      if (totalEl) totalEl.textContent = total;
      if (pendingEl) pendingEl.textContent = pending;
      if (restoredEl) restoredEl.textContent = restored;
    }

    function renderRecycleBinTable() {
      const tbody = document.getElementById('recycleBinTableBody');
      if (!tbody) return;

      const q = (document.getElementById('rbSearchInput')?.value || '').toLowerCase().trim();

      let filtered = (recycleBinRecords || []).filter(r => {
        if (recycleBinFilter === 'Member') return r.record_type === 'Member';
        if (recycleBinFilter === 'Fund') return r.record_type === 'Fund';
        if (recycleBinFilter === 'Pending') return r.can_restore;
        if (recycleBinFilter === 'Restored') return r.status === 'Restored';
        return true;
      });

      if (q) {
        filtered = filtered.filter(r => {
          const name = (r.record_name || '').toLowerCase();
          const type = (r.record_type || '').toLowerCase();
          const fid = (r.formatted_id || '').toLowerCase();
          const by = (r.deleted_by || '').toLowerCase();
          const reason = (r.reason || '').toLowerCase();
          return name.includes(q) || type.includes(q) || fid.includes(q) || by.includes(q) || reason.includes(q);
        });
      }

      if (filtered.length === 0) {
        tbody.innerHTML = `
          <tr>
            <td colspan="8" class="p-8 text-center text-gray-500">
              <i data-lucide="archive" class="w-8 h-8 mx-auto mb-2 opacity-40"></i>
              <p class="font-bold text-gray-700 dark:text-gray-300">No deleted records found matching criteria</p>
              <p class="text-[11px] mt-1 text-gray-500">Records deleted within the last 30 days are retained here for 1-click restore.</p>
            </td>
          </tr>
        `;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        return;
      }

      tbody.innerHTML = filtered.map((r, idx) => {
        const isRestorable = r.can_restore;
        const isRestored = r.status === 'Restored';

        let statusBadge = '';
        if (isRestored) {
          statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-400 border border-emerald-300 dark:border-emerald-800 flex items-center gap-1 w-max"><i data-lucide="check-circle" class="w-3 h-3"></i> Restored</span>';
        } else if (isRestorable) {
          statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-amber-50 dark:bg-amber-950/80 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800 flex items-center gap-1 w-max"><i data-lucide="clock" class="w-3 h-3"></i> In Retention</span>';
        } else {
          statusBadge = '<span class="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-50 dark:bg-rose-950/80 text-rose-700 dark:text-rose-400 border border-rose-300 dark:border-rose-800 flex items-center gap-1 w-max">Expired</span>';
        }

        let retentionBadge = '';
        if (isRestored) {
          retentionBadge = `<span class="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1"><i data-lucide="check" class="w-3 h-3"></i> Restored on ${r.restored_at || '—'}</span>`;
        } else if (isRestorable) {
          retentionBadge = `
            <div class="flex flex-col gap-0.5">
              <span class="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-50 dark:bg-amber-950/70 text-amber-700 dark:text-amber-300 border border-amber-300 dark:border-amber-800/60 w-max flex items-center gap-1">
                <i data-lucide="hourglass" class="w-3 h-3"></i> ${r.days_remaining} ${r.days_remaining === 1 ? 'Day' : 'Days'} Left
              </span>
              <span class="text-[10px] text-gray-500 font-mono">Expires: ${r.expires_at || '—'}</span>
            </div>
          `;
        } else {
          retentionBadge = `<span class="text-gray-500 font-medium text-[11px]">30-Day Window Ended</span>`;
        }

        let actionHtml = '';
        if (isRestorable) {
          actionHtml = `
            <button onclick="restoreRecycleRecord(${r.id})" class="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center gap-1.5 cursor-pointer transition shadow-md hover:shadow-emerald-900/30 ml-auto">
              <i data-lucide="rotate-ccw" class="w-3.5 h-3.5"></i> Undo / Restore
            </button>
          `;
        } else if (isRestored) {
          actionHtml = `
            <span class="text-emerald-600 dark:text-emerald-400 font-bold text-xs flex items-center gap-1 justify-end">
              <i data-lucide="check-check" class="w-4 h-4"></i> Restored Back
            </span>
          `;
        } else {
          actionHtml = `<span class="text-gray-500 text-xs italic">Permanently Purged</span>`;
        }

        const typeBadge = r.record_type === 'Member'
          ? '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-50 dark:bg-purple-950/80 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800">Member</span>'
          : '<span class="px-2 py-0.5 rounded text-[11px] font-bold bg-blue-50 dark:bg-blue-950/80 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800">Fund</span>';

        return `
          <tr class="hover:bg-gray-50 dark:hover:bg-gray-800/40 transition">
            <td class="p-3.5 text-gray-500 font-bold">${idx + 1}</td>
            <td class="p-3.5">
              <div class="font-extrabold text-gray-900 dark:text-white text-[13px]">${escapeHtml(r.record_name || 'Record')}</div>
              <div class="text-[11px] text-amber-600 dark:text-amber-400 font-mono font-bold mt-0.5">${escapeHtml(r.formatted_id)}</div>
            </td>
            <td class="p-3.5">${typeBadge}</td>
            <td class="p-3.5">
              <div class="font-semibold text-gray-800 dark:text-gray-200 text-xs">${escapeHtml(r.deleted_by || 'Admin')}</div>
              <div class="text-[11px] text-gray-500 dark:text-gray-400 italic mt-0.5">${escapeHtml(r.reason || 'Deletion requested')}</div>
            </td>
            <td class="p-3.5 text-[11px] text-gray-500 dark:text-gray-400 whitespace-nowrap">${r.deleted_at || '—'}</td>
            <td class="p-3.5">${retentionBadge}</td>
            <td class="p-3.5">${statusBadge}</td>
            <td class="p-3.5 text-right">${actionHtml}</td>
          </tr>
        `;
      }).join('');

      if (typeof lucide !== 'undefined') lucide.createIcons();
    }

    async function restoreRecycleRecord(recordId) {
      if (!canEditMembers()) {
        toast('Permission Denied: Only Super Admin and Admin can restore records.');
        return;
      }
      const rec = (recycleBinRecords || []).find(r => r.id === recordId);
      const recName = rec ? rec.record_name : 'record';

      if (!confirm(`Are you sure you want to restore ${recName} back to the active database? All member details, login access, and contribution history will be reinstated immediately.`)) {
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/admin/deleted-records/${recordId}/restore`, {
          method: 'POST'
        });
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          toast(data.message || `✓ ${recName} successfully restored back to active database!`);
          await fetchRecycleBinRecords();
          await loadAdminDataFromBackend();
        } else {
          toast(data.detail || 'Failed to restore record');
        }
      } catch (err) {
        console.error('Error restoring record:', err);
        toast('Network error restoring record');
      }
    }

    window.openRecycleBinModal = openRecycleBinModal;
    window.closeRecycleBinModal = closeRecycleBinModal;
    window.filterRecycleBin = filterRecycleBin;
    window.fetchRecycleBinRecords = fetchRecycleBinRecords;
    window.renderRecycleBinTable = renderRecycleBinTable;
    window.restoreRecycleRecord = restoreRecycleRecord;


/* ============================================================================== */
/* SECTION 3: OVERVIEW TAB (TAB #1) — REAL-TIME KPIS & FINANCIAL ANALYTICS       */
/* Synchronizes financial year filters, calculates overall collection, usage,   */
/* and balance totals, and updates dashboard summary cards.                      */
/* ============================================================================== */

    function syncFundYearFilter(year) {
      const globalSel = document.getElementById('yearGlobal');
      const fundSel = document.getElementById('fundYearSelect');
      if (globalSel && globalSel.value !== year) globalSel.value = year;
      if (fundSel && fundSel.value !== year) fundSel.value = year;
      updateOverviewStats();
      drawChart();
      renderFundManagement();
    }

    function updateOverviewStats() {
      const selectedYear = document.getElementById('yearGlobal')?.value || 
                           document.getElementById('fundYearSelect')?.value || 
                           '2026 - 2027';

      const allFunds = Array.isArray(DB.funds) ? DB.funds : [];
      let yearFunds = allFunds.filter(f => f.year === selectedYear);
      if (yearFunds.length === 0 && allFunds.length > 0) {
        yearFunds = allFunds;
      }

      let totalCollected = 0;
      let totalUsed = 0;
      yearFunds.forEach(f => {
        totalCollected += Number(f.collected) || 0;
        totalUsed += Number(f.used) || 0;
      });
      const currentBalance = Math.max(0, totalCollected - totalUsed);

      const members = Array.isArray(DB.members) ? DB.members : [];
      const totalMembers = members.length;
      const activeMembers = members.filter(m => m.status === 'Active').length;

      const elMembers = document.getElementById('kMembers');
      const elMembersSub = document.getElementById('kMembersSub');
      const elCollected = document.getElementById('kOverviewCollected');
      const elCollectedSub = document.getElementById('kOverviewCollectedSub');
      const elUsed = document.getElementById('kOverviewUsed');
      const elUsedSub = document.getElementById('kOverviewUsedSub');
      const elBalance = document.getElementById('kOverviewBalance');
      const elBalanceSub = document.getElementById('kOverviewBalanceSub');

      if (elMembers) elMembers.textContent = totalMembers;
      if (elMembersSub) elMembersSub.textContent = `${activeMembers} active member${activeMembers === 1 ? '' : 's'}`;

      if (elCollected) elCollected.textContent = money(totalCollected);
      if (elCollectedSub) elCollectedSub.textContent = `In FY ${selectedYear} (${yearFunds.length} fund${yearFunds.length === 1 ? '' : 's'})`;

      if (elUsed) elUsed.textContent = money(totalUsed);
      if (elUsedSub) {
        const usageCount = (Array.isArray(DB.fundUsage) ? DB.fundUsage : []).length;
        elUsedSub.textContent = usageCount > 0 ? `${usageCount} recorded expense${usageCount === 1 ? '' : 's'}` : 'From recorded usages';
      }

      if (elBalance) elBalance.textContent = money(currentBalance);
      if (elBalanceSub) elBalanceSub.textContent = 'Active available balance';
    }

    async function syncFundsWithBackend() {
      try {
        const res = await fetch(`${API_BASE}/funds`);
        if (res.ok) {
          const fundsRes = await res.json();
          if (Array.isArray(fundsRes) && fundsRes.length > 0) {
            DB.funds = fundsRes.map(f => ({
              id: 'F' + String(f.id).padStart(3, '0'),
              db_id: f.id,
              year: f.financial_year,
              name: f.name,
              target: f.target_amount,
              collected: f.collected_amount,
              used: f.used_amount,
              status: f.status
            }));
          }
        }
      } catch (err) {
        console.warn('Sync funds error:', err);
      }
      updateOverviewStats();
      drawChart();
      renderFundManagement();
    }

/* ============================================================================== */
/* SECTION 5: FUNDS TAB (TAB #3) — ALLOCATION, TARGET TRACKING & EXPENDITURES    */
/* Renders fund categories (Youth, Village, General), target amounts, raised     */
/* amounts, balance progress bars, and Donut distribution charts.                */
/* ============================================================================== */

    function isPermanentFund(name) {
      const n = (name || '').toLowerCase().trim();
      return n === 'youth fund' || n === 'village fund' || n === 'village' || n === 'general fund';
    }

    function renderFundManagement() {
      renderFundUsage();
      const selectedYear = document.getElementById('fundYearSelect')?.value || document.getElementById('yearGlobal')?.value || '2026 - 2027';
      const searchTerm = (document.getElementById('fundSearchInput')?.value || '').toLowerCase();
      const categoryFilter = document.getElementById('fundCategoryFilter')?.value || 'All';

      const yearFunds = DB.funds.filter(f => f.year === selectedYear);

      const activeYearFunds = yearFunds.filter(f => f.status === 'Active');
      let totalCollected = 0;
      let totalUsed = 0;
      let totalTarget = 0;
      activeYearFunds.forEach(f => {
        totalCollected += Number(f.collected) || 0;
        totalUsed += Number(f.used) || 0;
        totalTarget += Number(f.target) || 0;
      });
      const currentBalance = Math.max(0, totalCollected - totalUsed);
      const activeCount = activeYearFunds.length;

      if (document.getElementById('kpiCollected')) document.getElementById('kpiCollected').textContent = money(totalCollected);
      if (document.getElementById('kpiUsed')) document.getElementById('kpiUsed').textContent = money(totalUsed);
      if (document.getElementById('kpiBalance')) document.getElementById('kpiBalance').textContent = money(currentBalance);
      if (document.getElementById('kpiActiveFunds')) document.getElementById('kpiActiveFunds').textContent = activeCount;

      updateOverviewStats();

      const filteredTableFunds = yearFunds.filter(f => {
        const matchSearch = f.name.toLowerCase().includes(searchTerm);
        const matchCat = (categoryFilter === 'All' || f.name === categoryFilter);
        return matchSearch && matchCat;
      });

      const tbody = document.getElementById('fundsTableBody');
      if (tbody) {
        if (filteredTableFunds.length === 0) {
          tbody.innerHTML = `<tr><td colspan="9" class="p-6 text-center text-gray-500">No funds found matching your criteria for FY ${selectedYear}.</td></tr>`;
        } else {
          tbody.innerHTML = filteredTableFunds.map((f, index) => {
            const isInactive = f.status === 'Inactive' || f.status === 'Disabled';
            const balance = Math.max(0, (f.collected || 0) - (f.used || 0));
            const progress = (!isInactive && f.target > 0) ? Math.min(100, Math.round((f.collected / f.target) * 100)) : 0;
            const isPerm = isPermanentFund(f.name);
            return `
          <tr class="border-b dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/40 transition ${isInactive ? 'opacity-75 bg-rose-50/10' : ''}">
            <td class="p-3.5 font-bold text-gray-400">#${index + 1}</td>
            <td class="p-3.5 font-extrabold">${f.name}</td>
            <td class="p-3.5">${money(f.target)}</td>
            <td class="p-3.5 font-bold">${isInactive ? '<span class="text-gray-400 font-bold">— <span class="text-[10px] text-rose-500 font-semibold">(Disabled)</span></span>' : `<span class="text-emerald-600 dark:text-emerald-400">${money(f.collected)}</span>`}</td>
            <td class="p-3.5 font-bold">${isInactive ? '<span class="text-gray-400 font-bold">—</span>' : `<span class="text-rose-600 dark:text-rose-400">${money(f.used)}</span>`}</td>
            <td class="p-3.5 font-bold">${isInactive ? '<span class="text-gray-400 font-bold">—</span>' : `<span class="text-sky-600 dark:text-sky-400">${money(balance)}</span>`}</td>
            <td class="p-3.5">
              <div class="flex items-center gap-2">
                <div class="flex-1 h-2 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                  <div class="h-full ${isInactive ? 'bg-gray-300 dark:bg-gray-700' : 'bg-amber-500'} rounded-full" style="width: ${progress}%"></div>
                </div>
                <span class="text-xs font-bold text-gray-500 w-9 text-right">${progress}%</span>
              </div>
            </td>
            <td class="p-3.5">${badge(f.status)}</td>
            <td class="p-3.5 text-right">
              <div class="flex items-center justify-end gap-1">
                ${canEditFunds() ? `
                  <button onclick="editFundRecord('${f.id}')" class="px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 font-bold text-xs hover:bg-amber-100 transition cursor-pointer" title="Edit Fund">Edit</button>
                  ${!isPerm ? `<button onclick="requestDelete('funds','${f.id}')" class="delete-action" title="Delete Fund"><i data-lucide="trash-2"></i><span>Delete</span></button>` : ''}
                ` : `
                  <span class="text-[11px] font-bold text-gray-400 dark:text-gray-500 px-2">View Only</span>
                `}
              </div>
            </td>
          </tr>
        `;
          }).join('');
        }
      }

      let sumTarget = 0, sumCollected = 0, sumUsed = 0, sumBalance = 0;
      filteredTableFunds.forEach(f => {
        sumTarget += Number(f.target) || 0;
        sumCollected += Number(f.collected) || 0;
        sumUsed += Number(f.used) || 0;
        sumBalance += Math.max(0, (f.collected || 0) - (f.used || 0));
      });
      if (document.getElementById('summaryTotalTarget')) document.getElementById('summaryTotalTarget').textContent = money(sumTarget);
      if (document.getElementById('summaryTotalCollected')) document.getElementById('summaryTotalCollected').textContent = money(sumCollected);
      if (document.getElementById('summaryTotalUsed')) document.getElementById('summaryTotalUsed').textContent = money(sumUsed);
      if (document.getElementById('summaryTotalBalance')) document.getElementById('summaryTotalBalance').textContent = money(sumBalance);

      renderAdminFundTypes(yearFunds);
      renderFundsDonutChart(yearFunds, totalCollected);
      lucide.createIcons();
    }

    function renderAdminFundTypes(yearFunds) {
      const grid = document.getElementById('adminFundTypesGrid');
      if (!grid) return;
      if (yearFunds && yearFunds.length > 0) {
        grid.innerHTML = yearFunds.map(f => {
          const col = Number(f.collected || 0);
          const usd = Number(f.used || 0);
          const bal = Math.max(0, col - usd);
          const isInactive = f.status === 'Inactive';
          return `
          <div class="bg-white dark:bg-gray-900 p-5 rounded-2xl shadow-sm border border-gray-200 dark:border-gray-800 space-y-2 hover:border-amber-500/50 transition ${isInactive ? 'opacity-80 border-dashed border-rose-300 dark:border-rose-900/50 bg-rose-50/10' : ''}">
              <div class="flex items-center justify-between">
                <h4 class="font-extrabold ${isInactive ? 'text-gray-500 dark:text-gray-400' : 'text-amber-700 dark:text-amber-400'} text-sm">${f.name}</h4>
                <span class="text-[11px] font-bold px-2 py-0.5 rounded-full ${!isInactive ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600' : 'bg-rose-50 dark:bg-rose-950/60 text-rose-600 border border-rose-200 dark:border-rose-900/50'}">${f.status || 'Active'}</span>
              </div>
              <div class="text-xs space-y-1.5 pt-2 border-t border-gray-100 dark:border-gray-800">
                  <div class="flex justify-between"><span class="text-gray-500">Collected:</span> ${isInactive ? '<strong class="text-gray-400 dark:text-gray-500 font-bold">— <span class="text-[10px] text-rose-500 font-semibold">(Disabled)</span></strong>' : `<strong class="text-gray-900 dark:text-white font-extrabold">${money(col)}</strong>`}</div>
                  <div class="flex justify-between"><span class="text-gray-500">Used:</span> ${isInactive ? '<strong class="text-gray-400 dark:text-gray-500 font-bold">—</strong>' : `<strong class="text-rose-600 font-extrabold">${money(usd)}</strong>`}</div>
                  <div class="flex justify-between"><span class="text-gray-500">Balance:</span> ${isInactive ? '<strong class="text-gray-400 dark:text-gray-500 font-bold">—</strong>' : `<strong class="text-emerald-600 font-extrabold">${money(bal)}</strong>`}</div>
              </div>
          </div>
          `;
        }).join('');
      } else {
        grid.innerHTML = `<div class="col-span-full py-8 text-center text-gray-400 font-bold bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">No fund categories configured yet.</div>`;
      }
    }

    function renderFundsDonutChart(yearFunds, totalCollected) {
      const el = document.getElementById('fundsDonutChart');
      const legendEl = document.getElementById('fundDistLegend');
      const totalLabelEl = document.getElementById('totalDistLabel');
      
      const activeFundsList = (yearFunds || []).filter(f => f.status !== 'Inactive' && f.status !== 'Disabled');
      const activeTotalCollected = activeFundsList.reduce((s, f) => s + Number(f.collected || 0), 0);
      if (totalLabelEl) totalLabelEl.textContent = 'Total: ' + money(activeTotalCollected);
      if (!el || !legendEl) return;

      if (donutChartInstance) {
        donutChartInstance.destroy();
        donutChartInstance = null;
      }
      const colors = ['#f59e0b', '#6366f1', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'];

      const labels = (yearFunds || []).map(f => f.name + (f.status === 'Inactive' ? ' (Disabled)' : ''));
      const data = (yearFunds || []).map(f => (f.status === 'Inactive' || f.status === 'Disabled') ? 0 : Number(f.collected || 0));
      const chartColors = (yearFunds || []).map((f, i) => (f.status === 'Inactive' || f.status === 'Disabled') ? '#9ca3af' : colors[i % colors.length]);

      const hasData = data.some(v => v > 0);
      donutChartInstance = new Chart(el, {
        type: 'doughnut',
        data: {
          labels: hasData ? labels : ['No Data'],
          datasets: [{
            data: hasData ? data : [1],
            backgroundColor: hasData ? chartColors : ['#9ca3af'],
            borderWidth: 0
          }]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: { legend: { display: false } },
          cutout: '75%'
        }
      });

      legendEl.innerHTML = (yearFunds || []).map((f, idx) => {
        const isInactive = f.status === 'Inactive' || f.status === 'Disabled';
        const pct = (!isInactive && activeTotalCollected > 0) ? Math.round((Number(f.collected || 0) / activeTotalCollected) * 100) : 0;
        const color = isInactive ? '#9ca3af' : colors[idx % colors.length];
        return `
      <div class="flex justify-between items-center p-3 rounded-xl border transition ${isInactive ? 'bg-gray-100/70 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 opacity-60' : 'bg-gray-50 dark:bg-gray-950/50 border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'}">
        <div class="flex items-center gap-3">
            <span class="w-3 h-3 rounded-full shrink-0" style="background:${color}; box-shadow: 0 0 8px ${color}60;"></span>
            <div class="flex items-center gap-2">
              <span class="font-bold text-sm ${isInactive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}">${f.name}</span>
              ${isInactive ? '<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">Disabled</span>' : ''}
            </div>
        </div>
        <div class="text-right">
            ${isInactive ? '<span class="block font-bold text-gray-400 dark:text-gray-500 text-sm">—</span><span class="text-xs text-rose-500 font-bold">Disabled</span>' : `<span class="block font-extrabold text-gray-900 dark:text-white">${money(f.collected)}</span><span class="text-xs text-gray-500 font-bold">${pct}%</span>`}
        </div>
      </div>
    `;
      }).join('');
    }

    function openAddFundModal() {
      if (!canEditFunds()) {
        toast('Permission Denied: General Admin cannot add funds.');
        return;
      }
      document.getElementById('manageFundModalTitle').textContent = 'Add New Fund';
      const currentGlobalYear = document.getElementById('fundYearSelect')?.value || '2026 - 2027';
      const mYearEl = document.getElementById('mFundYear');
      if (mYearEl) mYearEl.value = currentGlobalYear;
      const mNameEl = document.getElementById('mFundName');
      mNameEl.value = '';
      mNameEl.readOnly = false;
      mNameEl.classList.remove('bg-gray-100', 'dark:bg-gray-800', 'cursor-not-allowed');
      mNameEl.removeAttribute('title');
      document.getElementById('mFundTarget').value = '';
      document.getElementById('mFundStatus').value = 'Active';
      delete document.getElementById('saveFundBtn').dataset.editId;
      openModal('manageFundModal');
    }

    function editFundRecord(id) {
      if (!canEditFunds()) {
        toast('Permission Denied: General Admin cannot edit funds.');
        return;
      }
      const f = DB.funds.find(x => x.id === id);
      if (!f) return;
      document.getElementById('manageFundModalTitle').textContent = 'Edit Fund';
      const mYearEl = document.getElementById('mFundYear');
      if (mYearEl) mYearEl.value = f.year;
      const mNameEl = document.getElementById('mFundName');
      mNameEl.value = f.name;
      const isPerm = isPermanentFund(f.name);
      mNameEl.readOnly = isPerm;
      if (isPerm) {
        mNameEl.classList.add('bg-gray-100', 'dark:bg-gray-800', 'cursor-not-allowed');
        mNameEl.title = 'Permanent fund name cannot be changed';
      } else {
        mNameEl.classList.remove('bg-gray-100', 'dark:bg-gray-800', 'cursor-not-allowed');
        mNameEl.removeAttribute('title');
      }
      document.getElementById('mFundTarget').value = f.target;
      document.getElementById('mFundStatus').value = f.status;
      document.getElementById('saveFundBtn').dataset.editId = id;
      openModal('manageFundModal');
    }

    function deleteFundRecord(id) {
      const f = DB.funds.find(x => x.id === id);
      if (f && isPermanentFund(f.name)) {
        toast('Permanent funds (Youth Fund, Village Fund, General Fund) cannot be deleted.');
        return;
      }
      requestDelete('funds', id);
    }

    function saveFundRecord() {
      const editId = document.getElementById('saveFundBtn').dataset.editId;
      const year = document.getElementById('mFundYear')?.value || document.getElementById('fundYearSelect')?.value || '2026 - 2027';
      const name = document.getElementById('mFundName').value.trim() || 'New Fund';
      const target = Number(document.getElementById('mFundTarget').value) || 0;
      const status = document.getElementById('mFundStatus').value;

      if (editId) {
        const f = DB.funds.find(x => x.id === editId);
        if (f) {
          f.year = year;
          f.name = name;
          f.target = target;
          f.status = status;
          toast('Fund updated successfully');
          addActivity('Updated fund ' + name);

          if (f.db_id) {
            fetch(`${API_BASE}/funds/${f.db_id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ name, target_amount: target, status, financial_year: year })
            }).catch(e => console.warn('Fund update error:', e));
          }
        }
      } else {
        const fundNumbers = DB.funds.map(f => parseInt(String(f.id).replace(/\D/g, ''), 10) || 0);
        const newId = 'F' + String(Math.max(0, ...fundNumbers) + 1).padStart(3, '0');
        const newFundObj = { id: newId, year, name, target, collected: 0, used: 0, status };
        DB.funds.push(newFundObj);
        toast('New fund added successfully');
        addActivity('Added fund ' + name);

        fetch(`${API_BASE}/funds`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name, target_amount: target, status, financial_year: year })
        }).then(r => r.json()).then(res => {
          if (res.fund_id) newFundObj.db_id = res.fund_id;
        }).catch(e => console.warn('Fund create error:', e));
      }
      closeModal('manageFundModal');
      renderFundManagement();
      updateOverviewStats();
      drawChart();
      // Keep Add Fund Usage synchronized with newly added/renamed funds.
      populateFundUsageTypes();
    }

    function parseContributionDate(dateText) {
      if (!dateText) return null;
      const parts = String(dateText).trim().split(' ');
      if (parts.length === 3 && isNaN(new Date(dateText).getTime())) {
        const months = { Jan: 0, Feb: 1, Mar: 2, Apr: 3, May: 4, Jun: 5, Jul: 6, Aug: 7, Sep: 8, Oct: 9, Nov: 10, Dec: 11 };
        const day = parseInt(parts[0], 10);
        const month = months[parts[1]];
        const year = parseInt(parts[2], 10);
        if (!isNaN(day) && month !== undefined && !isNaN(year)) {
          return new Date(year, month, day);
        }
      }
      const d = new Date(dateText);
      return Number.isNaN(d.getTime()) ? null : d;
    }

    function formatDateForInput(dateText) {
      const d = parseContributionDate(dateText);
      if (!d) return new Date().toISOString().split('T')[0];
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${y}-${m}-${day}`;
    }

    function formatDateForDisplay(dateInputVal) {
      if (!dateInputVal) return new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      const parts = dateInputVal.split('-');
      if (parts.length === 3) {
        const d = new Date(parts[0], parts[1] - 1, parts[2]);
        if (!isNaN(d.getTime())) {
          return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
        }
      }
      return dateInputVal;
    }

    function contributionBelongsToYear(c, year) {
      const d = parseContributionDate(c.date);
      if (!d) return false;
      const parts = String(year).split('-').map(x => parseInt(x.trim(), 10));
      const startYear = parts[0];
      const endYear = parts[1] || startYear + 1;
      const start = new Date(startYear, 3, 1);
      const end = new Date(endYear, 2, 31, 23, 59, 59);
      return d >= start && d <= end;
    }

    function getMemberIdByName(name) {
      return DB.members.find(m => m.name === name)?.id || '';
    }

    function getFinancialYearForDate(dateText) {
      const d = parseContributionDate(dateText);
      if (!d) return '—';
      const y = d.getFullYear(), m = d.getMonth();
      return m >= 3 ? `${y} - ${y + 1}` : `${y - 1} - ${y}`;
    }

    function editContribution(id) {
      if (!canEditReceipts()) {
        toast('Permission Denied: General Admin cannot modify contributions.');
        return;
      }
      const c = DB.contributions.find(x => x.id === id);
      if (!c) return;
      document.getElementById('contribModalHead').innerHTML = '<div class="flex justify-between items-center mb-5"><h2 class="text-xl font-extrabold">Edit Contribution</h2><button data-close="contributionModal" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"><i data-lucide="x"></i></button></div>';
      document.getElementById('cMemberId').value = getMemberIdByName(c.member) || '';
      document.getElementById('cAmount').value = c.amount || 0;
      document.getElementById('cFund').value = c.fund || 'Youth Fund';
      document.getElementById('cMethod').value = c.method || 'UPI';

      const refContainer = document.getElementById('cRefContainer');
      const refInput = document.getElementById('cRef');
      if (c.method === 'Cash') {
        refContainer.style.display = 'none';
        refInput.value = '';
      } else {
        refContainer.style.display = 'block';
        refInput.value = c.ref || '';
      }

      document.getElementById('cDate').value = formatDateForInput(c.date);
      document.getElementById('cStatus').value = c.status || 'Pending';
      document.getElementById('saveContribution').dataset.edit = c.id;
      document.getElementById('saveContribution').textContent = 'Save Changes';
      openModal('contributionModal');
      lucide.createIcons();
    }

/* ============================================================================== */
/* SECTION 6: RECEIPTS TAB (TAB #4) — VOUCHERS, STATUS VERIFICATION & EXPORT    */
/* Manages community contribution receipts, builds printable/PDF vouchers,       */
/* provides status verification (Completed/Pending/Rejected), and CSV exports.  */
/* ============================================================================== */

    function pbkEscape(v) { return String(v ?? '').replace(/[&<>'"]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[m])); }
    function pbkMemberForContribution(c) { return DB.members.find(m => m.name === c.member) || {}; }
    function pbkAmountWords(n) {
      const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
      const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
      n = Math.floor(Number(n) || 0);
      function two(x) { return x < 20 ? ones[x] : tens[Math.floor(x / 10)] + (x % 10 ? ' ' + ones[x % 10] : ''); }
      function three(x) { return x < 100 ? two(x) : ones[Math.floor(x / 100)] + ' Hundred' + (x % 100 ? ' ' + two(x % 100) : ''); }
      if (n === 0) return 'Zero';
      let s = ''; const cr = Math.floor(n / 10000000); n %= 10000000; const lk = Math.floor(n / 100000); n %= 100000; const th = Math.floor(n / 1000); n %= 1000;
      if (cr) s += three(cr) + ' Crore ';
      if (lk) s += three(lk) + ' Lakh ';
      if (th) s += three(th) + ' Thousand ';
      if (n) s += three(n);
      return s.trim() + ' Only';
    }
    function pbkReceiptDateParts(dateStr) {
      const d = new Date(dateStr);
      if (Number.isNaN(d.getTime())) return { date: dateStr, time: '10:30 AM' };
      return { date: d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }), time: '10:30 AM' };
    }

    function pbkBuildReceipt(c) {
      const m = pbkMemberForContribution(c); const p = pbkReceiptDateParts(c.date);
      const verified = c.status === 'Completed';
      const receiptId = c.id;
      const verifiedOn = verified ? c.date + ', 11:15 AM' : (c.status === 'Rejected' ? 'Rejected by Administrator' : 'Pending Verification');
      return `<div class="pbk-receipt-sheet" id="pbkReceiptSheet">
    <div class="pbk-r-head">
      <img class="pbk-r-logo" src="${PBK_RECEIPT_LOGO}" alt="PBK Community logo">
      <div class="pbk-r-brand">
        <div class="pbk-r-brand-line"></div><div class="pbk-r-brand-crown">♛</div>
        <div class="pbk-r-brand-title">PBK COMMUNITY</div>
        <div class="pbk-r-motto">PEOPLE &nbsp; | &nbsp; BELIEVE &nbsp; | &nbsp; KINDNESS</div>
        <div class="pbk-r-fund">COMMUNITY CHANDA FUND</div>
        <div class="pbk-r-tag">TOGETHER FOR A STRONGER COMMUNITY</div>
      </div>
      <div class="pbk-r-contact">
        <div class="pbk-r-contact-row"><span class="pbk-r-contact-icon">●</span><div><strong>PBK Community</strong><br>Community Fund Initiative</div></div>
        <div class="pbk-r-contact-row"><span class="pbk-r-contact-icon">✉</span><div>support@pbkcommunity.org</div></div>
        <div class="pbk-r-contact-row"><span class="pbk-r-contact-icon">◎</span><div>www.pbkcommunity.org</div></div>
        <div class="pbk-r-contact-row"><span class="pbk-r-contact-icon">♟</span><div>People | Believe | Kindness</div></div>
      </div>
    </div>
    <div class="pbk-r-title"><div class="pbk-r-title-main">DONATION RECEIPT</div><div class="pbk-r-title-sub">THANK YOU FOR YOUR GENEROUS CONTRIBUTION</div></div>
    <div class="pbk-r-info">
      <div class="pbk-r-info-card"><div class="pbk-r-info-icon">▣</div><div><div class="pbk-r-label">Receipt No.</div><div class="pbk-r-value">${pbkEscape(receiptId)}</div></div></div>
      <div class="pbk-r-info-card"><div class="pbk-r-info-icon">▣</div><div><div class="pbk-r-label">Date of Issue</div><div class="pbk-r-date">${pbkEscape(p.date)}</div><div class="pbk-r-small">${pbkEscape(p.time)}</div></div></div>
    </div>
    <div class="pbk-r-member">
      <div class="pbk-r-member-left"><div class="pbk-r-avatar">●</div><div><div class="pbk-r-member-title">Member / Donor Details</div><div class="pbk-r-name">${pbkEscape(m.name || c.member)}</div><div class="pbk-r-lines">PBK ID &nbsp; : &nbsp; ${pbkEscape(m.id || '—')}<br>Phone &nbsp;&nbsp; : &nbsp; ${pbkEscape(m.phone || '—')}<br>Email &nbsp;&nbsp;&nbsp; : &nbsp; ${pbkEscape(m.email || '—')}</div></div></div>
      <div class="pbk-r-member-right">Date of Birth &nbsp; : &nbsp; ${pbkEscape(m.dob || '—')}<br>Gender &nbsp;&nbsp;&nbsp;&nbsp;&nbsp; : &nbsp; ${pbkEscape(m.gender || '—')}<br>Address &nbsp;&nbsp;&nbsp;&nbsp; : &nbsp; PBK Community Member<br>Member Type &nbsp; : &nbsp; ${pbkEscape(m.memberType || 'General')}</div>
    </div>
    <div class="pbk-r-details">
      <div class="pbk-r-details-head">▥ &nbsp; Contribution Details</div>
      <div class="pbk-r-details-row"><div class="pbk-r-details-label">Transaction ID</div><div class="pbk-r-details-value">${pbkEscape(c.id)}</div></div>
      <div class="pbk-r-details-row"><div class="pbk-r-details-label">Fund Name</div><div class="pbk-r-details-value pbk-r-fund-name">${pbkEscape(c.fund)}</div></div>
      <div class="pbk-r-details-row"><div class="pbk-r-details-label">Contribution Amount</div><div class="pbk-r-details-value pbk-r-amount">${money(c.amount)}</div></div>
      <div class="pbk-r-details-row"><div class="pbk-r-details-label">Amount in Words</div><div class="pbk-r-details-value">Rupees ${pbkEscape(pbkAmountWords(c.amount))}</div></div>
      <div class="pbk-r-details-row"><div class="pbk-r-details-label">Payment Method</div><div class="pbk-r-details-value">${pbkEscape(c.method)}</div></div>
      <div class="pbk-r-details-row"><div class="pbk-r-details-label">Transaction / Reference ID</div><div class="pbk-r-details-value">${pbkEscape(c.ref || '—')}</div></div>
      <div class="pbk-r-details-row"><div class="pbk-r-details-label">Transaction Date</div><div class="pbk-r-details-value">${pbkEscape(c.date)}, 10:30 AM</div></div>
      <div class="pbk-r-details-row"><div class="pbk-r-details-label">Receipt Status</div><div class="pbk-r-details-value"><span class="pbk-r-status">● &nbsp;${verified ? 'Verified / Completed' : (c.status === 'Rejected' ? 'Rejected' : 'Pending Verification')}</span></div></div>
      <div class="pbk-r-details-row"><div class="pbk-r-details-label">Verified On</div><div class="pbk-r-details-value">${pbkEscape(verifiedOn)}</div></div>
      <div class="pbk-r-details-row"><div class="pbk-r-details-label">Verified By</div><div class="pbk-r-details-value">${verified ? 'Administrator (Super Admin)' : (c.status === 'Rejected' ? 'Administrator (Rejected)' : 'Pending Verification')}</div></div>
    </div>
    <div class="pbk-r-footer">
      <div class="pbk-r-thanks"><div class="pbk-r-thanks-script">Thank You!</div><div class="pbk-r-thanks-text">“Your contribution helps us build<br>a stronger and brighter community.”</div></div>
      <div class="pbk-r-seal"><img src="${PBK_RECEIPT_SEAL}" alt="PBK official receipt seal"></div>
      <div class="pbk-r-sign"><div class="pbk-r-sign-script">Authorized</div><div class="pbk-r-sign-line"></div><strong>Authorized Signature</strong><div>PBK Community<br>Admin Team</div></div>
    </div>
    <div class="pbk-r-bottom">PEOPLE &nbsp; | &nbsp; BELIEVE &nbsp; | &nbsp; KINDNESS</div>
  </div>`;
    }
    function pbkOpenReceiptPreview(id) {
      const c = DB.contributions.find(x => x.id === id); if (!c) return;
      pbkActiveReceiptId = id;
      const root = document.getElementById('pbkReceiptPrintRoot'); if (!root) return;
      root.innerHTML = pbkBuildReceipt(c);
      document.getElementById('pbkReceiptModal')?.classList.add('open');
      document.getElementById('pbkReceiptModal')?.setAttribute('aria-hidden', 'false');
    }
    function pbkCloseReceiptPreview() { document.getElementById('pbkReceiptModal')?.classList.remove('open'); document.getElementById('pbkReceiptModal')?.setAttribute('aria-hidden', 'true'); }
    function pbkPrintReceipt() {
      if (!pbkActiveReceiptId) return;
      document.body.classList.add('receipt-printing');
      setTimeout(() => window.print(), 60);
      window.onafterprint = () => document.body.classList.remove('receipt-printing');
    }
    function pbkFormatReceiptReference(ref) {
      if (ref === null || ref === undefined) return '—';
      const value = String(ref).trim();
      if (!value) return '—';
      return value.replace(/^(?:UTR|UPI)\s*/i, '').trim() || '—';
    }

    function renderReceipts() {
      const page = document.getElementById('view-receipts'); if (!page) return;

      const all = Array.isArray(DB.contributions) ? DB.contributions : [];
      const completed = all.filter(c => c.status === 'Completed').length;
      const pending = all.filter(c => c.status === 'Pending').length;
      const rejected = all.filter(c => c.status === 'Rejected').length;

      const totalDisplay = all.length;
      const verifiedDisplay = completed;
      const pendingDisplay = pending;
      const rejectedDisplay = rejected;
      const totalForPct = Math.max(1, totalDisplay);

      const pct = n => ((n / totalForPct) * 100).toFixed(1) + '%';
      const set = (id, val) => { const e = document.getElementById(id); if (e) e.textContent = val };
      set('receiptTotalCount', totalDisplay);
      set('receiptVerifiedCount', verifiedDisplay);
      set('receiptPendingCount', pendingDisplay);
      set('receiptRejectedCount', rejectedDisplay);
      set('receiptVerifiedPct', pct(verifiedDisplay) + ' of total');
      set('receiptPendingPct', pct(pendingDisplay) + ' of total');
      set('receiptRejectedPct', pct(rejectedDisplay) + ' of total');
      set('pbkStatusVerifiedPct', pct(verifiedDisplay)); set('pbkStatusVerifiedCount', verifiedDisplay);
      set('pbkStatusPendingPct', pct(pendingDisplay)); set('pbkStatusPendingCount', pendingDisplay);
      set('pbkStatusRejectedPct', pct(rejectedDisplay)); set('pbkStatusRejectedCount', rejectedDisplay);
      set('pbkPendingBannerCount', pendingDisplay);

      const yearTop = document.getElementById('pbkReceiptYearTop');
      const yearFilter = document.getElementById('pbkReceiptYearFilter');
      if (yearTop && yearFilter) { yearTop.value = yearFilter.value; yearTop.onchange = () => { yearFilter.value = yearTop.value; currentReceiptPage = 1; renderReceipts() }; }

      const search = document.getElementById('pbkReceiptSearch');
      if (search) { search.oninput = () => { currentReceiptPage = 1; renderReceipts(); }; }

      const status = document.getElementById('pbkReceiptStatusFilter');
      const method = document.getElementById('pbkReceiptMethodFilter');
      const fund = document.getElementById('pbkReceiptFundFilter');
      if (fund && Array.isArray(DB.funds) && DB.funds.length > 0) {
        const curFundVal = fund.value || 'All Funds';
        const fundNames = Array.from(new Set(DB.funds.map(f => f.name).filter(Boolean)));
        ['Youth Fund', 'Village Fund', 'General Fund'].forEach(df => {
          if (!fundNames.includes(df)) fundNames.push(df);
        });
        const currentOptions = Array.from(fund.options).map(o => o.value);
        const needsUpdate = fundNames.some(fn => !currentOptions.includes(fn)) || currentOptions.includes('Community Development');
        if (needsUpdate) {
          fund.innerHTML = '<option>All Funds</option>' + fundNames.map(fn => `<option value="${pbkEscape(fn)}">${pbkEscape(fn)}</option>`).join('');
          if (curFundVal && (curFundVal === 'All Funds' || fundNames.includes(curFundVal))) {
            fund.value = curFundVal;
          }
        }
      }
      const year = document.getElementById('pbkReceiptYearFilter');
      [status, method, fund, year].forEach(e => { if (e) e.onchange = () => { currentReceiptPage = 1; renderReceipts(); } });

      const filtered = getFilteredReceiptRows();

      // Calculate Collected, Pending, Rejected, and Total amounts for this receipt box (kept cleanly in the table's last row)
      const completedAmount = filtered.filter(c => c.status === 'Completed').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const pendingAmount = filtered.filter(c => c.status === 'Pending').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const rejectedAmount = filtered.filter(c => c.status === 'Rejected').reduce((sum, c) => sum + (Number(c.amount) || 0), 0);
      const totalAmount = filtered.reduce((sum, c) => sum + (Number(c.amount) || 0), 0);

      // Update table last row totals (tfoot)
      set('tfootReceiptCompleted', money(completedAmount));
      set('tfootReceiptPending', money(pendingAmount));
      set('tfootReceiptRejected', money(rejectedAmount));
      set('tfootReceiptTotal', money(totalAmount));

      const pageSize = document.getElementById('pbkReceiptPageSize');
      if (pageSize && !pageSize.dataset.bound) {
        pageSize.dataset.bound = 'true';
        pageSize.onchange = () => {
          currentReceiptPage = 1;
          renderReceipts();
        };
      }

      let limit = 10;
      if (pageSize) {
        const parsed = parseInt(pageSize.value, 10);
        if (!isNaN(parsed)) limit = parsed;
        else if (pageSize.value && pageSize.value.toLowerCase().includes('all')) limit = Math.max(1, filtered.length);
      }

      const totalFiltered = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalFiltered / limit));
      if (currentReceiptPage > totalPages) currentReceiptPage = totalPages;
      if (currentReceiptPage < 1) currentReceiptPage = 1;

      const startIndex = (currentReceiptPage - 1) * limit;
      const endIndex = Math.min(startIndex + limit, totalFiltered);
      const rows = filtered.slice(startIndex, endIndex);

      const tbody = document.getElementById('receiptTable');
      if (tbody) {
        tbody.innerHTML = rows.map((c, i) => {
          const s = c.status === 'Completed' ? 'done' : c.status === 'Pending' ? 'pending' : 'rejected';
          const mId = pbkEscape(getMemberIdByName(c.member) || '—');
          const utrDisplay = c.method === 'Cash' ? '—' : pbkEscape(pbkFormatReceiptReference(c.ref));
          return `<tr>
        <td class="pbk-rm-id" style="font-weight:900">${mId}</td>
        <td style="font-weight:700">${pbkEscape(c.member)}</td>
        <td class="pbk-rm-id">${pbkEscape(c.id)}</td>
        <td>${pbkEscape(c.fund)}</td>
        <td>${pbkEscape(c.method)}</td>
        <td>${pbkEscape(c.date)}</td>
        <td>${utrDisplay}</td>
        <td class="pbk-rm-amount">${money(c.amount)}</td>
        <td>
          ${canEditReceipts() ? `
            <select onchange="pbkSetReceiptStatus('${pbkEscape(c.id)}', this.value)" class="text-xs font-bold rounded-lg border px-2 py-1 bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-700 cursor-pointer ${c.status === 'Completed' ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border-emerald-300 dark:border-emerald-700' : (c.status === 'Rejected' ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border-rose-300 dark:border-rose-700' : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border-amber-300 dark:border-amber-700')}">
              <option value="Pending" ${c.status === 'Pending' ? 'selected' : ''}>Pending</option>
              <option value="Completed" ${c.status === 'Completed' ? 'selected' : ''}>Completed</option>
              <option value="Rejected" ${c.status === 'Rejected' ? 'selected' : ''}>Rejected</option>
            </select>
          ` : `
            <span class="inline-block text-xs font-bold rounded-lg px-2.5 py-1 ${c.status === 'Completed' ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-300 dark:border-emerald-700' : (c.status === 'Rejected' ? 'text-rose-700 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-700' : 'text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 border border-amber-300 dark:border-amber-700')}">${pbkEscape(c.status)}</span>
          `}
        </td>
        <td>
          <div class="flex items-center gap-1">
            <button class="pbk-rm-action" title="View receipt" aria-label="View receipt" onclick="pbkOpenReceiptPreview('${pbkEscape(c.id)}')">
              <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"/><circle cx="12" cy="12" r="2.7"/></svg>
            </button>
            ${canEditReceipts() ? `
              <button class="pbk-rm-action" title="Edit receipt" aria-label="Edit receipt" onclick="editContribution('${pbkEscape(c.id)}')">
                <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
              </button>
            ` : ''}
            <button class="pbk-rm-action" title="Print receipt" aria-label="Print receipt" onclick="pbkOpenReceiptPreview('${pbkEscape(c.id)}');setTimeout(pbkPrintReceipt,100)">
              <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9V3h12v6"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><path d="M6 14h12v7H6z"/></svg>
            </button>
            ${canEditReceipts() && c.status !== 'Completed' ? `<button class="pbk-rm-action verify" title="Approve & Complete" aria-label="Approve" onclick="pbkSetReceiptStatus('${pbkEscape(c.id)}', 'Completed')">
              <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m8 12 2.5 2.5L16.5 8.5"/></svg>
            </button>`: ''}
            ${canEditReceipts() && c.status !== 'Rejected' ? `<button class="pbk-rm-action" style="color:#e11d48;" title="Reject Contribution" aria-label="Reject" onclick="pbkSetReceiptStatus('${pbkEscape(c.id)}', 'Rejected')">
              <svg viewBox="0 0 24 24" aria-hidden="true" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="9"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>
            </button>`: ''}
          </div>
        </td>
      </tr>`;
        }).join('');
        if (!rows.length) {
          tbody.innerHTML = '<tr><td colspan="10" class="text-center py-10 text-slate-400">No receipts found for the selected filters.</td></tr>';
        }
      }

      if (totalFiltered === 0) {
        set('pbkReceiptShowing', 'Showing 0 receipts');
      } else {
        set('pbkReceiptShowing', `Showing ${startIndex + 1} to ${endIndex} of ${totalFiltered} receipts`);
      }

      // Render pagination tabs (1, 2, 3, 4...)
      const pagesContainer = document.getElementById('pbkReceiptPages');
      if (pagesContainer) {
        if (totalPages <= 1) {
          pagesContainer.innerHTML = `<button class="pbk-rm-pagebtn active" type="button">1</button>`;
        } else {
          let pagesHtml = `<button class="pbk-rm-pagebtn" type="button" onclick="pbkReceiptPage(-1)" ${currentReceiptPage === 1 ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : ''}>‹</button>`;
          for (let p = 1; p <= totalPages; p++) {
            if (p === 1 || p === totalPages || (p >= currentReceiptPage - 2 && p <= currentReceiptPage + 2)) {
              pagesHtml += `<button class="pbk-rm-pagebtn ${p === currentReceiptPage ? 'active' : ''}" type="button" onclick="pbkGoToReceiptPage(${p})">${p}</button>`;
            } else if (p === currentReceiptPage - 3 || p === currentReceiptPage + 3) {
              pagesHtml += `<span style="padding:0 3px;color:#64748b;font-weight:900;">...</span>`;
            }
          }
          pagesHtml += `<button class="pbk-rm-pagebtn" type="button" onclick="pbkReceiptPage(1)" ${currentReceiptPage === totalPages ? 'disabled style="opacity:0.35;cursor:not-allowed;"' : ''}>›</button>`;
          pagesContainer.innerHTML = pagesHtml;
        }
      }

      lucide.createIcons();
    }

    function pbkClearReceiptFilters() {
      ['pbkReceiptSearch'].forEach(id => { const e = document.getElementById(id); if (e) e.value = '' });
      ['pbkReceiptStatusFilter', 'pbkReceiptMethodFilter', 'pbkReceiptFundFilter', 'pbkReceiptYearFilter', 'pbkReceiptYearTop'].forEach(id => {
        const e = document.getElementById(id); if (e) e.selectedIndex = 0;
      });
      currentReceiptPage = 1;
      renderReceipts();
    }
    function pbkGenerateReceiptFromDashboard() {
      const c = (DB.contributions || []).find(x => x.status === 'Completed') || (DB.contributions || [])[0];
      if (c) pbkOpenReceiptPreview(c.id); else toast('No contribution is available for a receipt');
    }
    async function pbkSetReceiptStatus(id, newStatus) {
      if (!canEditReceipts()) {
        toast('Permission Denied: General Admin cannot modify receipt status.');
        return;
      }
      const c = (DB.contributions || []).find(x => x.id === id);
      if (!c) return;
      const normStatus = newStatus === 'Completed' ? 'Completed' : (newStatus === 'Rejected' ? 'Rejected' : 'Pending');
      c.status = normStatus;

      const targetDbId = c.db_id || (typeof c.id === 'string' && c.id.match(/\d+$/) ? parseInt(c.id.match(/\d+$/)[0], 10) : null);
      if (targetDbId) {
        try {
          await fetch(`${API_BASE}/admin/contributions/${targetDbId}/status?status=${encodeURIComponent(normStatus.toLowerCase())}`, {
            method: 'PUT'
          });
        } catch (e) {
          console.warn('Backend contribution status sync error:', e);
        }
      }

      if (typeof addActivity === 'function') addActivity(`Updated contribution ${c.id} status to ${normStatus}`);
      toast(`Contribution ${c.id} status updated to ${normStatus}`);

      renderReceipts();
      if (typeof renderRecent === 'function') renderRecent();
      if (typeof renderFundManagement === 'function') renderFundManagement();
      updateOverviewStats();
      drawChart();
      syncFundsWithBackend();
    }
    function pbkVerifyReceipt(id) {
      pbkSetReceiptStatus(id, 'Completed');
    }
    async function pbkVerifyAllReceipts() {
      const all = Array.isArray(DB.contributions) ? DB.contributions : [];
      const pending = all.filter(c => c.status === 'Pending');
      if (!pending.length) {
        renderReceipts();
        toast('No pending receipts');
        return;
      }

      for (const c of pending) {
        c.status = 'Completed';
        const targetDbId = c.db_id || (typeof c.id === 'string' && c.id.match(/\d+$/) ? parseInt(c.id.match(/\d+$/)[0], 10) : null);
        if (targetDbId) {
          fetch(`${API_BASE}/admin/contributions/${targetDbId}/status?status=completed`, { method: 'PUT' }).catch(() => {});
        }
        if (typeof addActivity === 'function') addActivity('Verified receipt ' + c.id);
      }

      renderReceipts();
      if (typeof renderRecent === 'function') renderRecent();
      if (typeof renderFundManagement === 'function') renderFundManagement();
      updateOverviewStats();
      drawChart();
      syncFundsWithBackend();

      toast(`${pending.length} receipt${pending.length === 1 ? '' : 's'} verified successfully`);
    }
    function getFilteredReceiptRows() {
      const all = Array.isArray(DB.contributions) ? DB.contributions : [];
      const search = document.getElementById('pbkReceiptSearch');
      const status = document.getElementById('pbkReceiptStatusFilter');
      const method = document.getElementById('pbkReceiptMethodFilter');
      const fund = document.getElementById('pbkReceiptFundFilter');
      const year = document.getElementById('pbkReceiptYearFilter');

      const q = (search?.value || '').trim().toLowerCase();
      const sf = status?.value || 'All Status';
      const mf = method?.value || 'All Payment Methods';
      const ff = fund?.value || 'All Funds';
      const yf = year?.value || '2026 - 2027';

      return all.filter(c => {
        const mId = getMemberIdByName(c.member) || '';
        const hay = [mId, c.id, c.member, c.fund, c.ref, c.method].join(' ').toLowerCase();
        return (!q || hay.includes(q)) &&
          (sf === 'All Status' || c.status === sf) &&
          (mf === 'All Payment Methods' || c.method === mf) &&
          (ff === 'All Funds' || c.fund === ff) &&
          contributionBelongsToYear(c, yf);
      });
    }

    function buildReceiptCsv(rows) {
      const csvRows = [['Receipt ID', 'UTR Number', 'Member', 'Fund', 'Amount', 'Date', 'Payment Method', 'Status']];
      rows.forEach(c => csvRows.push([
        c.id,
        c.ref || '—',
        c.member,
        c.fund,
        c.amount,
        c.date,
        c.method,
        c.status
      ]));
      return csvRows.map(r => r.map(v => `"${String(v ?? '').replace(/"/g, '""')}"`).join(',')).join('\n');
    }

    function downloadReceiptCsv(rows, filename) {
      const csv = buildReceiptCsv(rows);
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    }

    function pbkReceiptExport() {
      const rows = getFilteredReceiptRows();
      downloadReceiptCsv(rows, 'PBK-Receipt-Management-Filtered.csv');
      toast(rows.length ? `${rows.length} filtered receipt${rows.length === 1 ? '' : 's'} exported` : 'No receipts match the current filters');
    }

    function pbkExportFilteredReceipts() {
      const rows = getFilteredReceiptRows();
      if (!rows.length) {
        toast('No receipts match the current filters');
        return;
      }

      const year = document.getElementById('pbkReceiptYearFilter')?.value || 'Selected-Year';
      const safeYear = year.replace(/\s+/g, '').replace(/[^0-9-]/g, '');
      downloadReceiptCsv(rows, `PBK-Receipts-Filtered-${safeYear || 'Export'}.csv`);
      toast(`✓ ${rows.length} filtered receipt${rows.length === 1 ? '' : 's'} downloaded`);
    }

    let currentReceiptPage = 1;

    function pbkGoToReceiptPage(page) {
      currentReceiptPage = page;
      renderReceipts();
    }

    function pbkReceiptPage(dir) {
      const filtered = getFilteredReceiptRows();
      const pageSize = document.getElementById('pbkReceiptPageSize');
      let limit = 10;
      if (pageSize) {
        const parsed = parseInt(pageSize.value, 10);
        if (!isNaN(parsed)) limit = parsed;
        else if (pageSize.value && pageSize.value.toLowerCase().includes('all')) limit = Math.max(1, filtered.length);
      }
      const totalPages = Math.max(1, Math.ceil(filtered.length / limit));
      const target = currentReceiptPage + dir;
      if (target >= 1 && target <= totalPages) {
        currentReceiptPage = target;
        renderReceipts();
      }
    }

    let currentEditCauseIndex = -1;
    let pendingDelete = null;


    let activeReportType = null;


/* ============================================================================== */
/* SECTION 5 (CONT.): FUND USAGE & EXPENDITURE TRACKING (FUNDS TAB)               */
/* Manages community fund expenditures, usage logs, purpose, amount deductions,   */
/* and synchronizes available balances across Youth, Village & General funds.     */
/* ============================================================================== */

    if (!Array.isArray(DB.fundUsage)) {
      DB.fundUsage = [];
    }

    function renderFundUsage() {
      const tbody = document.getElementById('fundUsageTableBody');
      if (!tbody) return;

      const rows = Array.isArray(DB.fundUsage) ? DB.fundUsage : [];

      if (!rows.length) {
        tbody.innerHTML = '<tr><td colspan="5" class="p-8 text-center text-gray-400">No fund usage records found.</td></tr>';
        return;
      }

      tbody.innerHTML = rows.map(u => {
        return `<tr class="border-t border-gray-100 dark:border-gray-800">
      <td class="p-3.5 text-sm">${pbkEscape(u.date || '—')}</td>
      <td class="p-3.5 text-sm font-bold">${pbkEscape(u.fundType || '—')}</td>
      <td class="p-3.5 text-sm">${pbkEscape(u.purpose || '—')}</td>
      <td class="p-3.5 text-sm font-extrabold">${reportMoney(u.amount)}</td>
      <td class="p-3.5">
        <div class="flex justify-end items-center gap-2">
          ${canEditFunds() ? `
            <button type="button"
              onclick="editFundUsageRecord('${pbkEscape(u.id)}')"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-sky-200 dark:border-sky-900/50 text-sky-600 dark:text-sky-400 hover:bg-sky-50 dark:hover:bg-sky-950/30 font-bold text-xs cursor-pointer">
              <i data-lucide="pencil" class="w-3.5 h-3.5"></i>
              Edit
            </button>
            <button type="button"
              onclick="deleteFundUsageRecord('${pbkEscape(u.id)}')"
              class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-red-200 dark:border-red-900/50 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 font-bold text-xs cursor-pointer">
              <i data-lucide="trash-2" class="w-3.5 h-3.5"></i>
              Delete
            </button>
          ` : `
            <span class="text-[11px] font-bold text-gray-400 dark:text-gray-500 px-2">View Only</span>
          `}
        </div>
      </td>
    </tr>`;
      }).join('');

      lucide.createIcons();
    }

    function populateFundUsageTypes(selectedValue = '') {
      const select = document.getElementById('fundUsageType');
      if (!select) return;

      const funds = Array.isArray(DB.funds) ? DB.funds : [];
      const names = [];
      const seen = new Set();

      funds.forEach(f => {
        const name = String(f?.name || '').trim();
        if (name && !seen.has(name)) {
          seen.add(name);
          names.push(name);
        }
      });

      select.innerHTML = names.length
        ? names.map(name => `<option value="${pbkEscape(name)}">${pbkEscape(name)}</option>`).join('')
        : '<option value="">No funds available</option>';

      if (selectedValue && names.includes(selectedValue)) {
        select.value = selectedValue;
      } else if (names.length) {
        select.value = names[0];
      } else {
        select.value = '';
      }
    }

    function openFundUsageModal(editId = '') {
      if (!canEditFunds()) {
        toast('Permission Denied: General Admin cannot modify fund usage.');
        return;
      }
      const title = document.getElementById('fundUsageModalTitle');
      const saveBtn = document.getElementById('saveFundUsageBtn');
      const date = document.getElementById('fundUsageDate');
      const purpose = document.getElementById('fundUsagePurpose');
      const amount = document.getElementById('fundUsageAmount');
      const status = document.getElementById('fundUsageStatus');

      if (editId) {
        const record = (Array.isArray(DB.fundUsage) ? DB.fundUsage : []).find(x => String(x.id) === String(editId));
        if (!record) {
          toast('Fund usage record not found');
          return;
        }

        if (title) title.textContent = 'Edit Fund Usage';
        if (saveBtn) {
          saveBtn.textContent = 'Update Usage';
          saveBtn.dataset.editId = record.id;
        }

        if (date) {
          let dVal = record.raw_date || '';
          if (!dVal && record.date) {
            const parsed = new Date(record.date);
            if (!isNaN(parsed.getTime())) dVal = parsed.toISOString().slice(0, 10);
          }
          date.value = dVal || record.date || new Date().toISOString().slice(0, 10);
        }
        if (purpose) purpose.value = record.purpose || '';
        if (amount) amount.value = record.amount || '';
        if (status) status.value = record.status || 'Pending';

        populateFundUsageTypes(record.fundType || '');
      } else {
        if (title) title.textContent = 'Add Fund Usage';
        if (saveBtn) {
          saveBtn.textContent = 'Save Usage';
          delete saveBtn.dataset.editId;
        }

        if (date) date.value = new Date().toISOString().slice(0, 10);
        if (purpose) purpose.value = '';
        if (amount) amount.value = '';
        if (status) status.value = 'Pending';

        populateFundUsageTypes();
      }

      openModal('fundUsageModal');
      lucide.createIcons();
    }

    function editFundUsageRecord(id) {
      openFundUsageModal(id);
    }

    function deleteFundUsageRecord(id) {
      if (!canEditFunds()) {
        toast('Permission Denied: General Admin cannot delete fund usage.');
        return;
      }
      const rows = Array.isArray(DB.fundUsage) ? DB.fundUsage : [];
      const record = rows.find(x => String(x.id) === String(id));

      if (!record) {
        toast('Fund usage record not found');
        return;
      }

      // Use the same styled delete confirmation used by the other records.
      pendingDelete = { type: 'fundUsage', id: String(id) };

      const title = document.getElementById('deleteConfirmModalTitle');
      const message = document.getElementById('deleteConfirmModalMessage');
      const action = document.getElementById('deleteConfirmModalAction');

      if (title) title.textContent = 'Delete Fund Usage';
      if (message) {
        message.textContent =
          `Are you sure you want to delete this fund usage record? ` +
          `${record.fundType || 'Fund'} • ${record.purpose || 'No purpose'} • ${reportMoney(record.amount)}. ` +
          `This action cannot be undone.`;
      }

      if (action) {
        action.disabled = false;
        action.textContent = 'Delete';
      }

      openModal('deleteConfirmModal');
      lucide.createIcons();
    }

    async function saveFundUsage() {
      const date = document.getElementById('fundUsageDate')?.value;
      const fundType = document.getElementById('fundUsageType')?.value;
      const purpose = document.getElementById('fundUsagePurpose')?.value.trim();
      const amount = Number(document.getElementById('fundUsageAmount')?.value || 0);
      const status = document.getElementById('fundUsageStatus')?.value || 'Pending';
      const saveBtn = document.getElementById('saveFundUsageBtn');
      const editId = saveBtn?.dataset.editId || '';

      if (!date || !fundType || !purpose || amount <= 0) {
        toast('Please enter date, fund type, purpose and a valid amount');
        return;
      }

      if (!Array.isArray(DB.fundUsage)) {
        DB.fundUsage = [];
      }

      const origBtnText = saveBtn ? saveBtn.textContent : 'Save Usage';
      if (saveBtn) {
        saveBtn.disabled = true;
        saveBtn.textContent = 'Saving...';
      }

      try {
        if (editId) {
          const record = DB.fundUsage.find(x => String(x.id) === String(editId));

          if (!record) {
            toast('Fund usage record not found');
            return;
          }

          if (record.db_id) {
            const res = await fetch(`${API_BASE}/fund-usage/${record.db_id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                fund_type: fundType,
                usage_date: date,
                purpose,
                amount,
                status
              })
            });

            if (!res.ok) {
              const err = await res.json().catch(() => ({}));
              toast(err.detail || 'Failed to update fund usage in database');
              return;
            }
            const data = await res.json().catch(() => ({}));
            if (data.date) record.date = data.date;
          }

          record.date = record.date || date;
          record.raw_date = date;
          record.fundType = fundType;
          record.purpose = purpose;
          record.amount = amount;
          record.status = status;

          if (typeof addActivity === 'function') {
            addActivity(`Updated fund usage: ${purpose} (${money(amount)})`);
          }

          toast('Fund usage updated successfully in database');
        } else {
          const res = await fetch(`${API_BASE}/fund-usage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ fund_type: fundType, usage_date: date, purpose, amount, status })
          });

          if (!res.ok) {
            const err = await res.json().catch(() => ({}));
            toast(err.detail || 'Failed to save fund usage to database');
            return;
          }

          const resData = await res.json().catch(() => ({}));
          const newDbId = resData.id;
          const displayDate = resData.date || date;

          const newUsageObj = {
            id: newDbId ? ('FU-' + String(newDbId).padStart(3, '0')) : ('FU-' + Date.now()),
            db_id: newDbId,
            date: displayDate,
            raw_date: date,
            fundType,
            purpose,
            amount,
            status
          };
          DB.fundUsage.unshift(newUsageObj);

          if (typeof addActivity === 'function') {
            addActivity(`Added fund usage: ${purpose} (${money(amount)})`);
          }

          toast('Fund usage saved to database successfully');
        }

        renderFundUsage();
        renderFundManagement();
        renderRecent();
        updateOverviewStats();
        drawChart();
        syncFundsWithBackend();
        closeModal('fundUsageModal');

        if (saveBtn) {
          delete saveBtn.dataset.editId;
          saveBtn.textContent = 'Save Usage';
        }

        const title = document.getElementById('fundUsageModalTitle');
        if (title) title.textContent = 'Add Fund Usage';
      } catch (e) {
        console.error('Usage save error:', e);
        toast('Connection error while saving fund usage');
      } finally {
        if (saveBtn) {
          saveBtn.disabled = false;
          saveBtn.textContent = origBtnText;
        }
      }
    }

/* ============================================================================== */
/* SECTION 9: REPORTS TAB (TAB #9) — MULTI-CATEGORY EXPORT & FINANCIAL AUDIT     */
/* Generates on-screen summaries, print layouts, and downloadable CSV statements */
/* for Members, Contributions, Funds, Fund Usages, Activity Logs & Yearly Audit. */
/* ============================================================================== */

    function reportMoney(value) {
      return '₹' + Number(value || 0).toLocaleString('en-IN');
    }

    function reportEscape(value) {
      return pbkEscape(String(value ?? '—'));
    }

    function getReportFinancialYear(dateText) {
      if (typeof getFinancialYearForDate === 'function') {
        return getFinancialYearForDate(dateText);
      }
      const d = new Date(dateText);
      if (Number.isNaN(d.getTime())) return '—';
      return d.getMonth() >= 3 ? `${d.getFullYear()} - ${d.getFullYear() + 1}` : `${d.getFullYear() - 1} - ${d.getFullYear()}`;
    }

    function downloadReportCsv(rows, filename) {
      const csv = rows.map(row => row.map(v => {
        let cleanVal = String(v ?? '');
        cleanVal = cleanVal.replace(/[\u2014\u2013]/g, '-');
        return `"${cleanVal.replace(/"/g, '""')}"`;
      }).join(',')).join('\r\n');
      const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 500);
    }

    function exportReport(type) {
      const builders = {
        member: () => {
          const members = Array.isArray(DB.members) ? DB.members : [];
          return {
            name: 'PBK-Member-Report.csv',
            rows: [
              ['PBK ID', 'Member', 'Email', 'Phone', 'Member Type', 'Status', 'Verification', 'Join Date'],
              ...members.map(m => [m.id, m.name, m.email || '-', m.phone || '-', m.memberType || '-', m.status || '-', m.verified ? 'Verified' : 'Pending', m.joinDate || '-'])
            ]
          };
        },
        contribution: () => {
          const rows = Array.isArray(DB.contributions) ? DB.contributions : [];
          return {
            name: 'PBK-Contribution-Report.csv',
            rows: [
              ['Member ID', 'Member', 'Receipt ID', 'Fund', 'Payment Method', 'Date', 'UTR / Transaction ID', 'Amount', 'Status'],
              ...rows.map(c => [
                getMemberIdByName(c.member) || '-',
                c.member || '-',
                c.id || '-',
                c.fund || '-',
                c.method || '-',
                c.date || '-',
                c.method === 'Cash' ? '-' : (pbkFormatReceiptReference(c.ref) || '-'),
                c.amount || 0,
                c.status || '-'
              ])
            ]
          };
        },
        fund: () => {
          const funds = Array.isArray(DB.funds) ? DB.funds : [];
          return {
            name: 'PBK-Fund-Report.csv',
            rows: [
              ['Financial Year', 'Fund', 'Target', 'Collected', 'Used', 'Balance', 'Status'],
              ...funds.map(f => [f.year || '-', f.name, f.target || 0, f.collected || 0, f.used || 0, Number(f.collected || 0) - Number(f.used || 0), f.status || '-'])
            ]
          };
        },
        fundUsage: () => {
          const usage = Array.isArray(DB.fundUsage) ? DB.fundUsage : [];
          return {
            name: 'PBK-Fund-Usage-Report.csv',
            rows: [
              ['Date', 'Fund Type', 'Purpose', 'Amount Usage', 'Status'],
              ...usage.map(u => [u.date || '-', u.fundType || '-', u.purpose || '-', u.amount || 0, u.status || '-'])
            ]
          };
        },
        activityLogin: () => {
          const rows = Array.isArray(DB.activity) ? DB.activity : [];
          return {
            name: 'PBK-Activity-Login-Report.csv',
            rows: [
              ['S.No', 'Date', 'Time', 'Who Performed (Actor)', 'Role', 'Target Member ID', 'Target Member Name', 'Category', 'Action', 'What Changed / Details'],
              ...rows.map((a, index) => {
                const time = a.time || a[0] || '-';
                const date = a.date || a[3] || '-';
                const actor = a.actor || a[1] || 'Sai Kumar (Super Admin)';
                const desc = a.description || a.action || a[2] || '-';
                const action = a.action || a.description || a[2] || 'Activity';
                const changeType = a.change_type || (a[4] ? getActivityTypeLabel(a[4]) : getActivityTypeLabel(getActivityMeta(desc)));
                const isAdmin = a.actor_role === 'Admin' || /admin|super|primary/i.test(actor);
                const role = a.actor_role || (isAdmin ? 'Admin' : 'Member');
                
                let memberId = a.member_id && a.member_id !== '—' && a.member_id !== '-' ? a.member_id : (a[5] || (String(desc).match(/\bPBK-M\d{3,}/i)?.[0]?.toUpperCase()) || '-');
                let memberName = a.member_name && a.member_name !== '—' && a.member_name !== '-' ? a.member_name : (memberId !== '-' ? (DB.members?.find(m => m.id === memberId)?.name || '-') : '-');
                
                return [
                  index + 1,
                  date,
                  time,
                  actor,
                  role,
                  memberId,
                  memberName,
                  changeType,
                  action,
                  desc
                ];
              })
            ]
          };
        },
        yearly: () => {
          const contributions = Array.isArray(DB.contributions) ? DB.contributions : [];
          const funds = Array.isArray(DB.funds) ? DB.funds : [];
          const years = new Set();
          contributions.forEach(c => years.add(getReportFinancialYear(c.date)));
          funds.forEach(f => f.year && years.add(f.year));
          const validYears = [...years].filter(y => y && y !== '—' && y !== '-').sort().reverse();
          return {
            name: 'PBK-Yearly-Report.csv',
            rows: [
              ['Financial Year', 'Transactions', 'Contribution Total', 'Completed Amount', 'Fund Collected', 'Fund Used', 'Fund Balance'],
              ...validYears.map(year => {
                const cr = contributions.filter(c => getReportFinancialYear(c.date) === year);
                const fr = funds.filter(f => f.year === year);
                const transactionAmount = cr.reduce((s, c) => s + Number(c.amount || 0), 0);
                const completedAmount = cr.filter(c => c.status === 'Completed').reduce((s, c) => s + Number(c.amount || 0), 0);
                const fundCollected = fr.reduce((s, f) => s + Number(f.collected || 0), 0);
                const fundUsed = fr.reduce((s, f) => s + Number(f.used || 0), 0);
                return [year, cr.length, transactionAmount, completedAmount, fundCollected, fundUsed, fundCollected - fundUsed];
              })
            ]
          };
        }
      };

      const builder = builders[type];
      if (!builder) {
        toast('Unable to export report');
        return;
      }

      const result = builder();
      if (result.rows.length <= 1) {
        toast('No data available to export');
        return;
      }

      downloadReportCsv(result.rows, result.name);
      toast(`✓ ${result.name.replace('.csv', '')} exported successfully`);
    }

    function reportTable(headers, rows) {
      const head = headers.map(h => `<th class="px-3 py-2 text-left text-xs font-extrabold uppercase tracking-wide bg-slate-100 border-b border-slate-200">${reportEscape(h)}</th>`).join('');
      const body = rows.length
        ? rows.map(row => `<tr>${row.map(v => `<td class="px-3 py-2 text-sm border-b border-slate-100">${reportEscape(v)}</td>`).join('')}</tr>`).join('')
        : `<tr><td colspan="${headers.length}" class="px-3 py-10 text-center text-slate-500">No records available.</td></tr>`;
      return `<div class="overflow-x-auto rounded-xl border border-slate-200"><table class="min-w-full bg-white text-slate-800"><thead><tr>${head}</tr></thead><tbody>${body}</tbody></table></div>`;
    }

    function reportSummary(items) {
      return `<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-5">${items.map(x => `
    <div class="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div class="text-xs font-extrabold uppercase tracking-wide text-slate-500">${reportEscape(x[0])}</div>
      <div class="text-xl font-extrabold text-slate-900 mt-1">${reportEscape(x[1])}</div>
    </div>`).join('')}</div>`;
    }

    function buildMemberReport() {
      const members = Array.isArray(DB.members) ? DB.members : [];
      const active = members.filter(m => m.status === 'Active').length;
      const verified = members.filter(m => m.verified === true).length;
      const pending = members.filter(m => m.verified !== true).length;
      const rows = members.map(m => [
        m.id, m.name, m.email || '—', m.phone || '—', m.memberType || '—', m.status || '—',
        m.verified ? 'Verified' : 'Pending', m.joinDate || '—'
      ]);
      return {
        title: 'Member Report',
        subtitle: `Generated ${new Date().toLocaleString('en-IN')}`,
        html: reportSummary([
          ['Total Members', members.length],
          ['Active', active],
          ['Verified', verified],
          ['Pending Verification', pending]
        ]) + reportTable(['PBK ID', 'Member', 'Email', 'Phone', 'Member Type', 'Status', 'Verification', 'Join Date'], rows)
      };
    }

    function buildContributionReport() {
      const rows = Array.isArray(DB.contributions) ? DB.contributions : [];

      const totalAmount = rows.reduce((s, c) => s + Number(c.amount || 0), 0);
      const completed = rows.filter(c => c.status === 'Completed');
      const pending = rows.filter(c => c.status === 'Pending');
      const rejected = rows.filter(c => c.status === 'Rejected');

      return {
        title: 'Contribution Report',
        subtitle: `Receipt Management Details • Generated ${new Date().toLocaleString('en-IN')}`,
        html: reportSummary([
          ['Total Receipts', rows.length],
          ['Total Amount', reportMoney(totalAmount)],
          ['Verified / Completed', completed.length],
          ['Pending Verification', pending.length]
        ]) +
          `<h3 class="text-lg font-extrabold text-slate-900 mb-3 mt-6">Receipt Details</h3>` +
          reportTable(
            ['Member ID', 'Member', 'Receipt ID', 'Fund', 'Payment Method', 'Date', 'UTR / Transaction ID', 'Amount', 'Status'],
            rows.map(c => [
              getMemberIdByName(c.member) || '—',
              c.member || '—',
              c.id || '—',
              c.fund || '—',
              c.method || '—',
              c.date || '—',
              c.method === 'Cash' ? '—' : (pbkFormatReceiptReference(c.ref) || '—'),
              reportMoney(c.amount),
              c.status || '—'
            ])
          )
      };
    }
    function buildFundReport() {
      const funds = Array.isArray(DB.funds) ? DB.funds : [];
      const collected = funds.reduce((s, f) => s + Number(f.collected || 0), 0);
      const used = funds.reduce((s, f) => s + Number(f.used || 0), 0);
      const target = funds.reduce((s, f) => s + Number(f.target || 0), 0);
      const balance = collected - used;
      return {
        title: 'Fund Report',
        subtitle: `Collected, used and balance by fund • Generated ${new Date().toLocaleString('en-IN')}`,
        html: reportSummary([
          ['Funds', funds.length],
          ['Target', reportMoney(target)],
          ['Collected', reportMoney(collected)],
          ['Balance', reportMoney(balance)]
        ]) + reportTable(
          ['Financial Year', 'Fund', 'Target', 'Collected', 'Used', 'Balance', 'Status'],
          funds.map(f => [f.year || '—', f.name, reportMoney(f.target), reportMoney(f.collected), reportMoney(f.used), reportMoney(Number(f.collected || 0) - Number(f.used || 0)), f.status || '—'])
        )
      };
    }

    function buildFundUsageReport() {
      const usage = Array.isArray(DB.fundUsage) ? DB.fundUsage : [];
      const totalUsed = usage.reduce((s, u) => s + Number(u.amount || 0), 0);
      const completed = usage.filter(u => u.status === 'Completed');
      const pending = usage.filter(u => u.status === 'Pending');
      const rejected = usage.filter(u => u.status === 'Rejected');
      return {
        title: 'Fund Usage Report',
        subtitle: `Fund usage details • Generated ${new Date().toLocaleString('en-IN')}`,
        html: reportSummary([
          ['Total Usage Records', usage.length],
          ['Total Amount Used', reportMoney(totalUsed)],
          ['Completed', completed.length],
          ['Pending', pending.length]
        ]) +
          `<h3 class="text-lg font-extrabold text-slate-900 mb-3 mt-6">Fund Usage Details</h3>` +
          reportTable(
            ['Date', 'Fund Type', 'Purpose', 'Amount Usage', 'Status'],
            usage.map(u => [u.date || '—', u.fundType || '—', u.purpose || '—', reportMoney(u.amount), u.status || '—'])
          )
      };
    }

    function buildActivityLoginReport() {
      const activity = Array.isArray(DB.activity) ? DB.activity : [];
      const rows = activity.map((a, index) => {
        const time = a.time || a[0] || '-';
        const actor = a.actor || a[1] || 'Sai Kumar (Super Admin)';
        const desc = a.description || a.action || a[2] || '-';
        const date = a.date || a[3] || '-';
        const type = a.change_type || (a[4] ? getActivityTypeLabel(a[4]) : getActivityTypeLabel(getActivityMeta(desc)));
        const memberId = a.member_id && a.member_id !== '—' && a.member_id !== '-' ? a.member_id : (a[5] || (String(desc).match(/\bPBK-M\d{3,}/i)?.[0]?.toUpperCase()) || '-');
        const memberName = a.member_name && a.member_name !== '—' && a.member_name !== '-' ? a.member_name : (memberId !== '-' ? (DB.members?.find(m => m.id === memberId)?.name || '-') : '-');
        return [index + 1, actor, memberId, memberName, type, desc, time, date];
      });
      const loginCount = activity.filter(a => ((a.change_type || a[4] || getActivityMeta(a.description || a[2])) || '').toLowerCase().includes('login')).length;
      const adminCount = new Set(activity.filter(a => (a.actor_role === 'Admin' || /admin|super|primary/i.test(a.actor || a[1] || ''))).map(a => a.actor || a[1])).size;
      const memberCount = new Set(rows.filter(r => r[2] !== '-').map(r => r[2])).size;
      return {
        title: 'Activity & Login Audit Report',
        subtitle: `Administrative actions, member changes, and login audit trail • Generated ${new Date().toLocaleString('en-IN')}`,
        html: reportSummary([
          ['Total Activities', activity.length],
          ['Login Events', loginCount],
          ['Admin Users', adminCount],
          ['Members Affected', memberCount]
        ]) + reportTable(
          ['S.No', 'Who Edited / Actor', 'Target Member ID', 'Target Member Name', 'Change Type', 'What Changed / Details', 'Time', 'Date'],
          rows
        )
      };
    }

    function buildYearlyReport() {
      const contributions = Array.isArray(DB.contributions) ? DB.contributions : [];
      const funds = Array.isArray(DB.funds) ? DB.funds : [];
      const years = new Set();

      contributions.forEach(c => years.add(getReportFinancialYear(c.date)));
      funds.forEach(f => years.add(f.year));
      const validYears = [...years].filter(y => y && y !== '—').sort().reverse();

      const rows = validYears.map(year => {
        const cr = contributions.filter(c => getReportFinancialYear(c.date) === year);
        const fr = funds.filter(f => f.year === year);
        const transactionAmount = cr.reduce((s, c) => s + Number(c.amount || 0), 0);
        const completedAmount = cr.filter(c => c.status === 'Completed').reduce((s, c) => s + Number(c.amount || 0), 0);
        const fundCollected = fr.reduce((s, f) => s + Number(f.collected || 0), 0);
        const fundUsed = fr.reduce((s, f) => s + Number(f.used || 0), 0);
        return [year, cr.length, reportMoney(transactionAmount), reportMoney(completedAmount), reportMoney(fundCollected), reportMoney(fundUsed), reportMoney(fundCollected - fundUsed)];
      });

      const totalContribution = contributions.reduce((s, c) => s + Number(c.amount || 0), 0);
      return {
        title: 'Yearly Report',
        subtitle: `Financial year comparison • Generated ${new Date().toLocaleString('en-IN')}`,
        html: reportSummary([
          ['Financial Years', validYears.length],
          ['Total Transactions', contributions.length],
          ['Total Contributions', reportMoney(totalContribution)],
          ['Fund Balance', reportMoney(funds.reduce((s, f) => s + Number(f.collected || 0) - Number(f.used || 0), 0))]
        ]) + reportTable(
          ['Financial Year', 'Transactions', 'Contribution Total', 'Completed Amount', 'Fund Collected', 'Fund Used', 'Fund Balance'],
          rows
        )
      };
    }

    function generateReport(type, printAfter = false) {
      activeReportType = type;
      const builders = {
        member: buildMemberReport,
        contribution: buildContributionReport,
        fund: buildFundReport,
        fundUsage: buildFundUsageReport,
        activityLogin: buildActivityLoginReport,
        yearly: buildYearlyReport
      };
      const builder = builders[type];
      if (!builder) {
        toast('Unable to generate report');
        return;
      }

      const report = builder();
      const title = document.getElementById('reportModalTitle');
      const subtitle = document.getElementById('reportModalSubtitle');
      const content = document.getElementById('reportModalContent');

      if (title) title.textContent = report.title;
      if (subtitle) subtitle.textContent = report.subtitle;
      if (content) content.innerHTML = report.html;

      openModal('reportModal');
      lucide.createIcons();

      if (printAfter) {
        setTimeout(reportPrintNow, 120);
      } else {
        toast(`${report.title} generated successfully`);
      }
    }

    document.getElementById('reportModalExport')?.addEventListener('click', () => exportReport(activeReportType));

/* ============================================================================== */
/* SECTION 7: CAUSES & EVENTS TAB (TAB #5) — COMMUNITY PROJECTS & CAMPAIGNS       */
/* Manages community cause cards, per-member targets, total goal calculations,   */
/* raised amount progress indicators, and draft/published visibility toggles.     */
/* ============================================================================== */

    function openAddCauseModal() {
      currentEditCauseIndex = -1;
      document.getElementById('causeModalHead').innerHTML = '<div class="flex justify-between items-center mb-5"><h2 class="text-xl font-extrabold">Create Cause / Event</h2><button data-close="causeModal" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"><i data-lucide="x"></i></button></div>';
      document.getElementById('causeName').value = '';
      document.getElementById('causeTarget').value = '';
      document.getElementById('causeDesc').value = '';
      const calcEl = document.getElementById('causeTotalTargetCalc');
      const activeMembersCount = (DB.members || []).filter(m => m.status === 'Active').length || (DB.members || []).length || 1;
      if (calcEl) calcEl.textContent = `Each individual member contributes this target. Estimated total: ₹0 (${activeMembersCount} members)`;
      document.getElementById('saveCause').textContent = 'Save as Draft';
      openModal('causeModal');
    }

    function editCause(index) {
      currentEditCauseIndex = index;
      const c = DB.causes[index];
      document.getElementById('causeModalHead').innerHTML = '<div class="flex justify-between items-center mb-5"><h2 class="text-xl font-extrabold">Edit Cause / Event</h2><button data-close="causeModal" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"><i data-lucide="x"></i></button></div>';
      document.getElementById('causeName').value = c.name;
      document.getElementById('causeTarget').value = c.target_per_member || c.target || '';
      document.getElementById('causeDesc').value = c.desc;
      const calcEl = document.getElementById('causeTotalTargetCalc');
      const activeMembersCount = (DB.members || []).filter(m => m.status === 'Active').length || (DB.members || []).length || 1;
      const targetPerMem = Number(c.target_per_member || c.target || 0);
      if (calcEl) calcEl.textContent = `Total Community Target: ₹${(targetPerMem * activeMembersCount).toLocaleString('en-IN')} (₹${targetPerMem} × ${activeMembersCount} members)`;
      document.getElementById('saveCause').textContent = 'Save Changes';
      openModal('causeModal');
    }

    function toggleCauseStatus(index) {
      const c = DB.causes[index];
      c.status = c.status === 'Published' ? 'Draft' : 'Published';
      if (c.db_id) {
        fetch(`${API_BASE}/causes/${c.db_id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: c.status })
        }).catch(() => {});
      }
      renderCauses();
      toast(`Cause ${c.status === 'Published' ? 'published' : 'moved to draft'}`);
      if (typeof addActivity === 'function') addActivity(`Changed status of cause "${c.name}" to ${c.status}`);
    }

    function deleteRecordLabel(type) {
      const labels = {
        members: 'Member',
        funds: 'Fund',
        contributions: 'Contribution',
        causes: 'Cause',
        announcements: 'Announcement',
        fundUsage: 'Fund Usage'
      };
      return labels[type] || 'Record';
    }

    function getDeleteRecord(type, id) {
      const collection = Array.isArray(DB[type]) ? DB[type] : [];
      return collection.find(item => String(item.id) === String(id)) || null;
    }

    function requestDelete(type, id) {
      const record = getDeleteRecord(type, id);
      if (!record) {
        toast(`Unable to delete: ${deleteRecordLabel(type)} not found`);
        return;
      }
      if (type === 'funds') {
        if (!canEditFunds()) {
          toast('Permission Denied: General Admin cannot delete funds.');
          return;
        }
        if (isPermanentFund(record.name)) {
          toast('Permanent funds (Youth Fund, Village Fund, General Fund) cannot be deleted.');
          return;
        }
      }

      const label = deleteRecordLabel(type);
      const name = record.name || record.title || record.id || 'this record';

      pendingDelete = { type, id: String(id) };

      const title = document.getElementById('deleteConfirmModalTitle');
      const message = document.getElementById('deleteConfirmModalMessage');
      const action = document.getElementById('deleteConfirmModalAction');

      if (title) title.textContent = `Delete ${label}`;
      if (message) message.textContent = `Are you sure you want to delete ${name}? This action cannot be undone.`;
      if (action) {
        action.disabled = false;
        action.textContent = 'Delete';
      }

      openModal('deleteConfirmModal');
      lucide.createIcons();
    }

    async function confirmDeleteRecord() {
      if (!pendingDelete) return;

      const { type, id } = pendingDelete;
      const collection = Array.isArray(DB[type]) ? DB[type] : [];
      const index = collection.findIndex(item => String(item.id) === String(id));
      const label = deleteRecordLabel(type);

      if (index < 0) {
        closeModal('deleteConfirmModal');
        pendingDelete = null;
        toast(`Delete failed: ${label} not found`);
        return;
      }

      const record = collection[index];
      if (type === 'funds' && isPermanentFund(record.name)) {
        closeModal('deleteConfirmModal');
        pendingDelete = null;
        toast('Permanent funds (Youth Fund, Village Fund, General Fund) cannot be deleted.');
        return;
      }
      const name = record.name || record.title || record.id || 'record';
      const action = document.getElementById('deleteConfirmModalAction');

      if (action) {
        action.disabled = true;
        action.textContent = 'Deleting...';
      }

      const targetDbId = record?.db_id || (typeof record?.id === 'string' && record.id.match(/\d+$/) ? parseInt(record.id.match(/\d+$/)[0], 10) : (record?.id || null));

      if (targetDbId) {
        const deleteEndpoints = {
          causes: `/causes/${targetDbId}`,
          announcements: `/announcements/${targetDbId}`,
          funds: `/funds/${targetDbId}`,
          fundUsage: `/fund-usage/${targetDbId}`,
          contributions: `/admin/contributions/${targetDbId}`,
          members: `/admin/members/${targetDbId}`
        };
        if (deleteEndpoints[type]) {
          try {
            const res = await fetch(`${API_BASE}${deleteEndpoints[type]}`, { method: 'DELETE' });
            if (!res.ok) {
              const errData = await res.json().catch(() => ({}));
              console.warn('Delete backend error:', errData);
            }
          } catch (err) {
            console.warn('Delete backend network error:', err);
          }
        }
      }

      collection.splice(index, 1);

      if (type === 'contributions' && typeof selectedContribIds !== 'undefined') {
        selectedContribIds.delete(id);
      }
      if (type === 'members' && typeof selectedMemberIds !== 'undefined') {
        selectedMemberIds.delete(id);
      }

      closeModal('deleteConfirmModal');
      pendingDelete = null;

      if (type === 'members') {
        renderMembers();
        updateOverviewStats();
      } else if (type === 'funds') {
        renderFundManagement();
        updateOverviewStats();
        drawChart();
      } else if (type === 'contributions') {
        renderReceipts();
        renderRecent();
        renderFundManagement();
        updateOverviewStats();
        drawChart();
        syncFundsWithBackend();
      } else if (type === 'fundUsage') {
        renderFundUsage();
        renderFundManagement();
        updateOverviewStats();
        drawChart();
        syncFundsWithBackend();
      } else if (type === 'causes') {
        renderCauses();
      } else if (type === 'announcements') {
        renderAnnouncements();
      }

      if (typeof addActivity === 'function') {
        addActivity(`Deleted ${label.toLowerCase()}: ${name}`);
      }

      toast(`✓ ${label} deleted successfully`);
      lucide.createIcons();
    }

    function deleteCausePrompt(index) {
      const cause = DB.causes[index];
      if (cause) requestDelete('causes', cause.id);
    }

    function confirmDeleteCause() {
      confirmDeleteRecord();
    }

    function deleteAnnouncementPrompt(index) {
      const announcement = DB.announcements[index];
      if (announcement) requestDelete('announcements', announcement.id);
    }

    function confirmDeleteAnnouncement() {
      confirmDeleteRecord();
    }

    function renderCauses() {
      const container = document.getElementById('causeCards');
      if (!container) return;

      if (!Array.isArray(DB.causes) || DB.causes.length === 0) {
        container.innerHTML = `
          <div class="col-span-full py-16 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div class="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <i data-lucide="target" class="w-6 h-6"></i>
            </div>
            <p class="font-bold text-gray-700 dark:text-gray-300">No causes or events found</p>
            <p class="text-xs text-gray-400 mt-1">Click "Add Cause" above to create a new community cause.</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }

      container.innerHTML = DB.causes.map((c, i) => {
        const isPublished = c.status === 'Published';
        const badgeColor = isPublished ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400' : 'bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400';
        const targetPerMem = Number(c.target_per_member || (c.target && DB.members?.length ? Math.round(c.target / DB.members.length) : c.target) || 0);
        const totalTarget = Number(c.target || 0);
        const progressPct = totalTarget > 0 ? Math.min(100, Math.round((c.raised / totalTarget) * 100)) : 0;

        return `
    <div class="bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm p-6 flex flex-col h-full transition-shadow hover:shadow-md">
      <div class="flex justify-between items-start mb-4">
        <div class="w-10 h-10 rounded-xl bg-gray-50 dark:bg-gray-800 flex items-center justify-center text-gray-700 dark:text-gray-300">
          <i data-lucide="target" class="w-5 h-5"></i>
        </div>
        <div class="flex items-center gap-1.5">
          <span class="px-2.5 py-1 rounded-full text-[11px] font-extrabold ${badgeColor}">
            ${isPublished ? '● Published' : '○ Draft (Unpublished)'}
          </span>
        </div>
      </div>
      
      <h3 class="font-extrabold text-lg text-gray-900 dark:text-white mb-2 line-clamp-1">${pbkEscape(c.name)}</h3>
      <p class="text-sm text-gray-500 dark:text-gray-400 mb-5 flex-grow line-clamp-2">${pbkEscape(c.desc || 'Community welfare initiative')}</p>
      
      <div class="mt-auto">
        <div class="p-3.5 bg-amber-50/60 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30 mb-5 space-y-2">
          <div class="flex justify-between items-center text-xs">
            <span class="text-gray-600 dark:text-gray-400 font-bold">Target / Member:</span>
            <span class="text-amber-800 dark:text-amber-300 font-black text-sm">${money(targetPerMem)}</span>
          </div>
          <div class="flex justify-between text-[11px] font-bold text-gray-500 dark:text-gray-400">
            <span>Raised: <strong class="text-emerald-700 dark:text-emerald-400">${money(c.raised)}</strong></span>
            <span>Community Target: <strong class="text-gray-900 dark:text-white">${money(totalTarget)}</strong></span>
          </div>
          <div class="h-2 w-full bg-gray-200 dark:bg-gray-800 rounded-full overflow-hidden mt-1">
            <div class="h-full bg-amber-500 rounded-full" style="width:${progressPct}%"></div>
          </div>
        </div>
        
        <div class="flex gap-2 h-[42px]">
          <button onclick="editCause(${i})" class="flex-1 h-full rounded-xl border border-gray-200 dark:border-gray-700 font-bold text-sm hover:bg-gray-50 dark:hover:bg-gray-800 transition text-gray-700 dark:text-gray-300 cursor-pointer flex items-center justify-center gap-1">
            <i data-lucide="edit" class="w-3.5 h-3.5"></i>
            <span>Edit</span>
          </button>
          <button onclick="toggleCauseStatus(${i})" class="flex-1 h-full rounded-xl font-bold text-sm transition cursor-pointer flex items-center justify-center gap-1 ${isPublished ? 'bg-amber-600 hover:bg-amber-700 text-white' : 'bg-emerald-600 hover:bg-emerald-700 text-white'}">
            <i data-lucide="${isPublished ? 'eye-off' : 'check-circle-2'}" class="w-3.5 h-3.5"></i>
            <span>${isPublished ? 'Unpublish' : 'Publish'}</span>
          </button>
          <button onclick="requestDelete('causes','${c.id}')" class="delete-action h-full min-w-[88px]" title="Delete Cause">
            <i data-lucide="trash-2"></i>
            <span>Delete</span>
          </button>
        </div>
      </div>
    </div>
    `;
      }).join('');

      lucide.createIcons();
    }

/* ============================================================================== */
/* SECTION 8: ANNOUNCEMENTS TAB (TAB #6) — BROADCAST NOTICE BOARD                */
/* Manages community notice board, publishing, drafting, rich text message,      */
/* and instant sync with the Member Portal head bar notification bell.          */
/* ============================================================================== */

    function openNewAnnouncementModal() {
      editingAnnouncementId = null;
      document.getElementById('annModalHead').innerHTML = '<div class="flex justify-between items-center mb-5"><h2 class="text-xl font-extrabold">New Announcement</h2><button data-close="announcementModal" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"><i data-lucide="x"></i></button></div>';
      document.getElementById('annTitle').value = '';
      document.getElementById('annText').value = '';
      document.getElementById('saveAnnouncement').textContent = 'Publish';
      openModal('announcementModal');
      lucide.createIcons();
    }

    function openEditAnnouncement(index) {
      const announcement = DB.announcements[index];
      if (!announcement) return;
      editingAnnouncementId = String(announcement.id);
      document.getElementById('annModalHead').innerHTML = '<div class="flex justify-between items-center mb-5"><h2 class="text-xl font-extrabold">Edit Announcement</h2><button data-close="announcementModal" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"><i data-lucide="x"></i></button></div>';
      document.getElementById('annTitle').value = announcement.title || '';
      document.getElementById('annText').value = announcement.text || '';
      document.getElementById('saveAnnouncement').textContent = 'Update Announcement';
      openModal('announcementModal');
      lucide.createIcons();
    }

    function renderAnnouncements() {
      const container = document.getElementById('announcementList');
      if (!container) return;

      if (!Array.isArray(DB.announcements) || DB.announcements.length === 0) {
        container.innerHTML = `
          <div class="py-12 text-center bg-white dark:bg-gray-900 rounded-2xl border border-gray-200 dark:border-gray-800">
            <div class="w-12 h-12 mx-auto mb-3 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
              <i data-lucide="megaphone" class="w-6 h-6"></i>
            </div>
            <p class="font-bold text-gray-700 dark:text-gray-300">No announcements found</p>
            <p class="text-xs text-gray-400 mt-1">Click "New Announcement" above to publish community notices.</p>
          </div>
        `;
        lucide.createIcons();
        return;
      }
      container.innerHTML = DB.announcements.map((a, i) => `
    <div class="bg-white dark:bg-gray-900 rounded-2xl border dark:border-gray-800 p-5 flex flex-col md:flex-row md:items-center gap-4">
      <div class="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-950/50 text-amber-700 flex items-center justify-center"><i data-lucide="megaphone"></i></div>
      <div class="flex-1"><div class="flex gap-2 items-center"><h3 class="font-extrabold">${a.title}</h3>${badge(a.status)}</div><p class="text-sm text-gray-500 mt-1">${a.text}</p><div class="text-xs text-gray-400 mt-2">${a.date}</div></div>
      <div class="flex gap-2 mt-2 md:mt-0">
        <button onclick="DB.announcements[${i}].status=DB.announcements[${i}].status==='Published'?'Draft':'Published';renderAnnouncements();toast('Announcement status updated')" class="px-4 py-2 rounded-xl border border-gray-200 dark:border-gray-700 font-bold hover:bg-gray-50 dark:hover:bg-gray-800 transition cursor-pointer">${a.status === 'Published' ? 'Unpublish' : 'Publish'}</button>
        <button onclick="openEditAnnouncement(${i})" class="px-4 py-2 rounded-xl border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400 font-bold hover:bg-amber-50 dark:hover:bg-amber-950/30 transition cursor-pointer" title="Edit Announcement"><i data-lucide="pencil"></i><span>Edit</span></button>
        <button onclick="requestDelete('announcements','${a.id}')" class="delete-action px-4 py-2" title="Delete Announcement"><i data-lucide="trash-2"></i><span>Delete</span></button>
      </div>
    </div>
  `).join('');
      lucide.createIcons();
    }

/* ============================================================================== */
/* SECTION 9: ACTIVITY & AUDIT LOG TAB (TAB #7) — CHRONOLOGICAL TIMELINE         */
/* Records administrative actions, logins, status updates, deletions, and edits. */
/* Provides category pills, multi-field search, pagination, and actor badges.   */
/* ============================================================================== */

    let currentActivityPage = 1;
    let activityPageSize = 15;
    let activeActivityCategory = 'all';

    function setActivityCategory(cat) {
      activeActivityCategory = cat || 'all';
      document.querySelectorAll('.activity-cat-pill').forEach(btn => {
        const isTarget = btn.dataset.cat === activeActivityCategory;
        if (isTarget) {
          btn.className = 'activity-cat-pill active px-3 py-1.5 rounded-lg font-bold transition cursor-pointer bg-amber-600 text-white shadow-xs';
        } else {
          btn.className = 'activity-cat-pill px-3 py-1.5 rounded-lg font-bold transition cursor-pointer bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700';
        }
      });
      currentActivityPage = 1;
      renderActivity();
    }
    window.setActivityCategory = setActivityCategory;

    function pbkGoToActivityPage(p) {
      currentActivityPage = p;
      renderActivity();
    }

    function pbkActivityPage(delta) {
      currentActivityPage += delta;
      renderActivity();
    }

    async function pbkRefreshActivityLogs() {
      try {
        const res = await fetch(`${API_BASE}/admin/activity-logs`);
        if (res.ok) {
          const data = await res.json();
          if (Array.isArray(data)) {
            DB.activity = data;
            currentActivityPage = 1;
            renderActivity();
            toast('✓ Activity & audit feed refreshed');
            return;
          }
        }
      } catch (e) {
        console.warn('Refresh activity logs error:', e);
      }
      toast('Refreshed activity logs');
      renderActivity();
    }
    window.pbkRefreshActivityLogs = pbkRefreshActivityLogs;

    function getActivityBadgeInfo(type) {
      const t = String(type || '').toLowerCase();
      if (t.includes('login')) {
        return {
          cls: 'bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800',
          icon: 'log-in',
          label: 'Login'
        };
      }
      if (t.includes('delete') || t.includes('archive')) {
        return {
          cls: 'bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-300 border border-rose-200 dark:border-rose-800',
          icon: 'trash-2',
          label: 'Delete'
        };
      }
      if (t.includes('status')) {
        return {
          cls: 'bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800',
          icon: 'toggle-left',
          label: 'Status Change'
        };
      }
      if (t.includes('verif') || t.includes('reject') || t.includes('complet')) {
        return {
          cls: 'bg-purple-50 text-purple-700 dark:bg-purple-950/50 dark:text-purple-300 border border-purple-200 dark:border-purple-800',
          icon: 'check-circle-2',
          label: 'Verification'
        };
      }
      if (t.includes('contribut')) {
        return {
          cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
          icon: 'coins',
          label: 'Contribution'
        };
      }
      if (t.includes('create') || t.includes('add')) {
        return {
          cls: 'bg-teal-50 text-teal-700 dark:bg-teal-950/50 dark:text-teal-300 border border-teal-200 dark:border-teal-800',
          icon: 'plus-circle',
          label: 'Create / Add'
        };
      }
      if (t.includes('publish')) {
        return {
          cls: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800',
          icon: 'send',
          label: 'Publish'
        };
      }
      return {
        cls: 'bg-sky-50 text-sky-700 dark:bg-sky-950/50 dark:text-sky-300 border border-sky-200 dark:border-sky-800',
        icon: 'edit-3',
        label: 'Edit / Update'
      };
    }

    function getActivityMeta(action) {
      const t = String(action || '').toLowerCase();
      if (t.includes('login') || t.includes('logged in') || t.includes('logged out')) return 'login';
      if (t.includes('delete') || t.includes('removed')) return 'delete';
      if (t.includes('verify') || t.includes('verified') || t.includes('reject')) return 'verify';
      if (t.includes('add') || t.includes('added') || t.includes('created')) return 'add';
      if (t.includes('publish') || t.includes('published')) return 'publish';
      return 'edit';
    }

    function getActivityTypeLabel(type) {
      return ({ login: 'Login', add: 'Create / Add', edit: 'Edit / Update', verify: 'Verification', delete: 'Delete', publish: 'Publish', status: 'Status Change', contribution: 'Contribution' })[type] || 'Edit / Update';
    }

    function renderActivityActorBadge(actor, actorRole) {
      const isAdm = actorRole === 'Admin' || /admin|super|primary/i.test(actor);
      const cleanName = String(actor || '').replace(/\s*\([^)]*\)/g, '').trim() || (isAdm ? 'Admin' : 'Member');
      
      const parts = cleanName.split(/\s+/).filter(Boolean);
      const initials = parts.length >= 2 
        ? (parts[0][0] + parts[1][0]).toUpperCase() 
        : (cleanName.slice(0, 2).toUpperCase() || 'AD');
      
      let roleTitle = 'Member';
      let roleBadgeCls = 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-300 dark:border-slate-700';
      let avatarBg = 'bg-slate-100 text-slate-700 border-slate-300 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700';

      const actorLower = String(actor || '').toLowerCase();
      if (actorLower.includes('super admin')) {
        roleTitle = 'Super Admin';
        roleBadgeCls = 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300 border border-amber-300 dark:border-amber-700';
        avatarBg = 'bg-amber-50 text-amber-800 border-amber-300 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-700';
      } else if (actorLower.includes('general admin')) {
        roleTitle = 'General Admin';
        roleBadgeCls = 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-700';
        avatarBg = 'bg-emerald-50 text-emerald-800 border-emerald-300 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-700';
      } else if (isAdm) {
        roleTitle = 'Admin';
        roleBadgeCls = 'bg-blue-100 text-blue-800 dark:bg-blue-950/60 dark:text-blue-300 border border-blue-300 dark:border-blue-700';
        avatarBg = 'bg-blue-50 text-blue-800 border-blue-300 dark:bg-blue-950/60 dark:text-blue-300 dark:border-blue-700';
      }

      return `
        <div class="flex items-center gap-2.5">
          <div class="w-8 h-8 rounded-full flex items-center justify-center font-black text-xs border ${avatarBg} shrink-0 shadow-2xs">
            ${initials}
          </div>
          <div>
            <div class="font-extrabold text-gray-900 dark:text-white text-xs sm:text-sm leading-tight">${pbkEscape(cleanName)}</div>
            <div class="mt-0.5"><span class="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider ${roleBadgeCls}">${roleTitle}</span></div>
          </div>
        </div>
      `;
    }

    function renderActivityTargetDisplay(memberId, memberName, desc) {
      const hasId = memberId && memberId !== '-' && memberId !== '—';
      const hasName = memberName && memberName !== '-' && memberName !== '—';
      
      if (hasId) {
        return `
          <div>
            <span class="font-mono text-xs font-bold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded border border-amber-200 dark:border-amber-800 inline-block">${pbkEscape(memberId)}</span>
            ${hasName ? `<div class="text-xs font-bold text-gray-800 dark:text-gray-200 mt-1">${pbkEscape(memberName)}</div>` : ''}
          </div>
        `;
      }
      
      const descLower = String(desc || '').toLowerCase();
      if (descLower.includes('fund')) {
        return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 dark:bg-teal-950/40 dark:text-teal-300 dark:border-teal-800">Fund Operation</span>`;
      }
      if (descLower.includes('cause') || descLower.includes('event')) {
        return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-purple-50 text-purple-800 border border-purple-200 dark:bg-purple-950/40 dark:text-purple-300 dark:border-purple-800">Cause / Event</span>`;
      }
      if (descLower.includes('setting') || descLower.includes('dashboard')) {
        return `<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold bg-gray-100 text-gray-700 border border-gray-300 dark:bg-gray-800 dark:text-gray-300 dark:border-gray-700">System</span>`;
      }
      if (descLower.includes('login') || descLower.includes('logged in')) {
        return `<span class="text-xs text-gray-400 dark:text-gray-500 font-medium italic">Self Login</span>`;
      }
      return `<span class="text-gray-400 dark:text-gray-500 font-bold text-xs">—</span>`;
    }

    function renderActivity() {
      const container = document.getElementById('activityList');
      if (!container) return;

      const filter = (document.getElementById('activityTypeFilter')?.value || 'all').toLowerCase();
      const search = (document.getElementById('activitySearchInput')?.value || '').trim().toLowerCase();
      const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });

      const allActivities = Array.isArray(DB.activity) ? DB.activity : [];

      // Calculate Summary Metrics
      let adminCount = 0;
      let memberCount = 0;
      let deletionsCount = 0;

      const normalized = allActivities.map((a, index) => {
        const time = a.time || a[0] || '-';
        const actor = a.actor || a[1] || 'Sai Kumar (Super Admin)';
        const desc = a.description || a.action || a[2] || '-';
        const date = a.date || a[3] || today;
        const changeType = a.change_type || (a[4] ? getActivityTypeLabel(a[4]) : getActivityTypeLabel(getActivityMeta(desc)));
        const isAdmin = a.actor_role === 'Admin' || /admin|super|primary/i.test(actor);

        let memberId = a.member_id && a.member_id !== '—' && a.member_id !== '-' ? a.member_id : (a[5] || (String(desc).match(/\bPBK-M\d{3,}/i)?.[0]?.toUpperCase()) || '-');
        let memberName = a.member_name && a.member_name !== '—' && a.member_name !== '-' ? a.member_name : (memberId !== '-' ? (DB.members?.find(m => m.id === memberId)?.name || '-') : '-');

        if (isAdmin) adminCount++; else memberCount++;
        const cLower = changeType.toLowerCase();
        const dLower = String(desc).toLowerCase();
        if (cLower.includes('delete') || cLower.includes('status') || cLower.includes('archive') || dLower.includes('delete') || dLower.includes('archive')) {
          deletionsCount++;
        }

        return {
          index,
          id: a.id || (index + 1),
          time,
          date,
          actor,
          isAdmin,
          actorRole: isAdmin ? 'Admin' : 'Member',
          memberId,
          memberName,
          changeType,
          description: desc
        };
      });

      // Update Metric Cards
      const setEl = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
      setEl('statTotalActivities', allActivities.length);
      setEl('statAdminActions', adminCount);
      setEl('statMemberActions', memberCount);
      setEl('statDeletions', deletionsCount);

      // Filter rows
      const filtered = normalized.filter(r => {
        const cLower = r.changeType.toLowerCase();
        const dLower = r.description.toLowerCase();

        // 1. Check quick category pill filter
        if (activeActivityCategory === 'admin') {
          if (!r.isAdmin) return false;
        } else if (activeActivityCategory === 'member') {
          if (r.isAdmin) return false;
        } else if (activeActivityCategory === 'login') {
          if (!cLower.includes('login') && !dLower.includes('login')) return false;
        } else if (activeActivityCategory === 'status') {
          if (!cLower.includes('status') && !cLower.includes('verif') && !dLower.includes('status') && !dLower.includes('verif')) return false;
        } else if (activeActivityCategory === 'delete') {
          if (!cLower.includes('delete') && !dLower.includes('delete') && !dLower.includes('archived')) return false;
        }

        // 2. Check dropdown type filter
        let matchFilter = true;
        if (filter === 'login') matchFilter = cLower.includes('login') || dLower.includes('login');
        else if (filter === 'edit') matchFilter = cLower.includes('edit') || cLower.includes('update');
        else if (filter === 'status') matchFilter = cLower.includes('status');
        else if (filter === 'verify') matchFilter = cLower.includes('verif') || cLower.includes('reject') || cLower.includes('complet');
        else if (filter === 'delete') matchFilter = cLower.includes('delete') || dLower.includes('delete') || dLower.includes('archived');
        else if (filter === 'contribution') matchFilter = cLower.includes('contribut');
        else if (filter === 'add') matchFilter = cLower.includes('add') || cLower.includes('create');
        else if (filter === 'publish') matchFilter = cLower.includes('publish');

        if (!matchFilter) return false;
        if (!search) return true;

        const haystack = [r.actor, r.memberId, r.memberName, r.changeType, r.description, r.time, r.date].join(' ').toLowerCase();
        return haystack.includes(search);
      });

      // Pagination calculation
      const totalFiltered = filtered.length;
      const totalPages = Math.max(1, Math.ceil(totalFiltered / activityPageSize));
      if (currentActivityPage > totalPages) currentActivityPage = totalPages;
      if (currentActivityPage < 1) currentActivityPage = 1;

      const startIndex = (currentActivityPage - 1) * activityPageSize;
      const endIndex = Math.min(startIndex + activityPageSize, totalFiltered);
      const rows = filtered.slice(startIndex, endIndex);

      // Render Table
      container.innerHTML = `
        <table class="w-full text-sm min-w-[980px]">
          <thead>
            <tr class="text-left text-xs uppercase tracking-wide text-gray-500 dark:text-gray-400 border-b border-gray-200 dark:border-gray-800 bg-gray-50/70 dark:bg-gray-800/40">
              <th class="p-3.5 w-14 text-center">#</th>
              <th class="p-3.5 min-w-[200px]">Actor (Who Did It)</th>
              <th class="p-3.5 min-w-[160px]">Target Member / Entity</th>
              <th class="p-3.5 min-w-[140px]">Change Category</th>
              <th class="p-3.5 min-w-[320px]">What Changed / Details</th>
              <th class="p-3.5 whitespace-nowrap text-right pr-5">Time &amp; Date</th>
            </tr>
          </thead>
          <tbody>
            ${rows.length ? rows.map((r, i) => {
              const serialNo = startIndex + i + 1;
              const badgeInfo = getActivityBadgeInfo(r.changeType);

              return `
              <tr class="border-b border-gray-100 dark:border-gray-800 hover:bg-gray-50/80 dark:hover:bg-gray-800/60 transition">
                <td class="p-3.5 text-center font-bold text-gray-400">
                  <span class="inline-block px-2 py-0.5 rounded-full bg-gray-100 dark:bg-gray-800 text-[11px] font-black text-gray-600 dark:text-gray-300">#${serialNo}</span>
                </td>
                <td class="p-3.5">
                  ${renderActivityActorBadge(r.actor, r.actorRole)}
                </td>
                <td class="p-3.5">
                  ${renderActivityTargetDisplay(r.memberId, r.memberName, r.description)}
                </td>
                <td class="p-3.5">
                  <span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold ${badgeInfo.cls}">
                    <i data-lucide="${badgeInfo.icon}" class="w-3.5 h-3.5"></i>
                    ${pbkEscape(badgeInfo.label || r.changeType)}
                  </span>
                </td>
                <td class="p-3.5">
                  <p class="text-xs text-gray-800 dark:text-gray-200 font-medium leading-relaxed">${pbkEscape(r.description)}</p>
                </td>
                <td class="p-3.5 whitespace-nowrap text-right pr-5">
                  <div class="text-xs font-black text-gray-900 dark:text-white">${pbkEscape(r.time)}</div>
                  <div class="text-[11px] font-semibold text-gray-400 dark:text-gray-500 mt-0.5">${pbkEscape(r.date)}</div>
                </td>
              </tr>
            `;
            }).join('') : `
              <tr>
                <td colspan="6" class="py-12 px-4 text-center">
                  <div class="flex flex-col items-center justify-center gap-3 max-w-sm mx-auto">
                    <div class="w-12 h-12 rounded-2xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 flex items-center justify-center">
                      <i data-lucide="history" class="w-6 h-6"></i>
                    </div>
                    <h3 class="font-extrabold text-sm text-gray-800 dark:text-gray-200">No activity records found</h3>
                    <p class="text-xs text-gray-500 dark:text-gray-400">No events match the selected category or search keywords.</p>
                    <button type="button" onclick="setActivityCategory('all'); if (document.getElementById('activitySearchInput')) document.getElementById('activitySearchInput').value=''; if (document.getElementById('activityTypeFilter')) document.getElementById('activityTypeFilter').value='all'; renderActivity();" class="px-3.5 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer">Reset All Filters</button>
                  </div>
                </td>
              </tr>
            `}
          </tbody>
        </table>
      `;

      // Render Pagination Bar
      const paginationBar = document.getElementById('activityPaginationBar');
      if (paginationBar) {
        if (totalFiltered === 0) {
          paginationBar.innerHTML = `<span class="font-medium text-gray-500">Showing 0 activity logs</span>`;
        } else {
          let pagesHtml = `<div class="flex items-center gap-2 font-medium text-gray-600 dark:text-gray-300"><span>Showing <strong>${startIndex + 1}–${endIndex}</strong> of <strong>${totalFiltered}</strong> activities</span></div>`;
          pagesHtml += `<div class="flex items-center gap-1">`;
          pagesHtml += `<button type="button" onclick="pbkActivityPage(-1)" ${currentActivityPage <= 1 ? 'disabled class="px-2.5 py-1 rounded-lg border dark:border-gray-700 opacity-40 cursor-not-allowed font-bold"' : 'class="px-2.5 py-1 rounded-lg border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold transition cursor-pointer"'}>‹</button>`;
          for (let p = 1; p <= totalPages; p++) {
            if (p === 1 || p === totalPages || (p >= currentActivityPage - 1 && p <= currentActivityPage + 1)) {
              pagesHtml += `<button type="button" onclick="pbkGoToActivityPage(${p})" class="px-3 py-1 rounded-lg font-bold transition cursor-pointer ${p === currentActivityPage ? 'bg-amber-600 text-white shadow-xs' : 'border border-gray-200 dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800'}">${p}</button>`;
            } else if (p === currentActivityPage - 2 || p === currentActivityPage + 2) {
              pagesHtml += `<span class="px-1 text-gray-400">...</span>`;
            }
          }
          pagesHtml += `<button type="button" onclick="pbkActivityPage(1)" ${currentActivityPage >= totalPages ? 'disabled class="px-2.5 py-1 rounded-lg border dark:border-gray-700 opacity-40 cursor-not-allowed font-bold"' : 'class="px-2.5 py-1 rounded-lg border dark:border-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 font-bold transition cursor-pointer"'}>›</button>`;
          pagesHtml += `</div>`;
          paginationBar.innerHTML = pagesHtml;
        }
      }

      if (window.lucide) lucide.createIcons();
    }

    function addActivity(text, actor = '', memberId = '', memberName = '', changeType = '') {
      const now = new Date();
      const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const dateStr = now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
      
      const session = getAdminSession();
      const defaultActor = session ? `${session.name} (${session.role || 'Admin'})` : 'Sai Kumar (Super Admin)';
      const resolvedActor = actor || defaultActor;
      const isAdm = /admin|super|primary/i.test(resolvedActor);

      const mId = memberId || (String(text).match(/\bPBK-M\d{3,}/i)?.[0]?.toUpperCase()) || '-';
      const mName = memberName || (mId !== '-' ? (DB.members?.find(m => m.id === mId)?.name || '-') : '-');
      const resolvedType = changeType || getActivityTypeLabel(getActivityMeta(text));

      const newLogObj = {
        id: Date.now(),
        time: timeStr,
        date: dateStr,
        actor: resolvedActor,
        actor_role: isAdm ? 'Admin' : 'Member',
        member_id: mId,
        member_name: mName,
        change_type: resolvedType,
        action: resolvedType,
        description: text
      };

      if (!Array.isArray(DB.activity)) DB.activity = [];
      DB.activity.unshift(newLogObj);
      renderActivity();
    }

    document.getElementById('activityTypeFilter')?.addEventListener('change', () => {
      currentActivityPage = 1;
      renderActivity();
    });
    document.getElementById('activitySearchInput')?.addEventListener('input', () => {
      currentActivityPage = 1;
      renderActivity();
    });

/* ============================================================================== */
/* SECTION 3 (CONT.): OVERVIEW TAB — RECENT CONTRIBUTIONS & VISUAL CHARTS         */
/* Renders the top 5 recent contributions feed on the dashboard overview and      */
/* builds the Chart.js visual financial performance breakdown bar/line charts.    */
/* ============================================================================== */

    function renderRecent() {
      const container = document.getElementById('recentTable');
      if (!container) return;

      // Recent Contributions is read directly from the same DB.contributions
      // records used by Receipt Management, so the displayed data stays synchronized.
      const rows = (Array.isArray(DB.contributions) ? DB.contributions : []).slice(0, 5);

      container.innerHTML = `
    <div class="table-wrap overflow-x-auto">
      <table class="w-full text-sm">
        <thead>
          <tr class="text-left text-xs uppercase text-gray-500 border-b dark:border-gray-800">
            <th class="p-3">Date</th>
            <th class="p-3">Receipt ID</th>
            <th class="p-3">Member</th>
            <th class="p-3">Fund</th>
            <th class="p-3">Payment Method</th>
            <th class="p-3">Amount</th>
            <th class="p-3">Status</th>
            <th class="p-3 text-right">Receipt</th>
          </tr>
        </thead>
        <tbody>
          ${rows.length ? rows.map(c => `
            <tr class="border-b dark:border-gray-800">
              <td class="p-3">${pbkEscape(c.date || '—')}</td>
              <td class="p-3 font-bold">${pbkEscape(c.id || '—')}</td>
              <td class="p-3 font-bold">${pbkEscape(c.member || '—')}</td>
              <td class="p-3">${pbkEscape(c.fund || '—')}</td>
              <td class="p-3">${pbkEscape(c.method || '—')}</td>
              <td class="p-3 font-bold">${money(c.amount)}</td>
              <td class="p-3">${badge(c.status)}</td>
              <td class="p-3 text-right">
                <button type="button"
                  onclick="pbkOpenReceiptPreview('${pbkEscape(c.id)}')"
                  class="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-700 text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/30 font-bold text-xs cursor-pointer"
                  title="View receipt">
                  <i data-lucide="receipt" class="w-3.5 h-3.5"></i>
                  View Receipt
                </button>
              </td>
            </tr>
          `).join('') : `
            <tr>
              <td colspan="8" class="p-8 text-center text-gray-400">No recent contributions found.</td>
            </tr>
          `}
        </tbody>
      </table>
    </div>
  `;

      lucide.createIcons();
    }


    function drawChart() {
      const el = document.getElementById('fundChart');
      if (!el) return;
      if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
      }
      const isDark = document.documentElement.classList.contains('dark');
      const selectedYear = document.getElementById('yearGlobal')?.value || 
                           document.getElementById('fundYearSelect')?.value || 
                           '2026 - 2027';

      const yearBadge = document.getElementById('fundChartYearBadge');
      if (yearBadge) yearBadge.textContent = 'FY ' + selectedYear;

      const allFunds = Array.isArray(DB.funds) ? DB.funds : [];
      let fundsForChart = allFunds.filter(f => f.year === selectedYear);
      if (fundsForChart.length === 0 && allFunds.length > 0) {
        fundsForChart = allFunds;
      }

      let labels = [];
      let collectedData = [];
      let usedData = [];

      if (fundsForChart.length > 0) {
        const map = new Map();
        fundsForChart.forEach(f => {
          const name = f.name || 'Unnamed Fund';
          if (!map.has(name)) {
            map.set(name, {
              collected: Number(f.collected) || 0,
              used: Number(f.used) || 0
            });
          } else {
            const item = map.get(name);
            item.collected += Number(f.collected) || 0;
            item.used += Number(f.used) || 0;
          }
        });

        labels = Array.from(map.keys());
        collectedData = labels.map(l => map.get(l).collected);
        usedData = labels.map(l => map.get(l).used);
      } else {
        labels = ['Youth Fund', 'Village Fund', 'General Fund', 'Community Dev'];
        collectedData = [0, 0, 0, 0];
        usedData = [0, 0, 0, 0];
      }

      const maxVal = Math.max(0, ...collectedData, ...usedData);
      const suggestedMax = maxVal > 0 ? Math.ceil(maxVal * 1.25) : 50000;

      chartInstance = new Chart(el, {
        type: 'bar',
        data: {
          labels: labels,
          datasets: [
            {
              label: 'Collected',
              data: collectedData,
              backgroundColor: '#b45309',
              borderRadius: 6,
              barPercentage: 0.6,
              categoryPercentage: 0.8
            },
            {
              label: 'Used',
              data: usedData,
              backgroundColor: isDark ? '#374151' : '#9ca3af',
              borderRadius: 6,
              barPercentage: 0.6,
              categoryPercentage: 0.8
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              labels: {
                color: isDark ? '#e5e7eb' : '#374151',
                font: { weight: 'bold' }
              }
            },
            tooltip: {
              callbacks: {
                label: function (ctx) {
                  return `${ctx.dataset.label}: ₹${Number(ctx.raw || 0).toLocaleString('en-IN')}`;
                }
              }
            }
          },
          scales: {
            y: {
              beginAtZero: true,
              suggestedMax: suggestedMax,
              ticks: {
                color: isDark ? '#9ca3af' : '#4b5563',
                callback: v => {
                  if (v === 0) return '₹0';
                  if (v >= 1000) return '₹' + (v / 1000) + 'k';
                  return '₹' + v;
                }
              },
              grid: {
                color: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.05)'
              }
            },
            x: {
              grid: { display: false },
              ticks: {
                color: isDark ? '#9ca3af' : '#4b5563',
                font: { weight: 'bold' }
              }
            }
          }
        }
      });
    }

/* ============================================================================== */
/* SECTION 11: THEME MANAGEMENT, APPEARANCE & SYSTEM PREFERENCES                */
/* Configures Dark/Light/System theme toggles, system color scheme listeners,    */
/* and re-renders Chart.js instances according to the active theme palette.      */
/* ============================================================================== */

    function applyTheme(mode) {
      const norm = (mode === 'white' || mode === 'light') ? 'light' : mode;
      localStorage.setItem('pbk_theme', norm);
      localStorage.setItem('pbk_admin_theme', norm);
      let dark = norm === 'dark' || (norm === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
      document.documentElement.classList.toggle('dark', dark);
      const themeText = document.getElementById('themeText');
      if (themeText) themeText.textContent = norm[0].toUpperCase() + norm.slice(1);
      if (document.getElementById('view-overview')?.classList.contains('active')) drawChart();
      if (document.getElementById('view-funds')?.classList.contains('active')) { renderFundManagement(); renderFundUsage(); }
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
      const saved = localStorage.getItem('pbk_theme') || localStorage.getItem('pbk_admin_theme') || 'system';
      if (saved === 'system') applyTheme('system');
    });

    document.addEventListener('click', e => {
      const nav = e.target.closest('[data-view]');
      if (nav) { showView(nav.dataset.view); return; }
      const op = e.target.closest('[data-open]');
      if (op) openModal(op.dataset.open);
      const cl = e.target.closest('[data-close]');
      if (cl) closeModal(cl.dataset.close);
    });

    document.getElementById('mobileBtn').onclick = () => {
      document.getElementById('sidebar').classList.toggle('-translate-x-[calc(100%+1rem)]');
      document.getElementById('overlay').classList.toggle('hidden');
    };
    document.getElementById('overlay').onclick = () => {
      document.getElementById('sidebar').classList.add('-translate-x-[calc(100%+1rem)]');
      document.getElementById('overlay').classList.add('hidden');
    };
    document.getElementById('themeBtn').onclick = () => document.getElementById('themeMenu').classList.toggle('hidden');
    document.querySelectorAll('.themeChoice').forEach(b => b.onclick = () => {
      applyTheme(b.dataset.theme);
      document.getElementById('themeMenu').classList.add('hidden');
    });
    document.getElementById('logoutBtn').onclick = () => {
      if (confirm('Log out of the Admin Dashboard?')) {
        logoutAdmin();
      }
    };

    document.getElementById('saveMember').onclick = async () => {
      if (!canEditMembers()) {
        toast('Permission Denied: Only Super Admin can add or edit members.');
        return;
      }
      const saveBtn = document.getElementById('saveMember');
      let id = saveBtn.dataset.edit;
      const firstName = document.getElementById('mFirstName').value.trim();
      const lastName = document.getElementById('mLastName').value.trim();
      const fullName = (firstName + ' ' + lastName).trim() || 'New Member';
      const dob = document.getElementById('mDob').value;
      const gender = document.getElementById('mGender').value;
      const rawPhone = document.getElementById('mPhone').value.trim();
      let email = document.getElementById('mEmail').value.trim();
      if (email.toLowerCase() === 'n/a' || email.toLowerCase() === 'none') {
        email = '';
      }
      const memberType = document.getElementById('mType').value;
      const status = document.getElementById('mStatus').value;

      if (!firstName) {
        toast('Please enter member first name');
        return;
      }

      if (!rawPhone || rawPhone.length !== 10) {
        toast('Please enter a valid 10-digit phone number');
        return;
      }

      // Helper function to extract 10 digits from any phone format
      const cleanPhoneDigits = (p) => String(p || '').replace(/\D/g, '').slice(-10);

      // Pre-check duplicate phone against DB.members
      const dupPhoneMember = DB.members.find(m => (!id || m.id !== id) && cleanPhoneDigits(m.phone) === rawPhone);
      if (dupPhoneMember) {
        toast(`Phone number is already taken by ${dupPhoneMember.name || dupPhoneMember.id}!`);
        return;
      }

      // Pre-check duplicate email against DB.members (if email provided)
      if (email) {
        const cleanEmailLower = email.toLowerCase();
        const dupEmailMember = DB.members.find(m => (!id || m.id !== id) && m.email && m.email.toLowerCase() === cleanEmailLower && m.email.toLowerCase() !== 'n/a');
        if (dupEmailMember) {
          toast(`Email address is already taken by ${dupEmailMember.name || dupEmailMember.id}!`);
          return;
        }
      }

      const formattedPhone = '+91 ' + rawPhone;
      const origBtnText = saveBtn.textContent;
      saveBtn.disabled = true;
      saveBtn.textContent = 'Saving...';

      try {
        if (id) {
          let m = DB.members.find(x => x.id === id);
          if (m) {
            if (m.db_id) {
              const res = await fetch(`${API_BASE}/admin/members/${m.db_id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  first_name: firstName,
                  last_name: lastName,
                  gender: gender,
                  phone: rawPhone,
                  email: email || null,
                  dob: dob,
                  member_type: memberType,
                  status: status
                })
              });

              const data = await res.json().catch(() => ({}));
              if (!res.ok) {
                toast(data.detail || 'Failed to update member in database');
                return;
              }
            }

            m.firstName = firstName;
            m.lastName = lastName;
            m.name = fullName;
            m.dob = dob;
            m.gender = gender;
            m.phone = formattedPhone;
            m.email = email || 'N/A';
            m.memberType = memberType;
            m.status = status;
            toast('Member updated successfully in database');
            addActivity('Edited member ' + id);
            closeModal('memberModal');
            delete saveBtn.dataset.edit;
            renderMembers();
            updateOverviewStats();
          }
        } else {
          const initialPassword = document.getElementById('mPassword')?.value.trim() || 'Member@123';

          const res = await fetch(`${API_BASE}/admin/members`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              first_name: firstName,
              last_name: lastName,
              gender: gender,
              phone: rawPhone,
              email: email || null,
              dob: dob,
              member_type: memberType,
              status: status,
              password: initialPassword
            })
          });

          const data = await res.json().catch(() => ({}));
          if (!res.ok) {
            toast(data.detail || 'Failed to save member to database');
            return;
          }

          const newDbId = data.id;
          const memberNumbers = DB.members.map(m => parseInt(String(m.id).replace(/\D/g, ''), 10) || 0);
          const newId = newDbId ? `PBK-M${String(newDbId).padStart(3, '0')}` : `PBK-M${String(Math.max(0, ...memberNumbers) + 1).padStart(3, '0')}`;
          const newMemberObj = {
            id: newId,
            db_id: newDbId,
            name: fullName,
            firstName: firstName,
            lastName: lastName,
            dob: dob,
            gender: gender,
            phone: formattedPhone,
            email: email || 'N/A',
            memberType: memberType,
            status: status,
            verified: true,
            joinDate: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
          };

          DB.members.unshift(newMemberObj);
          toast(`Member saved to database! Login: +91 ${rawPhone} | Password: ${initialPassword}`);
          addActivity('Added new member ' + newId);
          closeModal('memberModal');
          delete saveBtn.dataset.edit;
          renderMembers();
          updateOverviewStats();
        }
      } catch (err) {
        console.error('Member save error:', err);
        toast('Connection error: could not connect to server');
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = origBtnText;
      }
    };

    function editMember(id) {
      if (!canEditMembers()) {
        toast('Permission Denied: Only Super Admin can edit members.');
        return;
      }
      const m = DB.members.find(x => x.id === id);
      if (!m) return;
      document.getElementById('saveMember').dataset.edit = id;
      document.getElementById('mFirstName').value = m.firstName || m.name.split(' ')[0] || '';
      document.getElementById('mLastName').value = m.lastName || m.name.split(' ').slice(1).join(' ') || '';
      document.getElementById('mDob').value = m.dob || '';
      document.getElementById('mGender').value = m.gender || 'Male';
      let cleanPhone = m.phone ? m.phone.replace('+91', '').trim() : '';
      document.getElementById('mPhone').value = cleanPhone;
      document.getElementById('mEmail').value = (m.email && m.email !== 'N/A') ? m.email : '';
      document.getElementById('mType').value = m.memberType || 'General';
      document.getElementById('mStatus').value = m.status || 'Active';
      const pwdGroup = document.getElementById('mPasswordGroup');
      if (pwdGroup) pwdGroup.style.display = 'none';
      const head = document.getElementById('memberModalHead');
      if (head) head.innerHTML = `<div class="flex justify-between items-center mb-5"><h2 class="text-xl font-extrabold">Edit Member Details</h2><button data-close="memberModal" class="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer"><i data-lucide="x"></i></button></div>`;
      if (typeof lucide !== 'undefined') lucide.createIcons();
      openModal('memberModal');
    }

    document.getElementById('saveContribution').onclick = () => {
      const save = document.getElementById('saveContribution');
      const editId = save.dataset.edit;
      const memberId = document.getElementById('cMemberId').value.trim();

      const memberObj = DB.members.find(m => m.id === memberId);
      if (!memberObj) {
        toast('Invalid Member ID. Please check and try again.');
        return;
      }
      const member = memberObj.name;

      const amount = Number(document.getElementById('cAmount').value) || 0;
      const fund = document.getElementById('cFund').value;
      const method = document.getElementById('cMethod').value;
      let ref = document.getElementById('cRef').value.trim();
      const status = document.getElementById('cStatus').value;
      const dateInputVal = document.getElementById('cDate').value;
      const formattedDate = formatDateForDisplay(dateInputVal);

      if (amount <= 0) { toast('Enter a valid contribution amount'); return; }

      if (method === 'Cash') {
        ref = '';
      } else if (!ref && !editId) {
        ref = `${method === 'UPI' ? 'UPI' : 'REF'}${Date.now().toString().slice(-8)}`;
      }

      if (editId) {
        const c = DB.contributions.find(x => x.id === editId);
        if (c) {
          c.member = member; c.amount = amount; c.fund = fund; c.method = method; c.ref = ref; c.status = status;
          c.date = formattedDate;
          toast('Receipt / contribution updated');
          addActivity('Edited contribution ' + editId);

          if (c.db_id) {
            fetch(`${API_BASE}/admin/contributions/${c.db_id}/status?status=${encodeURIComponent(status.toLowerCase())}`, {
              method: 'PUT'
            }).catch(e => console.warn('Contribution status sync:', e));
          }
        }
      } else {
        const numericIds = DB.contributions.map(c => parseInt(String(c.id).replace(/\D/g, ''), 10) || 0);
        const nextId = Math.max(0, ...numericIds) + 1;
        const newCId = 'PBK-C' + String(nextId).padStart(3, '0');
        const newContribObj = {
          id: newCId, member, fund, amount, method, status: status || 'Pending',
          date: formattedDate,
          ref: ref || `${method === 'UPI' ? 'UPI' : 'REF'}${Date.now().toString().slice(-8)}`
        };
        DB.contributions.unshift(newContribObj);
        toast(`Contribution ${newCId} saved`);
        addActivity('Added new contribution ' + newCId);

        const mDbId = memberObj.db_id || 1;
        fetch(`${API_BASE}/members/${mDbId}/contributions`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contribution_amount: amount,
            fund_name: fund,
            payment_method: method,
            transaction_reference: newContribObj.ref,
            contribution_date: dateInputVal || null,
            status: (status || 'Pending').toLowerCase()
          })
        }).then(r => r.json()).then(res => {
          if (res.id) newContribObj.db_id = res.id;
        }).catch(e => console.warn('Contribution create sync:', e));
      }
      delete save.dataset.edit;
      save.textContent = 'Save Contribution';
      closeModal('contributionModal');
      renderReceipts();
      renderRecent();
      renderFundManagement();
      updateOverviewStats();
      drawChart();
      syncFundsWithBackend();
    };

    document.getElementById('saveCause').onclick = () => {
      const activeMembersCount = (DB.members || []).filter(m => m.status === 'Active').length || (DB.members || []).length || 1;
      const targetPerMem = Number(document.getElementById('causeTarget').value) || 0;
      const totalTarget = targetPerMem * activeMembersCount;

      if (currentEditCauseIndex >= 0) {
        const c = DB.causes[currentEditCauseIndex];
        c.name = document.getElementById('causeName').value.trim() || 'Unnamed Cause';
        c.desc = document.getElementById('causeDesc').value.trim() || '';
        c.target_per_member = targetPerMem;
        c.target = totalTarget;
        toast('Cause updated successfully');
        if (typeof addActivity === 'function') addActivity(`Updated cause "${c.name}" - Target: ₹${targetPerMem}/member`);

        if (c.db_id) {
          fetch(`${API_BASE}/causes/${c.db_id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: c.name, description: c.desc, target_per_member: targetPerMem, target_amount: totalTarget })
          }).catch(e => console.warn('Cause update error:', e));
        }
      } else {
        const cName = document.getElementById('causeName').value.trim() || 'New Cause';
        const cDesc = document.getElementById('causeDesc').value.trim() || 'Community cause';
        const newCauseObj = {
          id: 'CAUSE-' + String(Date.now()).slice(-4),
          name: cName,
          desc: cDesc,
          target_per_member: targetPerMem,
          target: totalTarget,
          raised: 0,
          status: 'Draft'
        };
        DB.causes.push(newCauseObj);
        toast('✓ Cause created as Draft (Unpublished). Review details and click Publish when ready.');
        if (typeof addActivity === 'function') addActivity(`Created new cause "${cName}" (Draft) - Target: ₹${targetPerMem}/member`);

        fetch(`${API_BASE}/causes`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            cause_code: newCauseObj.id,
            name: cName,
            description: cDesc,
            target_per_member: targetPerMem,
            target_amount: totalTarget,
            status: 'Draft'
          })
        }).then(r => r.json()).then(res => {
          if (res.cause_id) newCauseObj.db_id = res.cause_id;
        }).catch(e => console.warn('Cause create error:', e));
      }
      closeModal('causeModal');
      renderCauses();
    };

    document.getElementById('saveAnnouncement').onclick = () => {
      const title = document.getElementById('annTitle').value.trim() || 'New Announcement';
      const text = document.getElementById('annText').value.trim() || '';

      if (editingAnnouncementId) {
        const announcement = DB.announcements.find(a => String(a.id) === String(editingAnnouncementId));
        if (announcement) {
          announcement.title = title;
          announcement.text = text;
          toast('Announcement updated successfully');
          addActivity(`Edited announcement: ${title}`);

          if (announcement.db_id) {
            fetch(`${API_BASE}/announcements/${announcement.db_id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ title, message: text })
            }).catch(e => console.warn('Announcement update error:', e));
          }
        }
      } else {
        const newAnnObj = {
          id: 'ANN-' + String(Date.now()).slice(-4),
          title,
          text,
          status: 'Published',
          date: new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
        };
        DB.announcements.unshift(newAnnObj);
        toast('Announcement published');
        addActivity('Created announcement');

        fetch(`${API_BASE}/announcements`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            message: text,
            announcement_type: 'General',
            status: 'Published'
          })
        }).then(r => r.json()).then(res => {
          if (res.announcement_id) newAnnObj.db_id = res.announcement_id;
        }).catch(e => console.warn('Announcement create error:', e));
      }

      editingAnnouncementId = null;
      document.getElementById('saveAnnouncement').textContent = 'Publish';
      closeModal('announcementModal');
      renderAnnouncements();
    };

    document.querySelectorAll('.saveBtn').forEach(b => {
      b.onclick = () => {
        toast('Settings saved in demo mode');
        addActivity('Updated system settings');
      };
    });

    window.onload = function () {
      const activeTheme = localStorage.getItem('pbk_theme') || localStorage.getItem('pbk_admin_theme') || 'system';
      applyTheme(activeTheme);
      renderDynamicHeaders();
      loadAdminProfile();
      loadAdminDataFromBackend();
      lucide.createIcons();
      setTimeout(drawChart, 100);

      const cMethodSelect = document.getElementById('cMethod');
      if (cMethodSelect) {
        cMethodSelect.addEventListener('change', function () {
          const refContainer = document.getElementById('cRefContainer');
          const refInput = document.getElementById('cRef');
          if (this.value === 'Cash') {
            refContainer.style.display = 'none';
            refInput.value = '';
          } else {
            refContainer.style.display = 'block';
          }
        });
      }

      const mobileBtn = document.getElementById('mobileBtn');
      const sidebar = document.getElementById('sidebar');
      const overlay = document.getElementById('overlay');

      if (mobileBtn && sidebar && overlay) {
        mobileBtn.onclick = () => {
          sidebar.classList.toggle('-translate-x-[calc(100%+1rem)]');
          overlay.classList.toggle('hidden');
        };
        overlay.onclick = () => {
          sidebar.classList.add('-translate-x-[calc(100%+1rem)]');
          overlay.classList.add('hidden');
        };
      }

      // Initial load of Donation & Scanner Settings
      if (typeof fetchAdminDonationSettings === 'function') {
        fetchAdminDonationSettings();
      }
    };

/* ============================================================================== */
/* SECTION 5 (CONT.): DONATION & SCANNER / UPI SETTINGS (FUNDS TAB)               */
/* Configures organization UPI ID (VPA), payee account, banking details, notes,  */
/* generates dynamic test payment QR codes, and persists settings to backend.    */
/* ============================================================================== */
    let adminDonationSettings = null;

    async function fetchAdminDonationSettings() {
      try {
        const res = await fetch(`${API_BASE}/donation-settings`);
        if (res.ok) {
          adminDonationSettings = await res.json();
        } else {
          adminDonationSettings = JSON.parse(localStorage.getItem('pbk_donation_settings') || 'null');
        }
      } catch (e) {
        adminDonationSettings = JSON.parse(localStorage.getItem('pbk_donation_settings') || 'null');
      }

      if (!adminDonationSettings) {
        adminDonationSettings = {
          upi_id: 'chanda.collection@bank',
          payee_name: 'PBK Community Welfare Fund',
          bank_name: 'State Bank of India',
          account_number: '987654321012',
          ifsc_code: 'SBIN0001234',
          branch_name: 'Main Branch',
          notes: 'PBK Chanda Contribution'
        };
      }

      const upiInput = document.getElementById('adminSettingUpiId');
      const payeeInput = document.getElementById('adminSettingPayeeName');
      const bankInput = document.getElementById('adminSettingBankName');
      const accInput = document.getElementById('adminSettingAccountNumber');
      const ifscInput = document.getElementById('adminSettingIfscCode');
      const branchInput = document.getElementById('adminSettingBranchName');
      const notesInput = document.getElementById('adminSettingNotes');

      if (upiInput && (!upiInput.value || !upiInput.matches(':focus'))) upiInput.value = adminDonationSettings.upi_id || '';
      if (payeeInput && (!payeeInput.value || !payeeInput.matches(':focus'))) payeeInput.value = adminDonationSettings.payee_name || '';
      if (bankInput && (!bankInput.value || !bankInput.matches(':focus'))) bankInput.value = adminDonationSettings.bank_name || '';
      if (accInput && (!accInput.value || !accInput.matches(':focus'))) accInput.value = adminDonationSettings.account_number || '';
      if (ifscInput && (!ifscInput.value || !ifscInput.matches(':focus'))) ifscInput.value = adminDonationSettings.ifsc_code || '';
      if (branchInput && (!branchInput.value || !branchInput.matches(':focus'))) branchInput.value = adminDonationSettings.branch_name || '';
      if (notesInput && (!notesInput.value || !notesInput.matches(':focus'))) notesInput.value = adminDonationSettings.notes || '';

      updateAdminQrPreview();
    }

    function updateAdminQrPreview() {
      const upiId = document.getElementById('adminSettingUpiId')?.value.trim() || 'chanda.collection@bank';
      const payeeName = document.getElementById('adminSettingPayeeName')?.value.trim() || 'PBK Community Welfare Fund';
      const notes = document.getElementById('adminSettingNotes')?.value.trim() || 'PBK Chanda Contribution';

      const pPayee = document.getElementById('adminPreviewPayeeText');
      const pUpi = document.getElementById('adminPreviewUpiText');
      if (pPayee) pPayee.textContent = payeeName;
      if (pUpi) pUpi.textContent = upiId;

      const container = document.getElementById('adminQrPreviewContainer');
      if (!container) return;
      container.innerHTML = '';

      const upiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payeeName)}&am=501&cu=INR&tn=${encodeURIComponent(notes)}`;

      if (typeof QRCode !== 'undefined') {
        new QRCode(container, {
          text: upiUrl,
          width: 140,
          height: 140,
          colorDark: "#1f2937",
          colorLight: "#ffffff",
          correctLevel: QRCode.CorrectLevel.M
        });
      } else {
        const img = document.createElement('img');
        img.src = `https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(upiUrl)}`;
        img.alt = 'QR Code';
        img.className = 'w-36 h-36 mx-auto';
        container.appendChild(img);
      }
    }

    async function saveDonationSettings() {
      const upiId = document.getElementById('adminSettingUpiId')?.value.trim();
      const payeeName = document.getElementById('adminSettingPayeeName')?.value.trim();
      if (!upiId) {
        toast('Please enter a valid UPI ID (VPA)');
        return;
      }
      if (!payeeName) {
        toast('Please enter a Payee / Organization Name');
        return;
      }

      const payload = {
        upi_id: upiId,
        payee_name: payeeName,
        bank_name: document.getElementById('adminSettingBankName')?.value.trim() || '',
        account_number: document.getElementById('adminSettingAccountNumber')?.value.trim() || '',
        ifsc_code: document.getElementById('adminSettingIfscCode')?.value.trim() || '',
        branch_name: document.getElementById('adminSettingBranchName')?.value.trim() || '',
        notes: document.getElementById('adminSettingNotes')?.value.trim() || 'PBK Chanda Contribution'
      };

      const btn = document.getElementById('btnSaveDonationSettings');
      const originalHtml = btn ? btn.innerHTML : '';
      if (btn) btn.innerHTML = '<i data-lucide="loader-2" class="w-4 h-4 animate-spin"></i> Saving...';

      try {
        const res = await fetch(`${API_BASE}/donation-settings`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Admin-Role': (window.CURRENT_ADMIN && window.CURRENT_ADMIN.role) || 'Super Admin',
            'X-Admin-Id': String((window.CURRENT_ADMIN && window.CURRENT_ADMIN.id) || 1)
          },
          body: JSON.stringify(payload)
        });
        if (res.ok) {
          adminDonationSettings = await res.json();
          localStorage.setItem('pbk_donation_settings', JSON.stringify(adminDonationSettings));
          toast('✓ Donation & UPI Scanner settings updated successfully');
        } else {
          localStorage.setItem('pbk_donation_settings', JSON.stringify(payload));
          toast('✓ Donation settings saved locally');
        }
      } catch (err) {
        localStorage.setItem('pbk_donation_settings', JSON.stringify(payload));
        toast('✓ Donation settings saved locally');
      } finally {
        if (btn) btn.innerHTML = originalHtml;
        if (typeof lucide !== 'undefined') lucide.createIcons();
        updateAdminQrPreview();
      }
    }

    window.saveDonationSettings = saveDonationSettings;
    window.updateAdminQrPreview = updateAdminQrPreview;
    window.fetchAdminDonationSettings = fetchAdminDonationSettings;

