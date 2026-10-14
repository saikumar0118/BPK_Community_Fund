
/* ==============================================================================
 * BPK Community Fund - Member Portal Client Logic (script.js)
 * ==============================================================================
 * Manages all client-side state, tab routing, KPI rendering, live notifications,
 * dynamic amount-embedded QR generator, member profile updates, security OTPs,
 * and 30-day soft deletion lifecycle for the Member Portal.
 *
 * Section Index:
 *   1. Initialization & Session State
 *   2. Fund Usage & Allocation Rendering     -> Dashboard & Fund Details Tabs
 *   3. Interactive Charts & Visual Analytics -> Dashboard Tab
 *   4. Contribution History & Tables         -> Dashboard & My Contributions Tabs
 *   5. SPA Tab Router & Sidebar Navigation   -> Global Navigation
 *   6. Top Header, Themes & Notification Bell-> Headbar & Dropdowns
 *   7. Member Profile & Security Updates     -> Profile Tab
 *   8. Quick Contribution & PDF Receipts     -> Contribute Modal & Receipt Modal
 *   9. Session Management & Member Logout    -> Auth Lifecycle
 *  10. Dynamic Amount-Embedded QR Generator  -> Contribute Tab
 *  11. Account Disable & 30-Day Retention OTP-> Profile (Security Subtab)
 * ============================================================================== */

// ==============================================================================
// SECTION 1: INITIALIZATION & SESSION STATE
// ==============================================================================
if (typeof lucide !== 'undefined' && lucide.createIcons) {
    lucide.createIcons();
}

const today = new Date();
const offset = today.getTimezoneOffset() * 60000;
const localDate = new Date(today.getTime() - offset).toISOString().split('T')[0];
const mDateEl = document.getElementById('modalDate');
if (mDateEl) mDateEl.value = localDate;

let userContributions = [];

const savedMemberSession = JSON.parse(sessionStorage.getItem('pbk_member') || 'null');
let activeMemberId = savedMemberSession?.member_id || savedMemberSession?.id || null;

        let memberProfile = {
            firstName: savedMemberSession?.first_name || '',
            lastName: savedMemberSession?.last_name || '',
            dob: '',
            dobRaw: '',
            doorNo: '',
            village: '',
            city: '',
            district: '',
            state: '',
            address: '',
            phone: savedMemberSession?.phone || '',
            email: savedMemberSession?.email || '',
            phoneVerified: true,
            emailVerified: true
        };

        let allFundUsage = [];
        let allFundsData = [];
        let allDashboardStats = null;

// ==============================================================================
// SECTION 2: FUND USAGE & ALLOCATION RENDERING
// Linked Tabs: Dashboard Tab & Fund Details Tab
// Functions:
//   - renderMemberFundUsage()   : Populates the full transparency expenditures table
//   - renderMemberRecentUsage() : Populates recent fund disbursements on Dashboard
//   - renderMemberFundOverview(): Syncs target balances, collections & percentages
// ==============================================================================
function renderMemberFundUsage() {
            const tbody = document.getElementById('memberFundUsageTableBody');
            if (!tbody) return;

            const filterType = document.getElementById('memberFundUsageFilter')?.value || 'all';
            let list = Array.isArray(allFundUsage) ? [...allFundUsage] : [];

            if (filterType !== 'all') {
                list = list.filter(u => (u.fundType || '').toLowerCase() === filterType.toLowerCase());
            }

            if (!list.length) {
                tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-gray-400 font-bold">No fund usage records found${filterType !== 'all' ? ' for ' + filterType : ''}.</td></tr>`;
                return;
            }

            tbody.innerHTML = list.map(u => {
                const matchedFund = (allFundsData || []).find(f => (f.name || '').toLowerCase() === (u.fundType || '').toLowerCase());
                const isFundDisabled = matchedFund && (matchedFund.status === 'Inactive' || matchedFund.status === 'Disabled');
                const isCompleted = (u.status || '').toLowerCase() === 'completed';
                const statusBadge = isFundDisabled
                    ? `<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">Disabled</span>`
                    : (isCompleted
                        ? `<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Completed</span>`
                        : `<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">${u.status || 'Pending'}</span>`);

                return `
                <tr class="hover:bg-amber-50/30 dark:hover:bg-gray-800/40 transition">
                    <td class="py-3 px-4 text-gray-500 whitespace-nowrap">${u.date || u.raw_date || '—'}</td>
                    <td class="py-3 px-4 font-bold text-gray-900 dark:text-white whitespace-nowrap">
                        <span class="px-2 py-0.5 rounded text-xs ${isFundDisabled ? 'bg-gray-100 dark:bg-gray-800 text-gray-500' : 'bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300'} font-bold">${u.fundType || 'General Fund'}${isFundDisabled ? ' (Disabled)' : ''}</span>
                    </td>
                    <td class="py-3 px-4 text-gray-800 dark:text-gray-200">${u.purpose || '—'}</td>
                    <td class="py-3 px-4 whitespace-nowrap">${isFundDisabled ? '<span class="font-bold text-gray-400 dark:text-gray-500">—</span> <span class="text-[10px] text-rose-500 font-bold block">(Disabled)</span>' : `<span class="font-extrabold text-rose-600">₹${Number(u.amount || 0).toLocaleString('en-IN')}</span>`}</td>
                    <td class="py-3 px-4 whitespace-nowrap">${statusBadge}</td>
                </tr>
                `;
            }).join('');
        }

        function renderMemberRecentUsage() {
            const tbody = document.getElementById('memberRecentUsageTableBody');
            if (!tbody) return;

            const list = (Array.isArray(allFundUsage) ? allFundUsage : []).slice(0, 4);

            if (!list.length) {
                tbody.innerHTML = `<tr><td colspan="3" class="py-6 text-center text-gray-400 font-bold">No recent fund usage recorded.</td></tr>`;
                return;
            }

            tbody.innerHTML = list.map(u => {
                const matchedFund = (allFundsData || []).find(f => (f.name || '').toLowerCase() === (u.fundType || '').toLowerCase());
                const isFundDisabled = matchedFund && (matchedFund.status === 'Inactive' || matchedFund.status === 'Disabled');
                return `
                <tr class="hover:bg-amber-50/30 dark:hover:bg-gray-800/40 transition">
                    <td class="py-3 px-4 text-gray-500 whitespace-nowrap">${u.date || u.raw_date || '—'}</td>
                    <td class="py-3 px-4 font-bold text-gray-900 dark:text-white">
                        <div>${u.purpose || '—'}</div>
                        <span class="text-[10px] ${isFundDisabled ? 'text-gray-400' : 'text-amber-800 dark:text-amber-400'} font-bold">${u.fundType || 'General Fund'}${isFundDisabled ? ' (Disabled)' : ''}</span>
                    </td>
                    <td class="py-3 px-4 whitespace-nowrap">${isFundDisabled ? '<span class="font-bold text-gray-400">—</span>' : `<span class="font-extrabold text-rose-600">₹${Number(u.amount || 0).toLocaleString('en-IN')}</span>`}</td>
                </tr>
                `;
            }).join('');
        }

        function renderMemberFundOverview() {
            let totalCol = 0;
            let totalUsed = 0;

            if (Array.isArray(allFundsData) && allFundsData.length > 0) {
                allFundsData.forEach(f => {
                    if (f.status !== 'Inactive' && f.status !== 'Disabled') {
                        totalCol += Number(f.collected_amount || 0);
                    }
                });
            }

            if (Array.isArray(allFundUsage) && allFundUsage.length > 0) {
                allFundUsage.forEach(u => {
                    const matchedFund = (allFundsData || []).find(f => (f.name || '').toLowerCase() === (u.fundType || '').toLowerCase());
                    const isFundDisabled = matchedFund && (matchedFund.status === 'Inactive' || matchedFund.status === 'Disabled');
                    const st = (u.status || '').toLowerCase();
                    if (!isFundDisabled && (st === 'completed' || st === 'approved')) {
                        totalUsed += Number(u.amount || 0);
                    }
                });
            }

            const availBal = Math.max(0, totalCol - totalUsed);
            const totalMembers = allDashboardStats?.total_members || 0;
            const totalContribs = allDashboardStats?.total_contributions_count || 0;

            // Update top cards on Dashboard Overview
            const sCol = document.getElementById('statTotalCollected');
            if (sCol) sCol.textContent = '₹' + totalCol.toLocaleString('en-IN');

            const sUsed = document.getElementById('statTotalUsed');
            if (sUsed) sUsed.textContent = '₹' + totalUsed.toLocaleString('en-IN');

            const sBal = document.getElementById('statCurrentBalance');
            if (sBal) sBal.textContent = '₹' + availBal.toLocaleString('en-IN');

            const sColSub = document.getElementById('statCollectedSub');
            if (sColSub) sColSub.textContent = `from ${totalContribs} contributions`;

            const sUsedSub = document.getElementById('statUsedSub');
            if (sUsedSub) sUsedSub.textContent = `for ${(allFundUsage || []).length} causes / events`;

            const sContributors = document.getElementById('statTotalContributors');
            if (sContributors) sContributors.textContent = totalContribs;

            const sVillagers = document.getElementById('statTotalVillagers');
            if (sVillagers) sVillagers.textContent = totalMembers;

            const sYouth = document.getElementById('statTotalYouth');
            if (sYouth) sYouth.textContent = Math.round(totalMembers * 0.4);

            const sYouthFunds = document.getElementById('statYouthFunds');
            if (sYouthFunds) {
                const yf = (allFundsData || []).find(f => (f.name || '').toLowerCase().includes('youth'));
                const yfCol = yf ? Number(yf.collected_amount || 0) : 0;
                const isYfInactive = yf && (yf.status === 'Inactive' || yf.status === 'Disabled');
                sYouthFunds.textContent = isYfInactive ? '—' : ('₹' + yfCol.toLocaleString('en-IN'));
                const yfCard = sYouthFunds.closest('.group') || sYouthFunds.parentElement;
                const yfBadge = yfCard ? yfCard.querySelector('span') : null;
                if (yfBadge) {
                    if (isYfInactive) {
                        yfBadge.className = 'text-[11px] font-extrabold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded flex items-center gap-0.5 border border-rose-200 dark:border-rose-900/50';
                        yfBadge.innerHTML = 'Disabled';
                    } else {
                        yfBadge.className = 'text-[11px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded flex items-center gap-0.5';
                        yfBadge.innerHTML = '<i data-lucide="trending-up" class="w-3 h-3"></i> +12.4%';
                    }
                }
            }

            const sVillageFunds = document.getElementById('statVillageFunds');
            if (sVillageFunds) {
                const vf = (allFundsData || []).find(f => (f.name || '').toLowerCase().includes('village'));
                const vfCol = vf ? Number(vf.collected_amount || 0) : 0;
                const isVfInactive = vf && (vf.status === 'Inactive' || vf.status === 'Disabled');
                sVillageFunds.textContent = isVfInactive ? '—' : ('₹' + vfCol.toLocaleString('en-IN'));
                const vfCard = sVillageFunds.closest('.group') || sVillageFunds.parentElement;
                const vfBadge = vfCard ? vfCard.querySelector('span') : null;
                if (vfBadge) {
                    if (isVfInactive) {
                        vfBadge.className = 'text-[11px] font-extrabold text-rose-600 bg-rose-50 dark:bg-rose-950/50 px-2 py-0.5 rounded flex items-center gap-0.5 border border-rose-200 dark:border-rose-900/50';
                        vfBadge.innerHTML = 'Disabled';
                    } else {
                        vfBadge.className = 'text-[11px] font-extrabold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/50 px-2 py-0.5 rounded flex items-center gap-0.5';
                        vfBadge.innerHTML = '<i data-lucide="trending-up" class="w-3 h-3"></i> +8.9%';
                    }
                }
            }

            // Update Fund Details overview cards
            const fdCol = document.getElementById('fdTotalCollected');
            if (fdCol) fdCol.textContent = '₹' + totalCol.toLocaleString('en-IN');

            const fdUsed = document.getElementById('fdTotalUsed');
            if (fdUsed) fdUsed.textContent = '₹' + totalUsed.toLocaleString('en-IN');

            const fdBal = document.getElementById('fdAvailableBalance');
            if (fdBal) fdBal.textContent = '₹' + availBal.toLocaleString('en-IN');

            const fdContrib = document.getElementById('fdTotalContributors');
            if (fdContrib) fdContrib.textContent = totalContribs;

            // Dynamically populate Fund Filter options
            const filterSelect = document.getElementById('memberFundUsageFilter');
            if (filterSelect && Array.isArray(allFundsData) && allFundsData.length > 0) {
                const currentVal = filterSelect.value || 'all';
                const options = ['<option value="all">All Fund Types</option>'];
                allFundsData.forEach(f => {
                    const isInactive = f.status === 'Inactive';
                    options.push(`<option value="${f.name}">${f.name}${isInactive ? ' (Inactive)' : ''}</option>`);
                });
                filterSelect.innerHTML = options.join('');
                filterSelect.value = currentVal;
            }

            // Sync contribution dropdown options & disable inactive funds
            updateMemberFundDropdowns();

            // Dynamically render Section 2: Fund-Wise Distribution Donut Chart & Legend
            renderMemberFundsDonutChart(allFundsData, totalCol);
        }

        function updateMemberFundDropdowns() {
            const modalPurpose = document.getElementById('modalPurpose');
            const pagePurpose = document.getElementById('pagePurpose');

            const funds = (Array.isArray(allFundsData) && allFundsData.length > 0)
                ? allFundsData
                : [
                    { name: 'Youth Fund', status: 'Active' },
                    { name: 'Village Fund', status: 'Active' },
                    { name: 'General Fund', status: 'Active' }
                  ];

            const fundOptions = funds.map(f => {
                const isInactive = f.status === 'Inactive' || f.status === 'Disabled';
                return `<option value="${f.name}" ${isInactive ? 'disabled class="text-gray-400 bg-gray-100 dark:bg-gray-800 italic"' : ''}>${f.name}${isInactive ? ' (Disabled - Inactive)' : ''}</option>`;
            }).join('');

            const firstActive = funds.find(f => f.status !== 'Inactive' && f.status !== 'Disabled') || funds[0];

            if (modalPurpose) {
                const currentVal = modalPurpose.value;
                modalPurpose.innerHTML = fundOptions;
                const currentFund = funds.find(f => f.name === currentVal);
                if (currentFund && currentFund.status !== 'Inactive' && currentFund.status !== 'Disabled') {
                    modalPurpose.value = currentVal;
                } else if (firstActive) {
                    modalPurpose.value = firstActive.name;
                }
            }

            if (pagePurpose) {
                const currentVal = pagePurpose.value;
                pagePurpose.innerHTML = fundOptions;
                const currentFund = funds.find(f => f.name === currentVal);
                if (currentFund && currentFund.status !== 'Inactive' && currentFund.status !== 'Disabled') {
                    pagePurpose.value = currentVal;
                } else if (firstActive) {
                    pagePurpose.value = firstActive.name;
                }
            }

            const filterPurpose = document.getElementById('filterPurpose');
            if (filterPurpose) {
                const curVal = filterPurpose.value;
                let opts = '<option value="" data-i18n="all_types">All Contribution Types</option>';
                funds.forEach(f => {
                    const isInactive = f.status === 'Inactive' || f.status === 'Disabled';
                    opts += `<option value="${f.name}">${f.name}${isInactive ? ' (Inactive)' : ''}</option>`;
                });
                filterPurpose.innerHTML = opts;
                if (curVal && funds.some(f => f.name === curVal)) {
                    filterPurpose.value = curVal;
                }
            }
        }

// ==============================================================================
// SECTION 3: INTERACTIVE CHARTS & VISUAL ANALYTICS
// Linked Tab: Dashboard Tab
// Functions:
//   - renderMemberFundsDonutChart(): Interactive Chart.js donut for fund breakdown
//   - renderMemberYearlyChart()    : Bar chart of annual contribution trends
// ==============================================================================
let memberDonutChartInstance = null;
function renderMemberFundsDonutChart(funds, totalCollected) {
            const el = document.getElementById('memberFundsDonutChart');
            const legendEl = document.getElementById('memberFundDistLegend');
            const totalLabelEl = document.getElementById('memberTotalDistLabel');
            if (totalLabelEl) totalLabelEl.textContent = '₹' + Number(totalCollected || 0).toLocaleString('en-IN');
            if (!el || !legendEl) return;

            if (memberDonutChartInstance) {
                memberDonutChartInstance.destroy();
                memberDonutChartInstance = null;
            }

            const colors = ['#f59e0b', '#6366f1', '#10b981', '#3b82f6', '#ec4899', '#8b5cf6'];
            const validFunds = Array.isArray(funds) ? funds : [];
            const activeFundsList = validFunds.filter(f => f.status !== 'Inactive' && f.status !== 'Disabled');
            const activeTotal = activeFundsList.reduce((sum, f) => sum + Number(f.collected_amount || f.collected || 0), 0);
            if (totalLabelEl) totalLabelEl.textContent = '₹' + Number(activeTotal || 0).toLocaleString('en-IN');

            const labels = validFunds.map(f => f.name + (f.status === 'Inactive' || f.status === 'Disabled' ? ' (Disabled)' : ''));
            const data = validFunds.map(f => (f.status === 'Inactive' || f.status === 'Disabled') ? 0 : Number(f.collected_amount || f.collected || 0));

            const hasData = data.some(v => v > 0);
            const chartData = hasData ? data : [1];
            const chartColors = hasData ? validFunds.map((f, i) => (f.status === 'Inactive' || f.status === 'Disabled') ? '#9ca3af' : colors[i % colors.length]) : ['#9ca3af'];

            memberDonutChartInstance = new Chart(el, {
                type: 'doughnut',
                data: {
                    labels: hasData ? labels : ['No Data'],
                    datasets: [{
                        data: chartData,
                        backgroundColor: chartColors,
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

            if (validFunds.length > 0) {
                legendEl.innerHTML = validFunds.map((f, idx) => {
                    const isInactive = f.status === 'Inactive' || f.status === 'Disabled';
                    const colAmt = Number(f.collected_amount || f.collected || 0);
                    const pct = (!isInactive && activeTotal > 0) ? Math.round((colAmt / activeTotal) * 100) : 0;
                    const color = isInactive ? '#9ca3af' : colors[idx % colors.length];
                    return `
                    <div class="flex justify-between items-center p-3.5 rounded-xl border transition ${isInactive ? 'bg-gray-100/70 dark:bg-gray-900/40 border-gray-200 dark:border-gray-800 opacity-60' : 'bg-gray-50 dark:bg-gray-950/50 border-gray-100 dark:border-gray-800 hover:bg-gray-100 dark:hover:bg-gray-800'}">
                        <div class="flex items-center gap-3">
                            <span class="w-3.5 h-3.5 rounded-full shrink-0" style="background:${color}; box-shadow: 0 0 8px ${color}60;"></span>
                            <div class="flex items-center gap-2">
                                <span class="font-bold text-sm ${isInactive ? 'text-gray-500 dark:text-gray-400' : 'text-gray-700 dark:text-gray-300'}">${f.name}</span>
                                ${isInactive ? '<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">Disabled</span>' : '<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Active</span>'}
                            </div>
                        </div>
                        <div class="text-right">
                            ${isInactive ? `
                                <span class="block font-bold text-gray-400 dark:text-gray-500 text-sm">—</span>
                                <span class="text-xs text-rose-500 dark:text-rose-400 font-bold">Disabled</span>
                            ` : `
                                <span class="block font-extrabold text-gray-900 dark:text-white">₹${colAmt.toLocaleString('en-IN')}</span>
                                <span class="text-xs text-gray-500 font-bold">${pct}%</span>
                            `}
                        </div>
                    </div>
                    `;
                }).join('');
            } else {
                legendEl.innerHTML = `<div class="p-4 text-center text-gray-400 font-bold">No fund categories available.</div>`;
            }
        }

        function updateProfileDisplayUI() {
            const fullNameStr = `${memberProfile.firstName || ''} ${memberProfile.lastName || ''}`.trim() || 'Member';
            memberProfile.fullName = fullNameStr;

            const ovName = document.getElementById('overviewName'); if (ovName) ovName.innerText = fullNameStr;
            const hdName = document.getElementById('headerProfileName'); if (hdName) hdName.innerText = fullNameStr;
            const wlName = document.getElementById('welcomeName'); if (wlName) wlName.innerText = fullNameStr;

            const df = document.getElementById('dispFirstName'); if (df) df.innerText = memberProfile.firstName || '—';
            const dl = document.getElementById('dispLastName'); if (dl) dl.innerText = memberProfile.lastName || '—';
            const dd = document.getElementById('dispDob'); if (dd) dd.innerText = memberProfile.dob || '—';
            const dn = document.getElementById('dispDoorNo'); if (dn) dn.innerText = memberProfile.doorNo || '—';
            const dv = document.getElementById('dispVillage'); if (dv) dv.innerText = memberProfile.village || '—';
            const dc = document.getElementById('dispCity'); if (dc) dc.innerText = memberProfile.city || '—';
            const ddi = document.getElementById('dispDistrict'); if (ddi) ddi.innerText = memberProfile.district || '—';
            const ds = document.getElementById('dispState'); if (ds) ds.innerText = memberProfile.state || '—';
            const da = document.getElementById('dispAddress'); if (da) da.innerText = memberProfile.address || '—';

            const dp = document.getElementById('secPhoneDisp');
            if (dp) dp.innerText = memberProfile.phone ? (memberProfile.phone + ' (Verified)') : '—';
            const de = document.getElementById('secEmailDisp');
            if (de) de.innerText = memberProfile.email ? (memberProfile.email + ' (Verified)') : '—';

            const activeId = memberProfile.id || activeMemberId || savedMemberSession?.member_id || savedMemberSession?.id || 21;
            const formattedMemberId = `PBK-M${String(activeId).padStart(3, '0')}`;
            const badgeEl = document.getElementById('dispMemberIdBadge');
            if (badgeEl) badgeEl.innerText = `Member ID: ${formattedMemberId}`;

            const hdId = document.getElementById('headerMemberId');
            if (hdId) hdId.innerText = formattedMemberId;

            const isInactive = (memberProfile.status || 'active').toLowerCase() === 'inactive';

            const statusEl = document.getElementById('dispMemberStatusContainer');
            if (statusEl) {
                if (isInactive) {
                    statusEl.innerHTML = `
                        <p class="text-sm font-semibold text-rose-600 dark:text-rose-400 flex items-center justify-center sm:justify-start gap-1.5" id="dispMemberStatus">
                            <span class="w-2 h-2 rounded-full bg-rose-500"></span>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-400 border border-rose-300 dark:border-rose-900/60">Status: Inactive Member</span>
                        </p>
                    `;
                } else {
                    statusEl.innerHTML = `
                        <p class="text-sm font-semibold text-emerald-600 dark:text-emerald-400 flex items-center justify-center sm:justify-start gap-1.5" id="dispMemberStatus">
                            <span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                            <span class="px-2.5 py-0.5 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300 dark:border-emerald-900/60">Status: Active Member</span>
                        </p>
                    `;
                }
            }

            const hdStatus = document.getElementById('headerMemberStatus');
            if (hdStatus) {
                if (isInactive) {
                    hdStatus.className = 'text-[10px] text-rose-400 font-extrabold flex items-center gap-1';
                    hdStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-rose-400"></span> Inactive';
                } else {
                    hdStatus.className = 'text-[10px] text-emerald-400 font-extrabold flex items-center gap-1';
                    hdStatus.innerHTML = '<span class="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> Active';
                }
            }

            const warnBanner = document.getElementById('memberInactiveWarningBanner');
            if (warnBanner) {
                if (isInactive) warnBanner.classList.remove('hidden');
                else warnBanner.classList.add('hidden');
            }
        }


// ==============================================================================
// SECTION 4: CONTRIBUTION HISTORY & TABLES
// Linked Tabs: Dashboard Tab & My Contributions Tab
// Functions:
//   - renderMemberRecentContributions(): Displays top 5 recent contributions on Dashboard
//   - renderContributions()            : Populates the full member contribution history table
//   - renderReceipt()                  : Prepares receipt modal preview for printing or download
// ==============================================================================
function renderMemberRecentContributions() {
            const tbody = document.getElementById('memberRecentContribTableBody');
            if (!tbody) return;
            const list = allDashboardStats?.recent_contributions || [];
            if (!list.length) {
                tbody.innerHTML = `<tr><td colspan="4" class="py-6 text-center text-gray-400 font-bold">No contributions recorded yet.</td></tr>`;
                return;
            }
            tbody.innerHTML = list.slice(0, 5).map(c => {
                const initial = (c.member || 'M').charAt(0).toUpperCase();
                const isFundDisabled = c.fund_status === 'Inactive' || c.fund_status === 'Disabled';
                return `
                <tr class="hover:bg-amber-50/30 dark:hover:bg-gray-800/40 transition">
                    <td class="py-3 px-4 text-gray-500 whitespace-nowrap">${c.date || '—'}</td>
                    <td class="py-3 px-4 font-bold flex items-center gap-2 text-gray-900 dark:text-white">
                        <span class="w-6 h-6 rounded-full bg-amber-600 text-white flex items-center justify-center font-extrabold text-[10px]">${initial}</span>
                        ${c.member || 'Anonymous'}
                    </td>
                    <td class="py-3 px-4 whitespace-nowrap">
                        ${isFundDisabled ? '<span class="font-bold text-gray-400 dark:text-gray-500">—</span> <span class="text-[10px] text-rose-500 font-bold block">(Disabled)</span>' : `<span class="font-extrabold text-emerald-600">₹${Number(c.amount || 0).toLocaleString('en-IN')}</span>`}
                    </td>
                    <td class="py-3 px-4 text-gray-500 whitespace-nowrap">${c.payment_method || 'UPI'}</td>
                </tr>
                `;
            }).join('');
        }

        let memberChartInstance = null;
        function renderMemberYearlyChart() {
            const ctx = document.getElementById('yearlyChart');
            if (!ctx) return;
            if (memberChartInstance) {
                memberChartInstance.destroy();
                memberChartInstance = null;
            }

            let labels = [];
            let collectedData = [];
            let usedData = [];

            if (Array.isArray(allFundsData) && allFundsData.length > 0) {
                labels = allFundsData.map(f => f.name + (f.status === 'Inactive' || f.status === 'Disabled' ? ' (Disabled)' : ''));
                collectedData = allFundsData.map(f => (f.status === 'Inactive' || f.status === 'Disabled') ? 0 : Number(f.collected_amount || 0));
                usedData = allFundsData.map(f => (f.status === 'Inactive' || f.status === 'Disabled') ? 0 : Number(f.used_amount || 0));
            } else {
                labels = ['Youth Fund', 'Village Fund', 'General Fund'];
                collectedData = [0, 0, 0];
                usedData = [0, 0, 0];
            }

            memberChartInstance = new Chart(ctx, {
                type: 'bar',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Collections (₹)',
                            data: collectedData,
                            backgroundColor: '#963100',
                            borderRadius: 8
                        },
                        {
                            label: 'Uses (₹)',
                            data: usedData,
                            backgroundColor: '#eea220',
                            borderRadius: 8
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { position: 'bottom' } },
                    scales: {
                        y: {
                            beginAtZero: true
                        }
                    }
                }
            });
        }

        async function syncFundDataFromBackend() {
            try {
                const [fundsRes, usageRes, statsRes] = await Promise.all([
                    fetch('http://127.0.0.1:8000/api/funds').then(r => r.ok ? r.json() : null).catch(() => null),
                    fetch('http://127.0.0.1:8000/api/fund-usage').then(r => r.ok ? r.json() : null).catch(() => null),
                    fetch('http://127.0.0.1:8000/api/admin/dashboard-stats').then(r => r.ok ? r.json() : null).catch(() => null)
                ]);

                if (Array.isArray(fundsRes) && fundsRes.length > 0) {
                    allFundsData = fundsRes;
                }
                if (Array.isArray(usageRes)) {
                    allFundUsage = usageRes;
                }
                if (statsRes) {
                    allDashboardStats = statsRes;
                }

                renderMemberFundOverview();
                renderMemberFundUsage();
                renderMemberRecentUsage();
                renderMemberRecentContributions();
                renderMemberYearlyChart();
                if (typeof lucide !== 'undefined') lucide.createIcons();
            } catch (err) {
                console.warn('Error syncing fund data:', err);
            }
        }

        async function loadMemberDataFromBackend() {
            if (!activeMemberId) {
                activeMemberId = savedMemberSession?.member_id || savedMemberSession?.id || null;
            }
            if (!activeMemberId) {
                try {
                    const mList = await fetch('http://127.0.0.1:8000/api/admin/members').then(r => r.ok ? r.json() : []);
                    if (mList && mList.length > 0) {
                        const rawId = mList[0].id;
                        activeMemberId = typeof rawId === 'string' ? parseInt(rawId.replace(/\D/g, '')) : rawId;
                    }
                } catch (_) {}
            }
            if (!activeMemberId) activeMemberId = 21;
            const memberId = activeMemberId;
            try {
                const [profileRes, contribRes, fundsRes, causesRes, annsRes, usageRes, statsRes] = await Promise.all([
                    fetch(`http://127.0.0.1:8000/api/members/${memberId}/profile`).then(r => r.ok ? r.json() : null).catch(() => null),
                    fetch(`http://127.0.0.1:8000/api/members/${memberId}/contributions`).then(r => r.ok ? r.json() : null).catch(() => null),
                    fetch('http://127.0.0.1:8000/api/funds').then(r => r.ok ? r.json() : null).catch(() => null),
                    fetch('http://127.0.0.1:8000/api/causes?status=Published').then(r => r.ok ? r.json() : null).catch(() => null),
                    fetch('http://127.0.0.1:8000/api/announcements?status=Published').then(r => r.ok ? r.json() : null).catch(() => null),
                    fetch('http://127.0.0.1:8000/api/fund-usage').then(r => r.ok ? r.json() : null).catch(() => null),
                    fetch('http://127.0.0.1:8000/api/admin/dashboard-stats').then(r => r.ok ? r.json() : null).catch(() => null)
                ]);

                // 1. Sync Member Profile
                if (profileRes) {
                    memberProfile.id = profileRes.id;
                    memberProfile.status = profileRes.status || 'active';
                    memberProfile.firstName = profileRes.first_name || '';
                    memberProfile.lastName = profileRes.last_name || '';
                    memberProfile.phone = profileRes.phone ? ('+91 ' + profileRes.phone.replace('+91', '').trim()) : '';
                    memberProfile.email = profileRes.email || '';
                    memberProfile.dob = profileRes.dob || '';
                    memberProfile.dobRaw = profileRes.dob || '';
                    memberProfile.doorNo = profileRes.door_no || '';
                    memberProfile.city = profileRes.city || '';
                    memberProfile.village = profileRes.village || '';
                    memberProfile.district = profileRes.district || '';
                    memberProfile.state = profileRes.state || '';
                    memberProfile.address = profileRes.address || '';

                    updateProfileDisplayUI();
                    startEditingProfile();
                }


                // 2. Sync Contributions
                userContributions = Array.isArray(contribRes) ? contribRes : [];
                renderContributions();

                // 3. Sync Funds dropdown & summary stats
                if (fundsRes && fundsRes.length > 0) {
                    allFundsData = fundsRes;
                    updateMemberFundDropdowns();
                }

                if (Array.isArray(usageRes)) {
                    allFundUsage = usageRes;
                }

                if (statsRes) {
                    allDashboardStats = statsRes;
                }

                renderMemberFundOverview();
                renderMemberFundUsage();
                renderMemberRecentUsage();
                renderMemberRecentContributions();
                renderMemberYearlyChart();

                // 4. Sync Causes / Events (Strictly Published Only)
                if (Array.isArray(causesRes)) {
                    const causesGrid = document.getElementById('memberCausesGrid');
                    if (causesGrid) {
                        const publishedCauses = causesRes.filter(c => c.status === 'Published');
                        if (publishedCauses.length === 0) {
                            causesGrid.innerHTML = `
                            <div class="col-span-full py-12 text-center text-gray-500 bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800">
                                <p class="font-bold">No active causes or events published right now.</p>
                            </div>
                            `;
                        } else {
                            causesGrid.innerHTML = publishedCauses.map(c => {
                                const targetPerMem = Number(c.target_per_member || c.target_amount || 0);
                                const totalTarget = Number(c.target_amount || 0);
                                const pct = totalTarget > 0 ? Math.min(100, Math.round((Number(c.raised_amount || 0) / totalTarget) * 100)) : 0;
                                return `
                            <div id="cause-card-${c.id}" class="bg-white dark:bg-gray-900 p-5 rounded-2xl border border-gray-200 dark:border-gray-800 shadow-sm flex flex-col justify-between transition-all duration-300">
                                <div>
                                    <div class="flex items-center justify-between mb-2">
                                        <span class="text-[11px] font-extrabold text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/40 px-2.5 py-0.5 rounded-full">${c.cause_code || 'CAUSE'}</span>
                                        <span class="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 rounded-full">Published</span>
                                    </div>
                                    <h3 class="font-extrabold text-base text-gray-900 dark:text-white">${c.name}</h3>
                                    <p class="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">${c.description || 'Community welfare initiative'}</p>
                                    
                                    <div class="mt-4 p-3 bg-amber-50/50 dark:bg-amber-950/20 rounded-xl border border-amber-100 dark:border-amber-900/30 space-y-2">
                                        <div class="flex justify-between items-center text-xs">
                                            <span class="text-gray-500 font-bold">Target per Member:</span>
                                            <span class="text-amber-900 dark:text-amber-300 font-black text-sm">₹${targetPerMem.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div class="flex justify-between text-[11px] font-bold text-gray-500">
                                            <span>Raised: ₹${Number(c.raised_amount || 0).toLocaleString('en-IN')}</span>
                                            <span>Total Goal: ₹${totalTarget.toLocaleString('en-IN')}</span>
                                        </div>
                                        <div class="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2 overflow-hidden">
                                            <div class="bg-gradient-to-r from-amber-600 to-amber-700 h-2 rounded-full" style="width: ${pct}%"></div>
                                        </div>
                                    </div>
                                </div>
                                <button onclick="quickContributeToCause('${(c.name || '').replace(/'/g, "\\'")}', ${targetPerMem})" class="mt-4 w-full py-2.5 rounded-xl bg-[#963100] hover:bg-amber-900 text-white font-bold text-xs transition flex items-center justify-center gap-1.5 cursor-pointer shadow-sm">
                                    <i data-lucide="heart" class="w-3.5 h-3.5 fill-white"></i>
                                    Contribute to Cause (₹${targetPerMem.toLocaleString('en-IN')})
                                </button>
                            </div>
                            `;
                            }).join('');
                        }
                    }
                }

                // 5. Sync Announcements Banner (Published only)
                if (annsRes && annsRes.length > 0) {
                    const pub = annsRes.find(a => a.status === 'Published');
                    const banner = document.getElementById('memberAnnouncementBanner');
                    const aTitle = document.getElementById('announcementTitle');
                    const aMsg = document.getElementById('announcementMessage');
                    const aDate = document.getElementById('announcementDate');
                    if (banner) {
                        if (pub) {
                            if (aTitle) aTitle.textContent = pub.title;
                            if (aMsg) aMsg.textContent = pub.message;
                            if (aDate) aDate.textContent = pub.date || '';
                            banner.classList.remove('hidden');
                        } else {
                            banner.classList.add('hidden');
                        }
                    }
                }

                // 6. Sync Top Header Notification Bell & Badges (Announcements + Causes/Events)
                buildAndRenderNotifications(annsRes || [], causesRes || []);
                if (!window._notificationsPollInterval) {
                    window._notificationsPollInterval = setInterval(fetchAndSyncNotifications, 20000);
                }

                if (typeof fetchMemberDonationSettings === 'function') {
                    fetchMemberDonationSettings();
                }

                lucide.createIcons();
            } catch (e) {
                console.warn('Backend sync notice: using fallback data', e);
            }
        }

        function quickContributeToCause(causeName, targetPerMember = 0) {
            switchTab('contribute');
            // Strictly refresh Contribution Type options from Admin funds only (never inject Cause)
            updateMemberFundDropdowns();

            // If a per-member target is set, automatically populate the contribution amount!
            if (targetPerMember && targetPerMember > 0) {
                const amtInput = document.getElementById('pageCustomAmount');
                if (amtInput) {
                    amtInput.value = targetPerMember;
                    if (typeof syncPageAmount === 'function') syncPageAmount();
                }
                const amtBtn = document.getElementById('pagePayBtnAmt');
                if (amtBtn) amtBtn.innerText = targetPerMember;
            }

            // Populate the Optional Notes / Dedication field with the Cause reference
            const pageNotes = document.getElementById('pageNotes');
            if (pageNotes) {
                pageNotes.value = `Dedication: ${causeName}`;
                try {
                    pageNotes.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    pageNotes.focus();
                } catch (_) {}
            }

            // Ensure Contribution Type is set to an active Admin fund
            const pagePurpose = document.getElementById('pagePurpose');
            if (pagePurpose) {
                const isValid = Array.isArray(allFundsData) && allFundsData.some(f => f.name === pagePurpose.value && f.status !== 'Inactive' && f.status !== 'Disabled');
                if (!isValid && Array.isArray(allFundsData) && allFundsData.length > 0) {
                    const firstActive = allFundsData.find(f => f.status !== 'Inactive' && f.status !== 'Disabled') || allFundsData[0];
                    if (firstActive) pagePurpose.value = firstActive.name;
                }
            }

            showToast(`Contributing in support of "${causeName}". Target: ₹${Number(targetPerMember || 1000).toLocaleString('en-IN')} per member. Please select an Admin Fund.`);
        }

        window.addEventListener('DOMContentLoaded', () => {
            if (savedMemberSession?.first_name) {
                const full = `${memberProfile.firstName} ${memberProfile.lastName}`.trim();
                const hName = document.getElementById('headerProfileName');
                if (hName) hName.innerText = full;
                const oName = document.getElementById('overviewName');
                if (oName) oName.innerText = full;
                const wName = document.getElementById('welcomeName');
                if (wName) wName.innerText = full;
            }
            startEditingProfile();
            loadMemberDataFromBackend();
        });

        let notifPrefs = {
            email: localStorage.getItem('pbk_notif_email') !== 'false',
            whatsapp: localStorage.getItem('pbk_notif_whatsapp') !== 'false'
        };

        let currentLang = localStorage.getItem('pbk_lang') || 'en';
        let currentTheme = localStorage.getItem('pbk_theme') || 'system';
        const systemThemeQuery = window.matchMedia('(prefers-color-scheme: dark)');
        systemThemeQuery.addEventListener?.('change', () => { if (currentTheme === 'system') setTheme('system'); });

        const i18n = {
            en: {
                sidebar_dashboard: "Dashboard",
                sidebar_contribute: "Contribute",
                sidebar_fund_details: "Fund Details",
                sidebar_causes: "Causes / Events",
                sidebar_my_contrib: "My Contributions",
                sidebar_profile: "Profile",
                logout_btn: "Logout",
                welcome_prefix: "Welcome",
                fin_year_label: "Financial Year:",
                contribute_now_btn: "Contribute Now",
                card_youth_funds: "YOUTH FUNDS",
                card_youth_sub: "Sports & skill development",
                card_village_funds: "VILLAGE FUNDS",
                card_village_sub: "Infrastructure & welfare",
                card_total_collected: "TOTAL COLLECTED",
                card_collected_sub: "from 186 contributions",
                card_total_used: "TOTAL USED",
                card_optimized: "Optimized",
                card_used_sub: "for 8 causes / events",
                card_current_balance: "CURRENT BALANCE",
                card_active: "Active",
                card_balance_sub: "Available reserves",
                card_total_contributors: "TOTAL CONTRIBUTORS",
                card_new_contrib: "+14 new",
                card_contrib_sub: "Community members",
                card_total_youth: "TOTAL YOUTH",
                card_new_youth: "+6 youth",
                card_youth_members: "Youth members",
                card_total_villagers: "TOTAL VILLAGERS",
                card_registered: "Registered",
                card_residents_sub: "Registered residents",
                chart_title: "Yearly Fund Summary (Collections vs. Uses)",
                table_recent_contrib: "Recent Contributions",
                table_recent_usage: "Recent Fund Usage",
                view_all: "View All",
                th_date: "Date",
                th_member_name: "Member Name",
                th_amount: "Amount",
                th_mode: "Mode",
                th_purpose: "Purpose",
                th_status: "Status",
                th_contrib_id: "Contribution ID",
                th_contrib_type: "Contribution Type",
                th_pay_method: "Payment Method",
                th_receipt: "Receipt",
                th_fund_type: "Fund Type",
                th_amount_used: "Amount Used",
                status_completed: "Completed",
                my_contrib_title: "My Contributions",
                my_contrib_subtitle: "Track your contributions to the PBK Community Chanda Fund.",
                make_contribution_btn: "Make a Contribution",
                total_contributed: "Total Contributed",
                lifetime_contrib: "Lifetime contributions",
                contrib_this_year: "Contributions This Year",
                number_of_contrib: "Number of Contributions",
                successful_payments: "Total successful payments",
                last_contribution: "Last Contribution",
                all_types: "All Contribution Types",
                clear_filters: "Clear Filters",
                contrib_history: "Contribution History",
                no_contrib_yet: "No Contributions Yet",
                no_contrib_desc: "You haven't made any contributions yet. Start supporting the PBK Community today.",
                fund_subtitle: "View the current status and usage of the PBK Community Chanda Fund.",
                sec_fund_overview: "1. Fund Overview",
                sec_fund_types: "Fund Types",
                sec_fund_wise_distribution: "2. Fund-Wise Distribution",
                sec_fund_usage: "3. Fund Usage",
                lbl_collected: "Collected:",
                lbl_used: "Used:",
                lbl_balance: "Balance:",
                fin_year_heading: "Financial Year",
                transparency_heading: "Transparency Information",
                transparency_desc: "\"All fund collections and expenditures are recorded for community transparency. Members can view fund allocation, usage, and available balance details.\"",
                profile_subtitle: "Manage your member profile, account security, and preferences.",
                tab_overview: "Profile Overview",
                tab_personal: "Personal Information",
                tab_security: "Security",
                status_active_member: "Status: Active Member",
                edit_profile_btn: "Edit Profile",
                edit_details: "Edit Details",
                lbl_firstname: "First Name",
                lbl_lastname: "Last Name",
                lbl_dob: "Date of Birth",
                lbl_doorno: "Door / Plot Number",
                lbl_village: "Village / Area",
                lbl_city: "City",
                lbl_district: "District",
                lbl_state: "State",
                lbl_address: "Full Address",
                personal_note: "Update your general profile details below. Note: Phone and Email editing is located in Security.",
                save_changes: "Save Changes",
                cancel: "Cancel",
                change_password: "Change Password",
                password_sub: "Last changed 3 months ago",
                update_btn: "Update",
                change_phone: "Change Phone Number",
                edit_btn: "Edit",
                new_phone: "New Phone Number",
                save_phone: "Save Phone",
                change_email: "Change Email Address",
                new_email: "New Email Address",
                save_email: "Save Email",
                two_factor: "Two-Factor Authentication",
                two_factor_sub: "Enabled (Authenticator App)",
                manage_btn: "Manage",
                preferences_heading: "Preferences",
                theme_mode_label: "Theme Mode",
                language_label: "Language",
                notifications_label: "Notifications",
                notif_email: "Email Notifications",
                notif_whatsapp: "WhatsApp Notifications",
                back_to_dash: "Back to Dashboard",
                modal_amt_label: "Contribution Amount (₹)",
                modal_type_label: "Contribution Type",
                modal_date_label: "Contribution Date",
                modal_method_label: "Payment Method",
                modal_notes_label: "Optional Notes / Dedication",
                submit_contrib_btn: "Submit Contribution",
                receipt_title: "Official Contribution Receipt",
                receipt_name: "Contributor Name:",
                receipt_id: "Contribution ID:",
                receipt_amount: "Amount Paid:",
                receipt_method: "Payment Method:",
                receipt_thanks: "\"Thank you for supporting the PBK Community.\"",
                print_receipt: "Print Receipt",
                download_pdf: "Download PDF"
            },
            te: {
                sidebar_dashboard: "డాష్‌‌బోర్డ్",
                sidebar_contribute: "విరాళం ఇవ్వండి",                
                sidebar_fund_details: "నిధి వివరాలు",
                sidebar_causes: "కారణాలు / ఈవెంట్‌‌లు",
                sidebar_my_contrib: "నా చందాలు",
                sidebar_profile: "ప్రొఫైల్",
                logout_btn: "లాగ్ అవుట్",
                welcome_prefix: "స్వాగతం",
                fin_year_label: "ఆర్థిక సంవత్సరం:",
                contribute_now_btn: "ఇప్పుడే చందా ఇవ్వండి",
                card_youth_funds: "యువజన నిధులు",
                card_youth_sub: "క్రీడలు & నైపుణ్యాభివృద్ధి",
                card_village_funds: "గ్రామ నిధులు",
                card_village_sub: "మౌలిక సదుపాయాలు & సంక్షేమం",
                card_total_collected: "మొత్తం వసూలు",
                card_collected_sub: "186 విరాళాల నుండి",
                card_total_used: "మొత్తం ఖర్చు",
                card_optimized: "ఆప్టిమైజ్ చేయబడింది",
                card_used_sub: "8 కారణాలు / ఈవెంట్‌‌ల కోసం",
                card_current_balance: "ప్రస్తుత నిల్వ",
                card_active: "యాక్టివ్",
                card_balance_sub: "అందుబాటులో ఉన్న నిధులు",
                card_total_contributors: "మొత్తం చందాదారులు",
                card_new_contrib: "+14 కొత్త",
                card_contrib_sub: "సమాజ సభ్యులు",
                card_total_youth: "మొత్తం యువకులు",
                card_new_youth: "+6 యువత",
                card_youth_members: "యువ సభ్యులు",
                card_total_villagers: "గ్రామస్తులు మొత్తం",
                card_registered: "నమోదు చేయబడింది",
                card_residents_sub: "నమోదిత నివాసితులు",
                chart_title: "వార్షిక నిధి సారాంశం (వసూళ్లు vs ఖర్చులు)",
                table_recent_contrib: "ఇటీవలి చందాలు",
                table_recent_usage: "ఇటీవలి నిధి వినియోగం",
                view_all: "అన్నీ చూడండి",
                th_date: "తేదీ",
                th_member_name: "సభ్యుని పేరు",
                th_amount: "మొత్తం",
                th_mode: "విధానం",
                th_purpose: "ఉద్దేశ్యం",
                th_status: "స్థితి",
                th_contrib_id: "చందా ID",
                th_contrib_type: "చందా రకం",
                th_pay_method: "చెల్లింపు విధానం",
                th_receipt: "రసీదు",
                th_fund_type: "నిధి రకం",
                th_amount_used: "ఖర్చు చేసిన మొత్తం",
                status_completed: "పూర్తయింది",
                my_contrib_title: "నా చందాలు",
                my_contrib_subtitle: "పిబికె కమ్యూనిటీ చందా నిధికి మీ చందాలను ట్రాక్ చేయండి.",
                make_contribution_btn: "చందా ఇవ్వండి",
                total_contributed: "మొత్తం విరాళం",
                lifetime_contrib: "జీవితకాల చందాలు",
                contrib_this_year: "ఈ ఏడాది చందాలు",
                number_of_contrib: "చందాల సంఖ్య",
                successful_payments: "విజయవంతమైన చెల్లింపులు",
                last_contribution: "చివరి చందా",
                all_types: "అన్ని చందా రకాలు",
                clear_filters: "ఫిల్టర్లను క్లియర్ చేయండి",
                contrib_history: "చందా చరిత్ర",
                no_contrib_yet: "ఇంకా చందాలు లేవు",
                no_contrib_desc: "మీరు ఇంకా ఎలాంటి చందాలు ఇవ్వలేదు. ఈరోజే పిబికె కమ్యూనిటీకి మద్దతు ఇవ్వండి.",
                fund_subtitle: "పిబికె కమ్యూనిటీ చందా నిధి ప్రస్తుత స్థితి మరియు వినియోగాన్ని వీక్షించండి.",
                sec_fund_overview: "1. నిధి అవలోకనం",
                sec_fund_types: "నిధి రకాలు",
                sec_fund_wise_distribution: "2. నిధుల పంపిణీ",
                sec_fund_usage: "3. నిధి వినియోగం",
                lbl_collected: "వసూలు:",
                lbl_used: "ఖర్చు:",
                lbl_balance: "నిల్వ:",
                fin_year_heading: "ఆర్థిక సంవత్సరం",
                transparency_heading: "పారదర్శకత సమాచారం",
                transparency_desc: "\"సమాజ పారదర్శకత కోసం అన్ని నిధి వసూళ్లు మరియు ఖర్చులు రికార్డ్ చేయబడతాయి. సభ్యులు నిధి కేటాయింపు, వినియోగం మరియు అందుబాటులో ఉన్న బ్యాలెన్స్ వివరాలను చూడవచ్చు.\"",
                profile_subtitle: "Profile Overview",
                tab_overview: "Profile Overview",
                tab_personal: "Personal Information",
                tab_security: "Security",
                status_active_member: "Status: Active Member",
                edit_profile_btn: "Edit Profile",
                edit_details: "Edit Details",
                lbl_firstname: "First Name",
                lbl_lastname: "Last Name",
                lbl_dob: "Date of Birth",
                lbl_doorno: "Door / Plot Number",
                lbl_village: "Village / Area",
                lbl_city: "City",
                lbl_district: "District",
                lbl_state: "State",
                lbl_address: "Full Address",
                personal_note: "Update your general profile details below. Note: Phone and Email editing is located in Security.",
                save_changes: "Save Changes",
                cancel: "Cancel",
                change_password: "Change Password",
                password_sub: "Last changed 3 months ago",
                update_btn: "Update",
                change_phone: "Change Phone Number",
                edit_btn: "Edit",
                new_phone: "New Phone Number",
                save_phone: "Save Phone",
                change_email: "Change Email Address",
                new_email: "New Email Address",
                save_email: "Save Email",
                two_factor: "Two-Factor Authentication",
                two_factor_sub: "Enabled (Authenticator App)",
                manage_btn: "Manage",
                preferences_heading: "Preferences",
                theme_mode_label: "Theme Mode",
                language_label: "Language",
                notifications_label: "Notifications",
                notif_email: "Email Notifications",
                notif_whatsapp: "WhatsApp Notifications",
                back_to_dash: "Back to Dashboard",
                modal_amt_label: "Contribution Amount (₹)",
                modal_type_label: "Contribution Type",
                modal_date_label: "Contribution Date",
                modal_method_label: "Payment Method",
                modal_notes_label: "Optional Notes / Dedication",
                submit_contrib_btn: "Submit Contribution",
                receipt_title: "Official Contribution Receipt",
                receipt_name: "Contributor Name:",
                receipt_id: "Contribution ID:",
                receipt_amount: "Amount Paid:",
                receipt_method: "Payment Method:",
                receipt_thanks: "\"Thank you for supporting the PBK Community.\"",
                print_receipt: "Print Receipt",
                download_pdf: "Download PDF"
            }
        };

// ==============================================================================
// SECTION 5: SPA TAB ROUTER & SIDEBAR NAVIGATION
// Linked Component: App Sidebar & View Switcher
// Functions:
//   - toggleSidebar(): Controls responsive mobile sidebar open/close
//   - switchTab()    : Manages view transition, active tab styling, and data loading
// ==============================================================================
function toggleSidebar(event) {
            if (event) event.preventDefault();
            const sidebar = document.getElementById('appSidebar');
            const overlay = document.getElementById('mobileSidebarOverlay');
            sidebar.classList.toggle('-translate-x-full');
            overlay.classList.toggle('hidden');
        }

        function switchTab(tabId, event) {
            if (event) event.preventDefault();
            
            const views = ['dashboard', 'contribute', 'my-contributions', 'fund-details', 'profile', 'causes'];
            views.forEach(v => {
                const el = document.getElementById('view-' + v);
                if (el) el.classList.add('hidden');
            });

            document.querySelectorAll('.sidebar-link').forEach(link => {
                link.classList.remove('bg-orange-500', 'text-white', 'shadow-md', 'hover:bg-orange-600', 'bg-amber-100', 'dark:bg-amber-950/60', 'text-amber-900', 'dark:text-amber-300', 'font-extrabold', 'shadow-sm');
                link.classList.add('text-gray-700', 'dark:text-gray-300', 'hover:bg-amber-50', 'dark:hover:bg-gray-800', 'hover:text-amber-800', 'dark:hover:text-amber-400');
                
                const icon = link.querySelector('i');
                if (icon) {
                    icon.classList.remove('text-white');
                    icon.classList.add('text-amber-700');
                }
            });

            const targetView = document.getElementById('view-' + tabId);
            if (targetView) {
                targetView.classList.remove('hidden');
            } else {
                const generic = document.getElementById('view-generic');
                if (generic) {
                    generic.classList.remove('hidden');
                    document.getElementById('genericViewTitle').innerText = tabId.charAt(0).toUpperCase() + tabId.slice(1);
                }
            }

            const activeLink = document.getElementById('nav-' + tabId);
            if (activeLink) {
                activeLink.classList.remove('text-gray-700', 'dark:text-gray-300', 'hover:bg-amber-50', 'dark:hover:bg-gray-800', 'hover:text-amber-800', 'dark:hover:text-amber-400');
                activeLink.classList.add('bg-orange-500', 'text-white', 'shadow-md', 'hover:bg-orange-600');
                
                const activeIcon = activeLink.querySelector('i');
                if (activeIcon) {
                    activeIcon.classList.remove('text-amber-700');
                    activeIcon.classList.add('text-white');
                }
            }

            if (window.innerWidth < 1024) { 
                const sidebar = document.getElementById('appSidebar');
                const overlay = document.getElementById('mobileSidebarOverlay');
                if (sidebar) sidebar.classList.add('-translate-x-full');
                if (overlay) overlay.classList.add('hidden');
            }

            if (tabId === 'my-contributions') {
                renderContributions();
            }
            if (tabId === 'profile') {
                startEditingProfile();
            }
            if (tabId === 'contribute') {
                if (typeof fetchMemberDonationSettings === 'function') fetchMemberDonationSettings();
                if (typeof updateMemberDynamicQr === 'function') updateMemberDynamicQr();
            }
            if (tabId === 'fund-details' || tabId === 'dashboard') {
                syncFundDataFromBackend();
            }
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }

        let cachedNotifications = [];

        function escapeHtml(text) {
            if (!text) return '';
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

// ==============================================================================
// SECTION 6: TOP HEADER, THEMES & NOTIFICATION BELL
// Linked Components: Top Navigation Bar, Theme Dropdown, Notification Dropdown
// Functions:
//   - toggleThemeDropdown()       : Controls light/dark/system theme selector
//   - toggleNotificationDropdown(): Toggles the live announcements alert dropdown
//   - fetchAndSyncNotifications() : Polls published announcements from backend
//   - markAllNotificationsRead()  : Marks all unread alerts as read
// ==============================================================================
function toggleThemeDropdown(event) {
            if (event) event.stopPropagation();
            const menu = document.getElementById('themeDropdownMenu');
            const notifMenu = document.getElementById('memberNotificationDropdown');
            if (notifMenu) notifMenu.classList.add('hidden');
            if (menu) {
                menu.classList.toggle('hidden');
            }
        }

        function toggleNotificationDropdown(event) {
            if (event) event.stopPropagation();
            const notifMenu = document.getElementById('memberNotificationDropdown');
            const themeMenu = document.getElementById('themeDropdownMenu');
            if (themeMenu) themeMenu.classList.add('hidden');
            if (notifMenu) {
                notifMenu.classList.toggle('hidden');
                if (!notifMenu.classList.contains('hidden')) {
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }
        }

        function handleBodyClick(event) {
            const themeMenu = document.getElementById('themeDropdownMenu');
            if (themeMenu && !event.target.closest('#themeDropdownMenu') && !event.target.closest('button[onclick*="toggleThemeDropdown"]')) {
                themeMenu.classList.add('hidden');
            }
            const notifMenu = document.getElementById('memberNotificationDropdown');
            if (notifMenu && !event.target.closest('#memberNotificationDropdown') && !event.target.closest('#memberNotificationBtn')) {
                notifMenu.classList.add('hidden');
            }
        }

        function getReadNotificationIds() {
            try {
                return JSON.parse(localStorage.getItem('pbk_read_notifications') || '[]');
            } catch (e) {
                return [];
            }
        }

        function saveReadNotificationIds(ids) {
            try {
                localStorage.setItem('pbk_read_notifications', JSON.stringify(ids));
            } catch (e) {}
        }

        function buildAndRenderNotifications(anns, causes) {
            const items = [];

            // 1. Map Announcements
            (anns || []).filter(a => a.status === 'Published').forEach(a => {
                items.push({
                    id: 'ann_' + a.id,
                    originalId: a.id,
                    kind: 'announcement',
                    title: a.title || 'Announcement',
                    message: a.message || '',
                    category: a.announcement_type || 'Notice',
                    date: a.date || '',
                    icon: 'megaphone'
                });
            });

            // 2. Map Causes & Events
            (causes || []).filter(c => c.status === 'Published').forEach(c => {
                const targetPerMem = Number(c.target_per_member || c.target_amount || 0);
                items.push({
                    id: 'cause_' + c.id,
                    originalId: c.id,
                    kind: 'cause',
                    title: c.name || 'New Community Cause / Event',
                    message: c.description ? c.description : `New community event/case added. Target: ₹${targetPerMem.toLocaleString('en-IN')} per member.`,
                    category: 'Event / Case',
                    date: c.date || 'Recent',
                    icon: 'target',
                    target_per_member: targetPerMem
                });
            });

            cachedNotifications = items;
            renderMemberNotifications(cachedNotifications);
        }

        function renderMemberNotifications(notifications) {
            cachedNotifications = notifications || [];
            const badge = document.getElementById('memberNotificationBadge');
            const list = document.getElementById('notificationList');
            const subtitle = document.getElementById('notificationDropdownSubtitle');
            const statusText = document.getElementById('notificationStatusText');
            const markAllBtn = document.getElementById('btnMarkAllRead');
            const readIds = getReadNotificationIds();

            const totalCount = cachedNotifications.length;
            const unreadList = cachedNotifications.filter(n => !readIds.includes(String(n.id)));
            const unreadCount = unreadList.length;

            // 1. Update Badge Number (Only visible when unreadCount > 0!)
            if (badge) {
                if (unreadCount === 0 || totalCount === 0) {
                    badge.classList.add('hidden');
                    badge.textContent = '0';
                } else {
                    badge.textContent = unreadCount > 99 ? '99+' : unreadCount;
                    badge.className = 'absolute -top-1.5 -right-1.5 min-w-[19px] h-[19px] px-1 bg-red-600 text-white text-[10px] font-black rounded-full flex items-center justify-center border-2 border-[#7c2d12] dark:border-gray-900 shadow-md animate-pulse';
                    badge.classList.remove('hidden');
                }
            }

            // 2. Update Header Subtitle, Status Counter & "Mark All Read" button
            if (subtitle) {
                subtitle.textContent = unreadCount > 0
                    ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}`
                    : (totalCount > 0 ? 'All caught up' : 'No active notifications');
            }
            if (statusText) {
                statusText.textContent = `${totalCount} Notification${totalCount !== 1 ? 's' : ''} (Notices & Events)`;
            }
            if (markAllBtn) {
                if (unreadCount === 0) {
                    markAllBtn.innerHTML = '<span class="text-emerald-600 dark:text-emerald-400 font-bold inline-flex items-center gap-1"><i data-lucide="check" class="w-3.5 h-3.5"></i> All read</span>';
                    markAllBtn.classList.remove('hover:underline', 'cursor-pointer');
                    markAllBtn.classList.add('cursor-default');
                } else {
                    markAllBtn.innerHTML = 'Mark all as read';
                    markAllBtn.classList.add('hover:underline', 'cursor-pointer');
                    markAllBtn.classList.remove('cursor-default');
                }
            }

            // 3. Render Notification Items List
            if (list) {
                if (totalCount === 0) {
                    list.innerHTML = `
                        <div class="p-8 text-center text-gray-500 dark:text-gray-400 space-y-2">
                            <div class="w-10 h-10 mx-auto rounded-full bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-400">
                                <i data-lucide="bell-off" class="w-5 h-5"></i>
                            </div>
                            <p class="font-extrabold text-xs text-gray-700 dark:text-gray-300">No Notifications Yet</p>
                            <p class="text-[11px]">When administrators post new community announcements, causes, or events, they will appear here.</p>
                        </div>
                    `;
                } else {
                    list.innerHTML = cachedNotifications.map(n => {
                        const isUnread = !readIds.includes(String(n.id));
                        const isCause = n.kind === 'cause';
                        
                        let badgeHtml = '';
                        let iconName = 'megaphone';
                        let iconBoxClass = isUnread 
                            ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30' 
                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500';

                        if (isCause) {
                            badgeHtml = '<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-purple-100 dark:bg-purple-950/60 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 shrink-0">Event / Case</span>';
                            iconName = 'target';
                            if (isUnread) {
                                iconBoxClass = 'bg-purple-500/20 text-purple-700 dark:text-purple-300 border border-purple-500/30';
                            }
                        } else {
                            const type = (n.category || 'General').toLowerCase();
                            if (type.includes('urgent') || type.includes('alert')) {
                                badgeHtml = '<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-100 dark:bg-red-950/60 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-800 shrink-0">Urgent</span>';
                            } else if (type.includes('event') || type.includes('meet')) {
                                badgeHtml = '<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800 shrink-0">Event</span>';
                            } else if (type.includes('fund')) {
                                badgeHtml = '<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">Fund</span>';
                            } else {
                                badgeHtml = '<span class="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-amber-100 dark:bg-amber-950/60 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 shrink-0">Notice</span>';
                            }
                        }

                        const clickHandler = isCause
                            ? `readAndGoToCause('${n.originalId}', event)`
                            : `readAndOpenAnnouncement('${n.originalId}', event)`;

                        const actionPrompt = isCause
                            ? `<span class="mt-1 text-[10px] font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1 group-hover:underline"><span>View in Causes &amp; Events</span><i data-lucide="arrow-right" class="w-3 h-3"></i></span>`
                            : `<span class="mt-1 text-[10px] font-extrabold text-amber-700 dark:text-amber-400 flex items-center gap-1 group-hover:underline"><span>Read full notice</span><i data-lucide="arrow-right" class="w-3 h-3"></i></span>`;

                        return `
                            <div onclick="${clickHandler}" class="p-3.5 px-4 hover:bg-amber-50/70 dark:hover:bg-gray-800/70 transition cursor-pointer flex items-start gap-3 relative group ${isUnread ? 'bg-amber-50/40 dark:bg-amber-950/20' : ''}">
                                <div class="w-8 h-8 rounded-xl ${iconBoxClass} flex items-center justify-center shrink-0 mt-0.5">
                                    <i data-lucide="${iconName}" class="w-4 h-4"></i>
                                </div>
                                <div class="flex-1 min-w-0">
                                    <div class="flex items-center justify-between gap-2 mb-1">
                                        <div class="flex items-center gap-1.5 flex-wrap">
                                            ${badgeHtml}
                                            <h5 class="font-bold text-xs text-gray-900 dark:text-white truncate ${isUnread ? 'font-black text-amber-950 dark:text-amber-200' : ''}">${escapeHtml(n.title)}</h5>
                                        </div>
                                        <span class="text-[10px] text-gray-400 shrink-0 font-medium">${n.date || ''}</span>
                                    </div>
                                    <p class="text-[11px] text-gray-600 dark:text-gray-300 line-clamp-2 leading-relaxed">${escapeHtml(n.message || '')}</p>
                                    ${actionPrompt}
                                </div>
                                ${isUnread ? '<span class="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0 mt-2 shadow-sm animate-pulse" title="Unread"></span>' : ''}
                            </div>
                        `;
                    }).join('');
                }
            }

            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        function markAllNotificationsRead(event) {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            const allIds = cachedNotifications.map(n => String(n.id));
            saveReadNotificationIds(allIds);
            renderMemberNotifications(cachedNotifications);
            showToast('✓ All notifications marked as read');
        }
        window.markAllAnnouncementsRead = markAllNotificationsRead;

        function readAndGoToCause(causeId, event) {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            const notifId = 'cause_' + causeId;
            const readIds = getReadNotificationIds();
            if (!readIds.includes(notifId)) {
                readIds.push(notifId);
                saveReadNotificationIds(readIds);
            }
            renderMemberNotifications(cachedNotifications);
            const dropdown = document.getElementById('memberNotificationDropdown');
            if (dropdown) dropdown.classList.add('hidden');

            switchTab('causes', event);

            setTimeout(() => {
                const card = document.getElementById('cause-card-' + causeId);
                if (card) {
                    card.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.classList.add('ring-4', 'ring-amber-500', 'ring-offset-2', 'dark:ring-offset-gray-900', 'scale-[1.02]');
                    setTimeout(() => {
                        card.classList.remove('ring-4', 'ring-amber-500', 'ring-offset-2', 'dark:ring-offset-gray-900', 'scale-[1.02]');
                    }, 2500);
                }
            }, 250);
        }

        function readAndOpenAnnouncement(annId, event) {
            if (event) {
                event.stopPropagation();
                event.preventDefault();
            }
            const notifId = 'ann_' + annId;
            const readIds = getReadNotificationIds();
            if (!readIds.includes(notifId)) {
                readIds.push(notifId);
                saveReadNotificationIds(readIds);
            }
            renderMemberNotifications(cachedNotifications);
            const dropdown = document.getElementById('memberNotificationDropdown');
            if (dropdown) dropdown.classList.add('hidden');

            const item = cachedNotifications.find(n => n.kind === 'announcement' && String(n.originalId) === String(annId));
            if (item) {
                openAnnouncementDetailModal(item);
            }
        }

        function openAnnouncementDetailModal(ann) {
            const modal = document.getElementById('announcementDetailModal');
            const titleEl = document.getElementById('detailAnnTitle');
            const msgEl = document.getElementById('detailAnnMessage');
            const dateEl = document.getElementById('detailAnnDate');
            const badgeEl = document.getElementById('detailAnnTypeBadge');

            if (titleEl) titleEl.textContent = ann.title || 'Announcement';
            if (msgEl) msgEl.textContent = ann.message || 'No description provided.';
            if (dateEl) dateEl.textContent = ann.date || 'Recent';

            if (badgeEl) {
                badgeEl.textContent = ann.category || 'General Notice';
            }

            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        function closeAnnouncementDetailModal() {
            const modal = document.getElementById('announcementDetailModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }

        function goToAnnouncementsTab(event) {
            if (event) event.preventDefault();
            const dropdown = document.getElementById('memberNotificationDropdown');
            if (dropdown) dropdown.classList.add('hidden');
            switchTab('causes', event);
        }

        async function fetchAndSyncNotifications() {
            try {
                const [annsRes, causesRes] = await Promise.all([
                    fetch('http://127.0.0.1:8000/api/announcements?status=Published').then(r => r.ok ? r.json() : []).catch(() => []),
                    fetch('http://127.0.0.1:8000/api/causes').then(r => r.ok ? r.json() : []).catch(() => [])
                ]);
                buildAndRenderNotifications(annsRes || [], causesRes || []);
            } catch (e) {}
        }

        function setTheme(mode) {
            const normalized = (mode === 'light' || mode === 'white') ? 'white' : mode;
            currentTheme = normalized;
            localStorage.setItem('pbk_theme', normalized);
            localStorage.setItem('pbk_admin_theme', normalized === 'white' ? 'light' : normalized);
            const html = document.documentElement;
            html.classList.remove('dark');

            const iconEl = document.getElementById('headerThemeIcon');
            const textEl = document.getElementById('headerThemeText');

            if (normalized === 'dark') {
                html.classList.add('dark');
                if (iconEl) iconEl.innerHTML = '<i data-lucide="moon" class="w-4 h-4 text-indigo-400"></i>';
                if (textEl) textEl.innerText = 'Dark';
            } else if (normalized === 'white') {
                html.classList.remove('dark');
                if (iconEl) iconEl.innerHTML = '<i data-lucide="sun" class="w-4 h-4 text-amber-500"></i>';
                if (textEl) textEl.innerText = 'Light';
            } else {
                if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
                    html.classList.add('dark');
                }
                if (iconEl) iconEl.innerHTML = '<i data-lucide="monitor" class="w-4 h-4 text-gray-300"></i>';
                if (textEl) textEl.innerText = 'System';
            }
            
            lucide.createIcons();

            const prefTheme = document.getElementById('prefThemeSelect');
            if (prefTheme) prefTheme.value = (normalized === 'white') ? 'white' : normalized;

            const menu = document.getElementById('themeDropdownMenu');
            if (menu) menu.classList.add('hidden');
        }

        function setLanguage(lang) {
            currentLang = lang;
            localStorage.setItem('pbk_lang', lang);
            const dict = i18n[lang] || i18n.en;
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                if (dict[key]) {
                    el.innerText = dict[key];
                }
            });
            const langSel = document.getElementById('prefLangSelect');
            if (langSel) langSel.value = lang;
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
        }

        function onPreferenceThemeChange(val) {
            setTheme(val);
        }

        function onPreferenceLanguageChange(val) {
            setLanguage(val);
        }

        function toggleNotificationSwitch(type) {
            notifPrefs[type] = !notifPrefs[type];
            localStorage.setItem('pbk_notif_' + type, notifPrefs[type]);
            updateToggleUI(type);
            showToast(`${type.toUpperCase()} notifications ${notifPrefs[type] ? 'enabled' : 'disabled'}`);
        }

        function updateToggleUI(type) {
            const isOn = notifPrefs[type];
            const btn = document.getElementById('toggle-' + type);
            const thumb = document.getElementById('thumb-' + type);
            const labelState = document.getElementById('state-' + type);
            
            if (!btn || !thumb) return;
            
            if (isOn) {
                btn.classList.remove('bg-gray-300', 'dark:bg-gray-700');
                btn.classList.add('bg-[#b45309]');
                thumb.classList.remove('translate-x-0');
                thumb.classList.add('translate-x-5');
                if (labelState) labelState.innerText = 'ON';
            } else {
                btn.classList.remove('bg-[#b45309]');
                btn.classList.add('bg-gray-300', 'dark:bg-gray-700');
                thumb.classList.remove('translate-x-5');
                thumb.classList.add('translate-x-0');
                if (labelState) labelState.innerText = 'OFF';
            }
        }

        function switchProfileTab(subTab) {
            ['overview', 'personal', 'security'].forEach(t => {
                const content = document.getElementById('profile-content-' + t);
                const btn = document.getElementById('profile-tab-' + t);
                if (content) content.classList.add('hidden');
                if (btn) {
                    btn.classList.remove('bg-[#963100]', 'text-white', 'shadow-md');
                    btn.classList.add('bg-white', 'dark:bg-gray-900', 'text-gray-700', 'dark:text-gray-300');
                }
            });
            const targetContent = document.getElementById('profile-content-' + subTab);
            const targetBtn = document.getElementById('profile-tab-' + subTab);
            if (targetContent) targetContent.classList.remove('hidden');
            if (targetBtn) {
                targetBtn.classList.remove('bg-white', 'dark:bg-gray-900', 'text-gray-700', 'dark:text-gray-300');
                targetBtn.classList.add('bg-[#963100]', 'text-white', 'shadow-md');
            }

            if (subTab === 'personal') {
                startEditingProfile();
            }
        }

        function updateAutoAddress() {
            const door = document.getElementById('editDoorNo').value.trim();
            const village = document.getElementById('editVillage').value.trim();
            const city = document.getElementById('editCity').value.trim();
            const district = document.getElementById('editDistrict').value.trim();
            const state = document.getElementById('editState').value.trim();

            let parts = [];
            if (door) parts.push(door);
            if (village) parts.push(village);
            if (city) parts.push(city);
            if (district) parts.push(district);
            if (state) parts.push(state);

            const fullAddrField = document.getElementById('editAddress');
            if (fullAddrField) {
                fullAddrField.value = parts.join(', ');
            }
        }

        function startEditingProfile() {
            const setVal = (id, val) => {
                const el = document.getElementById(id);
                if (el) el.value = val ?? '';
            };
            setVal('editFirstName', memberProfile.firstName);
            setVal('editLastName', memberProfile.lastName);
            setVal('editDob', memberProfile.dobRaw || memberProfile.dob || '');
            setVal('editDoorNo', memberProfile.doorNo || '');
            setVal('editVillage', memberProfile.village || '');
            setVal('editCity', memberProfile.city || '');
            setVal('editDistrict', memberProfile.district || '');
            setVal('editState', memberProfile.state || '');
            setVal('editAddress', memberProfile.address || '');
        }

        function saveProfileChanges() {
            memberProfile.firstName = (document.getElementById('editFirstName')?.value || '').trim();
            memberProfile.lastName = (document.getElementById('editLastName')?.value || '').trim();
            memberProfile.dobRaw = document.getElementById('editDob')?.value || '';
            
            if (memberProfile.dobRaw) {
                const parts = memberProfile.dobRaw.split('-');
                if (parts.length === 3) {
                    const d = new Date(parts[0], parts[1]-1, parts[2]);
                    memberProfile.dob = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
                } else {
                    memberProfile.dob = memberProfile.dobRaw;
                }
            } else {
                memberProfile.dob = '';
            }
            
            memberProfile.doorNo = (document.getElementById('editDoorNo')?.value || '').trim();
            memberProfile.village = (document.getElementById('editVillage')?.value || '').trim();
            memberProfile.city = (document.getElementById('editCity')?.value || '').trim();
            memberProfile.district = (document.getElementById('editDistrict')?.value || '').trim();
            memberProfile.state = (document.getElementById('editState')?.value || '').trim();
            memberProfile.address = (document.getElementById('editAddress')?.value || '').trim();

            updateProfileDisplayUI();

            // Persist to backend
            const memberId = getActiveMemberId();
            fetch(`http://127.0.0.1:8000/api/members/${memberId}/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    first_name: memberProfile.firstName,
                    last_name: memberProfile.lastName,
                    dob: memberProfile.dobRaw,
                    door_no: memberProfile.doorNo,
                    village: memberProfile.village,
                    city: memberProfile.city,
                    district: memberProfile.district,
                    state: memberProfile.state,
                    address: memberProfile.address
                })
            }).then(r => r.json()).then(res => {
                if (savedMemberSession) {
                    savedMemberSession.first_name = memberProfile.firstName;
                    savedMemberSession.last_name = memberProfile.lastName;
                    sessionStorage.setItem('pbk_member', JSON.stringify(savedMemberSession));
                }
            }).catch(err => console.warn('Profile save sync:', err));

            showToast('Profile updated successfully!');
            switchProfileTab('overview');
        }

        let passwordEditing = false;
        let phoneEditing = false;
        let emailEditing = false;
        let activePhoneOtpId = null;
        let activeEmailOtpId = null;

        function getActiveMemberId() {
            return activeMemberId || savedMemberSession?.member_id || savedMemberSession?.id || 21;
        }

// ==============================================================================
// SECTION 7: MEMBER PROFILE & SECURITY UPDATES
// Linked Tab: Profile Tab (Personal Info, Address, Security Subtab)
// Functions:
//   - togglePasswordEdit(): In-place change password form toggle & submission
//   - togglePhoneEdit()   : Step-by-step OTP phone update pipeline
//   - toggleEmailEdit()   : Step-by-step OTP email update pipeline
//   - saveProfile()       : Persists updated address & personal information
// ==============================================================================

// --- PASSWORD CHANGE PIPELINE ---
function togglePasswordEdit() {
            passwordEditing = !passwordEditing;
            const form = document.getElementById('passwordEditForm');
            const btn = document.getElementById('passwordEditToggleBtn');
            if (passwordEditing) {
                form.classList.remove('hidden');
                btn.innerText = 'Close';
                document.getElementById('secCurrentPassword').value = '';
                document.getElementById('secNewPassword').value = '';
                document.getElementById('secConfirmPassword').value = '';
            } else {
                form.classList.add('hidden');
                btn.innerText = 'Change';
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        function cancelPasswordEdit() {
            togglePasswordEdit();
        }

        async function savePasswordChanges() {
            const currentPassword = document.getElementById('secCurrentPassword').value.trim();
            const newPassword = document.getElementById('secNewPassword').value.trim();
            const confirmPassword = document.getElementById('secConfirmPassword').value.trim();

            if (!currentPassword) {
                showToast('Please enter your current password.', 'warning');
                return;
            }
            if (!newPassword || newPassword.length < 6) {
                showToast('New password must be at least 6 characters long.', 'warning');
                return;
            }
            if (newPassword !== confirmPassword) {
                showToast('New password and confirmation do not match.', 'error');
                return;
            }

            const memberId = getActiveMemberId();
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/members/${memberId}/security/change-password`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        current_password: currentPassword,
                        new_password: newPassword
                    })
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.detail || 'Failed to update password');
                }
                showToast('Password updated successfully in database!', 'success');
                togglePasswordEdit();
            } catch (err) {
                showToast(err.message, 'error');
            }
        }

        // --- PHONE NUMBER CHANGE & OTP VERIFICATION PIPELINE ---
        function togglePhoneEdit() {
            phoneEditing = !phoneEditing;
            const form = document.getElementById('phoneEditForm');
            const btn = document.getElementById('phoneEditToggleBtn');
            const otpBox = document.getElementById('secPhoneOtpContainer');
            if (phoneEditing) {
                form.classList.remove('hidden');
                btn.innerText = 'Close';
                const cur = (memberProfile.phone || '').replace('+91', '').trim();
                document.getElementById('secEditPhone').value = cur;
                if (otpBox) otpBox.classList.add('hidden');
                document.getElementById('secPhoneStatusHint').innerText = '⚠ Verification required for new phone number';
                document.getElementById('secPhoneStatusHint').className = 'text-[11px] text-amber-600 font-semibold mt-1 block';
            } else {
                form.classList.add('hidden');
                btn.innerText = 'Edit';
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        function markPhoneEdited() {
            activePhoneOtpId = null;
            const otpBox = document.getElementById('secPhoneOtpContainer');
            if (otpBox) otpBox.classList.add('hidden');
            document.getElementById('secPhoneStatusHint').innerText = '⚠ Verification required for new phone number';
            document.getElementById('secPhoneStatusHint').className = 'text-[11px] text-amber-600 font-semibold mt-1 block';
        }

        function cancelPhoneEdit() {
            togglePhoneEdit();
        }

        async function requestPhoneOtp() {
            const raw = document.getElementById('secEditPhone').value.trim();
            const clean = raw.replace(/\D/g, '');
            if (clean.length !== 10) {
                showToast('Please enter a valid 10-digit mobile number.', 'warning');
                return;
            }

            const sendBtn = document.getElementById('secPhoneSendOtpBtn');
            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.innerText = 'Sending...';
            }

            const memberId = getActiveMemberId();
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/members/${memberId}/security/send-phone-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ new_phone: clean })
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.detail || 'Failed to send verification code');
                }

                activePhoneOtpId = data.otp_id;
                const otpBox = document.getElementById('secPhoneOtpContainer');
                const otpMsg = document.getElementById('secPhoneOtpMsg');
                if (otpBox) otpBox.classList.remove('hidden');
                if (otpMsg) {
                    otpMsg.innerHTML = `OTP sent to +91 ${data.phone}. Code: <strong class="text-amber-900 dark:text-amber-200">${data.otp_code}</strong>`;
                }
                const codeInput = document.getElementById('secPhoneOtpCode');
                if (codeInput) {
                    codeInput.value = data.otp_code || '';
                    codeInput.focus();
                }
                showToast(`Verification code sent: ${data.otp_code}`, 'success');
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                if (sendBtn) {
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5"></i> Resend OTP';
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }
        }

        async function verifyPhoneOtpAndSave() {
            const raw = document.getElementById('secEditPhone').value.trim();
            const clean = raw.replace(/\D/g, '');
            const otpCode = document.getElementById('secPhoneOtpCode').value.trim();

            if (!activePhoneOtpId) {
                showToast('Please click "Send OTP" first to generate a code.', 'warning');
                return;
            }
            if (!otpCode) {
                showToast('Please enter the 4-digit verification code.', 'warning');
                return;
            }

            const verifyBtn = document.getElementById('secPhoneVerifyBtn');
            if (verifyBtn) {
                verifyBtn.disabled = true;
                verifyBtn.innerText = 'Verifying...';
            }

            const memberId = getActiveMemberId();
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/members/${memberId}/security/verify-phone-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        new_phone: clean,
                        otp_id: activePhoneOtpId,
                        otp_code: otpCode
                    })
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.detail || 'Verification failed');
                }

                memberProfile.phone = data.phone;
                memberProfile.phoneVerified = true;
                const disp = document.getElementById('secPhoneDisp');
                if (disp) disp.innerText = data.phone + ' (Verified)';

                if (savedMemberSession) {
                    savedMemberSession.phone = data.phone;
                    sessionStorage.setItem('pbk_member', JSON.stringify(savedMemberSession));
                }

                showToast('Phone number verified & updated in database!', 'success');
                togglePhoneEdit();
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                if (verifyBtn) {
                    verifyBtn.disabled = false;
                    verifyBtn.innerHTML = '<i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Verify & Update Phone';
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }
        }

        // --- EMAIL ADDRESS CHANGE & OTP VERIFICATION PIPELINE ---
        function toggleEmailEdit() {
            emailEditing = !emailEditing;
            const form = document.getElementById('emailEditForm');
            const btn = document.getElementById('emailEditToggleBtn');
            const otpBox = document.getElementById('secEmailOtpContainer');
            if (emailEditing) {
                form.classList.remove('hidden');
                btn.innerText = 'Close';
                document.getElementById('secEditEmail').value = memberProfile.email || '';
                if (otpBox) otpBox.classList.add('hidden');
                document.getElementById('secEmailStatusHint').innerText = '⚠ Verification required for new email address';
                document.getElementById('secEmailStatusHint').className = 'text-[11px] text-amber-600 font-semibold mt-1 block';
            } else {
                form.classList.add('hidden');
                btn.innerText = 'Edit';
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        function markEmailEdited() {
            activeEmailOtpId = null;
            const otpBox = document.getElementById('secEmailOtpContainer');
            if (otpBox) otpBox.classList.add('hidden');
            document.getElementById('secEmailStatusHint').innerText = '⚠ Verification required for new email address';
            document.getElementById('secEmailStatusHint').className = 'text-[11px] text-amber-600 font-semibold mt-1 block';
        }

        function cancelEmailEdit() {
            toggleEmailEdit();
        }

        async function requestEmailOtp() {
            const emailVal = document.getElementById('secEditEmail').value.trim().toLowerCase();
            if (!emailVal || !emailVal.includes('@') || !emailVal.includes('.')) {
                showToast('Please enter a valid email address.', 'warning');
                return;
            }

            const sendBtn = document.getElementById('secEmailSendOtpBtn');
            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.innerText = 'Sending...';
            }

            const memberId = getActiveMemberId();
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/members/${memberId}/security/send-email-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ new_email: emailVal })
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.detail || 'Failed to send verification code');
                }

                activeEmailOtpId = data.otp_id;
                const otpBox = document.getElementById('secEmailOtpContainer');
                const otpMsg = document.getElementById('secEmailOtpMsg');
                if (otpBox) otpBox.classList.remove('hidden');
                if (otpMsg) {
                    otpMsg.innerHTML = `OTP sent to ${data.email}. Code: <strong class="text-amber-900 dark:text-amber-200">${data.otp_code}</strong>`;
                }
                const codeInput = document.getElementById('secEmailOtpCode');
                if (codeInput) {
                    codeInput.value = data.otp_code || '';
                    codeInput.focus();
                }
                showToast(`Verification code sent: ${data.otp_code}`, 'success');
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                if (sendBtn) {
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5"></i> Resend OTP';
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }
        }

        async function verifyEmailOtpAndSave() {
            const emailVal = document.getElementById('secEditEmail').value.trim().toLowerCase();
            const otpCode = document.getElementById('secEmailOtpCode').value.trim();

            if (!activeEmailOtpId) {
                showToast('Please click "Send OTP" first to generate a code.', 'warning');
                return;
            }
            if (!otpCode) {
                showToast('Please enter the 4-digit verification code.', 'warning');
                return;
            }

            const verifyBtn = document.getElementById('secEmailVerifyBtn');
            if (verifyBtn) {
                verifyBtn.disabled = true;
                verifyBtn.innerText = 'Verifying...';
            }

            const memberId = getActiveMemberId();
            try {
                const res = await fetch(`http://127.0.0.1:8000/api/members/${memberId}/security/verify-email-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        new_email: emailVal,
                        otp_id: activeEmailOtpId,
                        otp_code: otpCode
                    })
                });
                const data = await res.json();
                if (!res.ok) {
                    throw new Error(data.detail || 'Verification failed');
                }

                memberProfile.email = data.email;
                memberProfile.emailVerified = true;
                const disp = document.getElementById('secEmailDisp');
                if (disp) disp.innerText = data.email + ' (Verified)';

                if (savedMemberSession) {
                    savedMemberSession.email = data.email;
                    sessionStorage.setItem('pbk_member', JSON.stringify(savedMemberSession));
                }

                showToast('Email address verified & updated in database!', 'success');
                toggleEmailEdit();
            } catch (err) {
                showToast(err.message, 'error');
            } finally {
                if (verifyBtn) {
                    verifyBtn.disabled = false;
                    verifyBtn.innerHTML = '<i data-lucide="check-circle" class="w-3.5 h-3.5"></i> Verify & Update Email';
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }
        }

// ==============================================================================
// SECTION 8: QUICK CONTRIBUTION MODAL & PDF RECEIPTS
// Linked Component: Contribute Modal & Official Receipt Modal
// Functions:
//   - openContributeModal()  : Launches popup quick donation modal
//   - setModalAmount()       : Preset donation pill click handler
//   - syncModalAmount()      : Validates & synchronizes custom amount input
//   - submitContribution()   : Posts contribution to backend API
//   - printReceipt()         : Triggers browser print styles for official receipt
//   - downloadReceipt()      : Generates downloadable PDF receipt via jsPDF
// ==============================================================================
let selectedModalAmount = 501;
let selectedPaymentMethod = 'UPI';

function openContributeModal(event) {
            if(event) event.preventDefault();
            document.getElementById('contributeModal').classList.remove('hidden');
        }

        function closeContributeModal() {
            document.getElementById('contributeModal').classList.add('hidden');
        }

        function setModalAmount(amt, button) {
            amt = Math.max(1, parseInt(amt, 10) || 501);
            selectedModalAmount = amt;
            document.getElementById('modalCustomAmount').value = amt;
            document.getElementById('modalPayBtnAmt').innerText = amt;
            document.querySelectorAll('.modal-amt-btn').forEach(btn => {
                btn.className = "modal-amt-btn py-3 text-sm sm:text-base font-extrabold rounded-xl border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition";
            });
            if (button) button.className = "modal-amt-btn py-3 text-sm sm:text-base font-extrabold rounded-xl border-2 border-amber-600 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 shadow-sm transition";
        }

        function syncModalAmount() {
            let el = document.getElementById('modalCustomAmount');
            if (!el) return;
            let val = parseInt(el.value, 10);
            if (isNaN(val) || val < 1) {
                if (el.value !== '') {
                    val = 1;
                    el.value = 1;
                } else {
                    val = 1;
                }
            }
            selectedModalAmount = val;
            const payBtnAmt = document.getElementById('modalPayBtnAmt');
            if (payBtnAmt) payBtnAmt.innerText = val;
            document.querySelectorAll('.modal-amt-btn').forEach(btn => {
                const bAmt = parseInt(btn.innerText.replace(/\D/g, ''), 10);
                if (bAmt === val) {
                    btn.className = "modal-amt-btn py-3 text-sm sm:text-base font-extrabold rounded-xl border-2 border-amber-600 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 shadow-sm transition";
                } else {
                    btn.className = "modal-amt-btn py-3 text-sm sm:text-base font-extrabold rounded-xl border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition";
                }
            });
        }
        window.syncModalAmount = syncModalAmount;

        function setPaymentMethod(method) {
            selectedPaymentMethod = method;
            const methods = ['UPI', 'Bank Transfer', 'Cash'];
            methods.forEach(m => {
                const card = document.getElementById('payCard-' + m);
                if (card) {
                    const radio = card.querySelector('input[type="radio"]');
                    if (m === method) {
                        card.className = "pay-method-card border-2 border-amber-600 bg-amber-50/90 dark:bg-amber-950/60 rounded-xl p-3.5 flex items-center space-x-2.5 cursor-pointer text-xs sm:text-sm font-extrabold text-amber-900 dark:text-amber-300 shadow-sm transition";
                        if (radio) radio.checked = true;
                    } else {
                        card.className = "pay-method-card border-2 border-gray-300 dark:border-gray-700 rounded-xl p-3.5 flex items-center space-x-2.5 cursor-pointer text-xs sm:text-sm font-extrabold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition";
                        if (radio) radio.checked = false;
                    }
                }
            });
        }

        async function submitContribution() {
            const amt = parseFloat(document.getElementById('modalCustomAmount').value) || selectedModalAmount;
            
            if (isNaN(amt) || amt <= 0) {
                showToast("Invalid Amount: Please enter a valid value greater than 0.");
                return;
            }

            const purpose = document.getElementById('modalPurpose').value;
            const validFunds = (Array.isArray(allFundsData) && allFundsData.length > 0)
                ? allFundsData
                : [
                    { name: 'Youth Fund', status: 'Active' },
                    { name: 'Village Fund', status: 'Active' },
                    { name: 'General Fund', status: 'Active' }
                  ];
            const matchedFund = validFunds.find(f => f.name === purpose);
            if (!matchedFund) {
                showToast("Please select a valid Fund type created in Admin.");
                return;
            }
            if (matchedFund.status === 'Inactive' || matchedFund.status === 'Disabled') {
                showToast("This fund is currently disabled and not accepting contributions.");
                return;
            }

            const dateVal = document.getElementById('modalDate').value;
            const notes = document.getElementById('modalNotes').value;

            let formattedDate = '30 Sep 2026';
            if (dateVal) {
                const d = new Date(dateVal);
                formattedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            }

            const memberId = savedMemberSession?.member_id || activeMemberId || 1;
            let newId = 'PBK-C' + String(userContributions.length + 1).padStart(3, '0');
            let contribStatus = 'Pending';

            try {
                const res = await fetch(`http://127.0.0.1:8000/api/members/${memberId}/contributions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contribution_amount: amt,
                        fund_name: purpose,
                        payment_method: selectedPaymentMethod,
                        notes: notes,
                        contribution_date: dateVal || null,
                        status: 'pending'
                    })
                });
                const data = await res.json();
                if (data && data.receipt_number) {
                    newId = data.receipt_number;
                }
                if (data && data.status) {
                    contribStatus = data.status === 'completed' ? 'Completed' : (data.status === 'rejected' ? 'Rejected' : 'Pending');
                }
            } catch (e) {
                console.warn('Backend contribution save error:', e);
            }

            userContributions.unshift({
                id: newId,
                date: formattedDate,
                purpose: purpose,
                amount: amt,
                method: selectedPaymentMethod,
                status: contribStatus,
                notes: notes
            });

            localStorage.setItem('pbk_user_contributions', JSON.stringify(userContributions));
            closeContributeModal();
            showToast('Contribution of ₹' + amt + ' submitted! Status: Pending Admin Verification.');
            renderContributions();
        }

        function renderContributions() {
            const tbody = document.getElementById('contributionsTableBody');
            const mobileCards = document.getElementById('contributionsCardsMobile');
            const emptyState = document.getElementById('contributionsEmptyState');
            if (!tbody) return;

            let filtered = [...userContributions];
            const searchVal = document.getElementById('filterSearch').value.toLowerCase();
            const purposeVal = document.getElementById('filterPurpose').value;

            if (searchVal) {
                filtered = filtered.filter(c => (c.purpose || '').toLowerCase().includes(searchVal) || (c.id || '').toLowerCase().includes(searchVal) || (c.status || '').toLowerCase().includes(searchVal));
            }
            if (purposeVal) {
                filtered = filtered.filter(c => c.purpose === purposeVal);
            }

            document.getElementById('contributionsCountBadge').innerText = filtered.length + ' records';

            // Only completed contributions to active funds count towards total money collected
            let totalLifetime = userContributions
                .filter(c => {
                    const matchedFund = (allFundsData || []).find(f => (f.name || '').toLowerCase() === (c.purpose || '').toLowerCase());
                    const isFundDisabled = matchedFund && (matchedFund.status === 'Inactive' || matchedFund.status === 'Disabled');
                    return !isFundDisabled && (c.status || '').toLowerCase() === 'completed';
                })
                .reduce((sum, c) => sum + Number(c.amount || 0), 0);
            const myStatTot = document.getElementById('myStatTotal');
            if (myStatTot) myStatTot.innerText = '₹' + totalLifetime.toLocaleString('en-IN');
            
            const myStatCnt = document.getElementById('myStatCount');
            if (myStatCnt) myStatCnt.innerText = userContributions.length;

            const currentYearStr = new Date().getFullYear().toString();
            let thisYearTotal = userContributions
                .filter(c => {
                    const matchedFund = (allFundsData || []).find(f => (f.name || '').toLowerCase() === (c.purpose || '').toLowerCase());
                    const isFundDisabled = matchedFund && (matchedFund.status === 'Inactive' || matchedFund.status === 'Disabled');
                    return !isFundDisabled && (c.date || '').includes(currentYearStr) && (c.status || '').toLowerCase() === 'completed';
                })
                .reduce((sum, c) => sum + Number(c.amount || 0), 0);
            const myThisYear = document.getElementById('myStatThisYear');
            if (myThisYear) myThisYear.innerText = '₹' + thisYearTotal.toLocaleString('en-IN');
            
            const lastAmtEl = document.getElementById('myStatLastAmt');
            const lastDateEl = document.getElementById('myStatLastDate');
            const lastActiveContrib = userContributions.find(c => {
                const matchedFund = (allFundsData || []).find(f => (f.name || '').toLowerCase() === (c.purpose || '').toLowerCase());
                return !matchedFund || (matchedFund.status !== 'Inactive' && matchedFund.status !== 'Disabled');
            });
            if (lastActiveContrib) {
                if (lastAmtEl) lastAmtEl.innerText = '₹' + Number(lastActiveContrib.amount || 0).toLocaleString('en-IN');
                if (lastDateEl) lastDateEl.innerText = lastActiveContrib.date || '—';
            } else {
                if (lastAmtEl) lastAmtEl.innerText = '—';
                if (lastDateEl) lastDateEl.innerText = '—';
            }

            if (filtered.length === 0) {
                tbody.innerHTML = '';
                mobileCards.innerHTML = '';
                emptyState.classList.remove('hidden');
                return;
            }
            
            emptyState.classList.add('hidden');

            let htmlDesktop = '';
            let htmlMobile = '';

            filtered.forEach(c => {
                const st = (c.status || 'Pending').toLowerCase();
                const matchedFund = (allFundsData || []).find(f => (f.name || '').toLowerCase() === (c.purpose || '').toLowerCase());
                const isFundDisabled = matchedFund && (matchedFund.status === 'Inactive' || matchedFund.status === 'Disabled');
                let statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300">Pending</span>`;
                if (isFundDisabled) {
                    statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">Fund Disabled</span>`;
                } else if (st === 'completed') {
                    statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">Completed</span>`;
                } else if (st === 'rejected') {
                    statusBadge = `<span class="px-2 py-0.5 rounded text-[10px] font-extrabold bg-rose-100 text-rose-800 dark:bg-rose-950/60 dark:text-rose-300">Rejected</span>`;
                }

                htmlDesktop += `
                    <tr class="hover:bg-amber-50/35 transition">
                        <td class="py-3.5 px-4 text-gray-500 whitespace-nowrap">${c.date}</td>
                        <td class="py-3.5 px-4 font-extrabold text-amber-800 dark:text-amber-400 whitespace-nowrap">${c.id}</td>
                        <td class="py-3.5 px-4 font-bold">${c.purpose}${isFundDisabled ? ' <span class="text-[10px] text-rose-500 font-bold">(Disabled)</span>' : ''}</td>
                        <td class="py-3.5 px-4 whitespace-nowrap">
                            ${isFundDisabled ? '<span class="font-bold text-gray-400 dark:text-gray-500 text-sm">—</span> <span class="text-[10px] text-rose-500 font-bold block">(Disabled)</span>' : `<span class="font-extrabold text-emerald-600">₹${Number(c.amount || 0).toLocaleString('en-IN')}</span>`}
                        </td>
                        <td class="py-3.5 px-4 text-gray-500 whitespace-nowrap">${c.method}</td>
                        <td class="py-3.5 px-4 whitespace-nowrap">${statusBadge}</td>
                        <td class="py-3.5 px-4 whitespace-nowrap">
                            <button onclick="viewReceipt('${c.id}')" class="text-xs font-bold text-amber-800 dark:text-amber-400 hover:underline flex items-center gap-1">
                                <i data-lucide="file-text" class="w-3.5 h-3.5"></i> View Receipt
                            </button>
                        </td>
                    </tr>
                `;

                htmlMobile += `
                    <div class="p-4 space-y-2">
                        <div class="flex justify-between items-center">
                            <span class="font-extrabold text-amber-800 dark:text-amber-400 text-xs">${c.id}</span>
                            <div class="flex items-center gap-2">
                                ${isFundDisabled ? '<span class="font-bold text-gray-400 text-xs">— (Disabled)</span>' : `<span class="font-bold text-gray-900 dark:text-white text-xs">₹${Number(c.amount || 0).toLocaleString('en-IN')}</span>`}
                                ${statusBadge}
                            </div>
                        </div>
                        <div class="flex justify-between text-xs font-medium">
                            <span>${c.purpose}${isFundDisabled ? ' (Disabled)' : ''}</span>
                            <span class="text-gray-500">${c.date} (${c.method})</span>
                        </div>
                        <div class="flex justify-end pt-1 border-t border-gray-100 dark:border-gray-800">
                            <button onclick="viewReceipt('${c.id}')" class="font-bold text-amber-700 dark:text-amber-400 hover:underline text-xs flex items-center gap-1">
                                <i data-lucide="file-text" class="w-3.5 h-3.5"></i> View Receipt
                            </button>
                        </div>
                    </div>
                `;
            });

            tbody.innerHTML = htmlDesktop;
            mobileCards.innerHTML = htmlMobile;

            // Calculate and display totals for this table
            const mCompleted = filtered.filter(c => (c.status || '').toLowerCase() === 'completed').reduce((sum, c) => sum + Number(c.amount || 0), 0);
            const mPending = filtered.filter(c => (c.status || '').toLowerCase() === 'pending').reduce((sum, c) => sum + Number(c.amount || 0), 0);
            const mRejected = filtered.filter(c => (c.status || '').toLowerCase() === 'rejected').reduce((sum, c) => sum + Number(c.amount || 0), 0);
            const mTotal = filtered.reduce((sum, c) => sum + Number(c.amount || 0), 0);

            const mFootComp = document.getElementById('mFootCompleted');
            if (mFootComp) mFootComp.innerText = '₹' + mCompleted.toLocaleString('en-IN');
            const mFootPend = document.getElementById('mFootPending');
            if (mFootPend) mFootPend.innerText = '₹' + mPending.toLocaleString('en-IN');
            const mFootRej = document.getElementById('mFootRejected');
            if (mFootRej) mFootRej.innerText = '₹' + mRejected.toLocaleString('en-IN');
            const mFootTot = document.getElementById('mFootTotal');
            if (mFootTot) mFootTot.innerText = '₹' + mTotal.toLocaleString('en-IN');

            lucide.createIcons();

            const pageRecentBody = document.getElementById('pageRecentContributionsBody');
            if (pageRecentBody) {
                let recentHtml = '';
                const topRecent = userContributions.slice(0, 3);
                if (topRecent.length === 0) {
                    recentHtml = `<tr><td colspan="4" class="py-4 text-center text-gray-500 text-xs">No contributions yet.</td></tr>`;
                } else {
                    topRecent.forEach(c => {
                        recentHtml += `
                            <tr class="hover:bg-amber-50/30 dark:hover:bg-gray-800/50 transition">
                                <td class="py-3 px-4 font-bold text-gray-900 dark:text-white">${c.id}</td>
                                <td class="py-3 px-4 font-extrabold text-emerald-600">₹${Number(c.amount || 0).toLocaleString('en-IN')}</td>
                                <td class="py-3 px-4 text-gray-500">${c.date}</td>
                                <td class="py-3 px-4 text-gray-500">${c.method}</td>
                            </tr>
                        `;
                    });
                }
                pageRecentBody.innerHTML = recentHtml;
            }
        }

        function filterContributions() {
            renderContributions();
        }

        function clearContributionFilters() {
            document.getElementById('filterSearch').value = '';
            document.getElementById('filterPurpose').value = '';
            renderContributions();
        }

        function convertNumberToWords(amount) {
            const num = Math.floor(Number(amount) || 0);
            if (num === 0) return 'Rupees Zero Only';
            
            const ones = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten',
                          'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
            const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];
            
            function toWords(n) {
                if (n < 20) return ones[n];
                if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 ? ' ' + ones[n % 10] : '');
                if (n < 1000) return ones[Math.floor(n / 100)] + ' Hundred' + (n % 100 ? ' ' + toWords(n % 100) : '');
                if (n < 100000) return toWords(Math.floor(n / 1000)) + ' Thousand' + (n % 1000 ? ' ' + toWords(n % 1000) : '');
                if (n < 10000000) return toWords(Math.floor(n / 100000)) + ' Lakh' + (n % 100000 ? ' ' + toWords(n % 100000) : '');
                return toWords(Math.floor(n / 10000000)) + ' Crore' + (n % 10000000 ? ' ' + toWords(n % 10000000) : '');
            }
            
            return 'Rupees ' + toWords(num) + ' Only';
        }

        let currentViewingContribution = null;

        function viewReceipt(contribId) {
            const found = userContributions.find(c => c.id === contribId);
            if (!found) return;
            currentViewingContribution = found;

            // Donor / Member Info
            const fullName = `${memberProfile.firstName || ''} ${memberProfile.lastName || ''}`.trim() || 'PBK Member';
            const donorNameEl = document.getElementById('a4DonorName');
            if (donorNameEl) donorNameEl.innerText = fullName;

            const activeId = memberProfile.id || activeMemberId || savedMemberSession?.member_id || savedMemberSession?.id || 1;
            const donorIdEl = document.getElementById('a4DonorId');
            if (donorIdEl) donorIdEl.innerText = `PBK-M${String(activeId).padStart(3, '0')}`;

            const phoneEl = document.getElementById('a4DonorPhone');
            if (phoneEl) phoneEl.innerText = memberProfile.phone ? ('+91 ' + memberProfile.phone.replace('+91', '').trim()) : '+91 9876543210';

            const emailEl = document.getElementById('a4DonorEmail');
            if (emailEl) emailEl.innerText = memberProfile.email || 'member@pbkcommunity.org';

            const dobEl = document.getElementById('a4DonorDob');
            if (dobEl) dobEl.innerText = memberProfile.dob || '1994-05-12';

            const genderEl = document.getElementById('a4DonorGender');
            if (genderEl) genderEl.innerText = memberProfile.gender || 'Male';

            const fullAddr = [memberProfile.village, memberProfile.city, memberProfile.district, memberProfile.state].filter(Boolean).join(', ') || memberProfile.address || 'PBK Community Member';
            const addrEl = document.getElementById('a4DonorAddress');
            if (addrEl) addrEl.innerText = fullAddr;

            // Receipt Metadata
            const cleanRecNo = String(found.id || 'C001').replace(/^PBK-/i, '');
            const recNumEl = document.getElementById('a4ReceiptNumber');
            if (recNumEl) recNumEl.innerText = `REC-PBK-${cleanRecNo}`;

            const issueDateEl = document.getElementById('a4ReceiptIssueDate');
            if (issueDateEl) issueDateEl.innerText = found.date || '10 Aug 2026';

            const issueTimeEl = document.getElementById('a4ReceiptIssueTime');
            if (issueTimeEl) issueTimeEl.innerText = found.time || '10:30 AM';

            // Contribution Table Fields
            const txIdEl = document.getElementById('a4TxId');
            if (txIdEl) txIdEl.innerText = found.id;

            const fundNameEl = document.getElementById('a4FundName');
            if (fundNameEl) fundNameEl.innerText = found.purpose || 'Village Fund';

            const amtNumEl = document.getElementById('a4AmountNum');
            if (amtNumEl) amtNumEl.innerText = '₹' + Number(found.amount || 0).toLocaleString('en-IN');

            const amtWordsEl = document.getElementById('a4AmountWords');
            if (amtWordsEl) amtWordsEl.innerText = convertNumberToWords(found.amount);

            const methodEl = document.getElementById('a4PaymentMethod');
            if (methodEl) methodEl.innerText = found.method || 'Bank Transfer';

            const refIdEl = document.getElementById('a4RefId');
            if (refIdEl) refIdEl.innerText = found.transaction_reference || found.ref || `UTR-${found.id}`;

            const txDateEl = document.getElementById('a4TxDate');
            if (txDateEl) txDateEl.innerText = found.date + (found.time ? `, ${found.time}` : ', 10:30 AM');

            // Dynamic Status & Official Stamp / Verification
            const stBadge = document.getElementById('a4StatusBadge');
            const verifiedOnEl = document.getElementById('a4VerifiedOn');
            const verifiedByEl = document.getElementById('a4VerifiedBy');
            const sealBottomText = document.getElementById('a4SealBottomText');
            const noticeEl = document.getElementById('a4ReceiptStatusNotice');

            const status = (found.status || 'Pending').toLowerCase();

            if (status === 'completed' || status === 'complete') {
                if (stBadge) {
                    stBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-emerald-700 text-white shadow-xs';
                    stBadge.innerHTML = '<i data-lucide="check-circle-2" class="w-3.5 h-3.5"></i> <span>Verified / Completed</span>';
                }
                if (verifiedOnEl) verifiedOnEl.innerText = found.verified_on || (found.date + ', 11:15 AM');
                if (verifiedByEl) verifiedByEl.innerText = 'Administrator (Super Admin)';
                if (sealBottomText) sealBottomText.textContent = 'OFFICIAL RECEIPT';
                if (noticeEl) {
                    noticeEl.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4 text-emerald-600"></i><span class="text-emerald-800 font-bold">Verified by Admin. Official A4 Receipt Voucher ready for download/print.</span>';
                }
            } else if (status === 'rejected') {
                if (stBadge) {
                    stBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-rose-600 text-white shadow-xs';
                    stBadge.innerHTML = '<i data-lucide="x-circle" class="w-3.5 h-3.5"></i> <span>Rejected</span>';
                }
                if (verifiedOnEl) verifiedOnEl.innerText = 'Declined by Administrator';
                if (verifiedByEl) verifiedByEl.innerText = 'Administrator (Super Admin)';
                if (sealBottomText) sealBottomText.textContent = 'REJECTED VOUCHER';
                if (noticeEl) {
                    noticeEl.innerHTML = '<i data-lucide="alert-circle" class="w-4 h-4 text-rose-600"></i><span class="text-rose-800 font-bold">Status: Verification was rejected by Administrator.</span>';
                }
            } else if (status === 'confirmed') {
                if (stBadge) {
                    stBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-blue-600 text-white shadow-xs';
                    stBadge.innerHTML = '<i data-lucide="check-circle" class="w-3.5 h-3.5"></i> <span>Confirmed</span>';
                }
                if (verifiedOnEl) verifiedOnEl.innerText = found.verified_on || found.date;
                if (verifiedByEl) verifiedByEl.innerText = 'Administrator (Super Admin)';
                if (sealBottomText) sealBottomText.textContent = 'OFFICIAL RECEIPT';
                if (noticeEl) {
                    noticeEl.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4 text-blue-600"></i><span class="text-blue-800 font-bold">Confirmed by Administrator. Ready for download/print.</span>';
                }
            } else {
                // Pending status
                if (stBadge) {
                    stBadge.className = 'inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-amber-500 text-white shadow-xs';
                    stBadge.innerHTML = '<i data-lucide="clock" class="w-3.5 h-3.5"></i> <span>Pending Verification</span>';
                }
                if (verifiedOnEl) verifiedOnEl.innerText = 'Pending Admin Approval';
                if (verifiedByEl) verifiedByEl.innerText = 'Pending Verification';
                if (sealBottomText) sealBottomText.textContent = 'PROVISIONAL RECEIPT';
                if (noticeEl) {
                    noticeEl.innerHTML = '<i data-lucide="clock" class="w-4 h-4 text-amber-600"></i><span class="text-amber-800 font-bold">Status: Pending Admin Verification. You can still print or download this provisional receipt.</span>';
                }
            }

            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }

            const modal = document.getElementById('receiptModal');
            if (modal) {
                modal.classList.remove('hidden');
            }
        }

        function openReceiptModal(contribId) {
            viewReceipt(contribId);
        }

        function closeReceiptModal() {
            const modal = document.getElementById('receiptModal');
            if (modal) modal.classList.add('hidden');
        }

        function printReceipt() {
            const sheet = document.getElementById('receiptA4Sheet');
            if (!sheet) return;

            // Remove any previous print iframe
            let iframe = document.getElementById('receiptPrintIframe');
            if (iframe) iframe.remove();

            iframe = document.createElement('iframe');
            iframe.id = 'receiptPrintIframe';
            iframe.style.position = 'fixed';
            iframe.style.right = '0';
            iframe.style.bottom = '0';
            iframe.style.width = '0';
            iframe.style.height = '0';
            iframe.style.border = '0';
            document.body.appendChild(iframe);

            const doc = iframe.contentWindow.document;
            doc.open();
            doc.write(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>PBK Donation Receipt</title>
                    <meta charset="UTF-8">
                    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700;800;900&family=Dancing+Script:wght@700&family=Great+Vibes&display=swap" rel="stylesheet">
                    <script src="https://cdn.tailwindcss.com"></script>
                    <style>
                        @page {
                            size: A4 portrait;
                            margin: 6mm;
                        }
                        html, body {
                            margin: 0;
                            padding: 0;
                            background: #ffffff !important;
                            color: #111827 !important;
                            font-family: 'Inter', sans-serif;
                            -webkit-print-color-adjust: exact !important;
                            print-color-adjust: exact !important;
                            overflow: visible !important;
                            height: auto !important;
                        }
                        .print-container {
                            width: 100% !important;
                            max-width: 100% !important;
                            margin: 0 auto !important;
                            box-sizing: border-box !important;
                        }
                        .no-print { display: none !important; }
                    </style>
                </head>
                <body>
                    <div class="print-container">
                        ${sheet.outerHTML}
                    </div>
                    <script>
                        window.onload = function() {
                            setTimeout(function() {
                                window.focus();
                                window.print();
                            }, 500);
                        };
                    </script>
                </body>
                </html>
            `);
            doc.close();
        }

        async function downloadReceipt() {
            const sheet = document.getElementById('receiptA4Sheet');
            if (!sheet) return;

            showToast('Generating official complete A4 PDF receipt...');

            try {
                if (typeof html2canvas === 'undefined' || typeof window.jspdf === 'undefined') {
                    printReceipt();
                    return;
                }

                // Render with html2canvas at scale 2.5 for crisp 300dpi printing
                const canvas = await html2canvas(sheet, {
                    scale: 2.5,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    scrollY: -window.scrollY,
                    scrollX: -window.scrollX
                });

                const { jsPDF } = window.jspdf;
                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'mm',
                    format: 'a4'
                });

                const pageWidth = pdf.internal.pageSize.getWidth();   // 210mm
                const pageHeight = pdf.internal.pageSize.getHeight(); // 297mm

                const margin = 8;
                const maxW = pageWidth - (margin * 2);
                const maxH = pageHeight - (margin * 2);

                const imgRatio = canvas.width / canvas.height;
                let renderW = maxW;
                let renderH = maxW / imgRatio;

                if (renderH > maxH) {
                    renderH = maxH;
                    renderW = maxH * imgRatio;
                }

                const posX = (pageWidth - renderW) / 2;
                const posY = (pageHeight - renderH) / 2;

                const imgData = canvas.toDataURL('image/png', 1.0);
                pdf.addImage(imgData, 'PNG', posX, posY, renderW, renderH, undefined, 'FAST');

                const txNum = document.getElementById('a4ReceiptNumber')?.innerText || 'REC-PBK-C001';
                pdf.save(`PBK_Donation_Receipt_${txNum}.pdf`);
                showToast('Official A4 PDF downloaded successfully!');
            } catch (err) {
                console.error('Error generating PDF:', err);
                showToast('PDF export failed. Opening print window...');
                printReceipt();
            }
        }

        async function downloadReceiptImage() {
            const sheet = document.getElementById('receiptA4Sheet');
            if (!sheet) return;

            showToast('Generating high-resolution receipt image...');

            try {
                if (typeof html2canvas === 'undefined') {
                    printReceipt();
                    return;
                }

                const canvas = await html2canvas(sheet, {
                    scale: 2.5,
                    useCORS: true,
                    allowTaint: true,
                    backgroundColor: '#ffffff',
                    logging: false,
                    scrollY: -window.scrollY,
                    scrollX: -window.scrollX
                });

                const link = document.createElement('a');
                const txNum = document.getElementById('a4ReceiptNumber')?.innerText || 'REC-PBK-C001';
                link.download = `PBK_Donation_Receipt_${txNum}.png`;
                link.href = canvas.toDataURL('image/png', 1.0);
                document.body.appendChild(link);
                link.click();
                link.remove();

                showToast('High-resolution receipt image downloaded!');
            } catch (err) {
                console.error('Error generating image:', err);
                showToast('Image export failed.');
            }
        }

        function showToast(msg) {
            const t = document.getElementById('toast');
            if (!t) return;
            const msgEl = document.getElementById('toastMsg');
            if (msgEl) msgEl.innerText = msg;
            t.classList.remove('-translate-y-20', 'translate-y-20', 'opacity-0');
            setTimeout(() => {
                t.classList.add('-translate-y-20', 'opacity-0');
            }, 3500);
        }

// ==============================================================================
// SECTION 9: SESSION MANAGEMENT & LOGOUT PIPELINE
// Linked Component: App Sidebar Logout Button
// Functions:
//   - handleLogout()       : Clears session storage and redirects to login portal
//   - changeFinancialYear(): Switches active financial year across tabs
// ==============================================================================
function handleLogout() {
            sessionStorage.removeItem('pbk_member');
            window.location.href = '../HomeLogRegisPass/HomeLogRegisPass.html#login';
        }

        function changeFinancialYear(year, skipToast = false) {
            localStorage.setItem('pbk_financial_year', year);

            const endYear = parseInt(year, 10) + 1;
            const fullLabel = year + ' - ' + endYear;
            const shortLabel = year + '–' + endYear;
            
            const globalSelect = document.getElementById('globalYearSelect');
            const fundSelect = document.getElementById('fundDetailsYearSelect');
            
            if (globalSelect && globalSelect.value !== year) {
                globalSelect.value = year;
            }
            if (fundSelect && fundSelect.value !== year) {
                fundSelect.value = year;
            }

            document.querySelectorAll('.dynamic-fin-year').forEach(el => {
                el.innerText = shortLabel;
            });
            
            const indicator = document.getElementById('chartYearIndicator');
            if (indicator) indicator.innerText = fullLabel;
            
            if (!skipToast) {
                showToast('Financial Year switched to ' + fullLabel);
            }

            renderMemberFundOverview();
            renderMemberFundUsage();
        }

        window.onload = function() {
            setTheme(currentTheme);
            setLanguage(currentLang);
            initNotificationToggles();
            startEditingProfile();
            
            const pDate = document.getElementById('pageDate');
            if (pDate) pDate.value = localDate;
            renderContributions();

            const savedYear = localStorage.getItem('pbk_financial_year') || '2026';
            changeFinancialYear(savedYear, true);

            renderMemberYearlyChart();
            loadMemberDataFromBackend();
            if (typeof lucide !== 'undefined' && lucide.createIcons) {
                lucide.createIcons();
            }
        };

        function initNotificationToggles() {
            ['email', 'whatsapp'].forEach(type => {
                updateToggleUI(type);
            });
        }

// ==============================================================================
// SECTION 10: DYNAMIC AMOUNT-EMBEDDED QR & UPI DONATION ENGINE
// Linked Tab: Contribute Tab (In-page Contribution Form)
// Functions:
//   - fetchMemberDonationSettings(): Loads admin-configured UPI ID & bank info
//   - regenerateDonationQR()       : Encodes dynamic amount & payee into SVG/Canvas QR
//   - setUpiApp()                  : Selects UPI app (General, PhonePe, GPay, Paytm, BHIM)
//   - setPageAmount()              : Preset donation button handler with positive guard
//   - syncPageAmount()             : Strictly enforces positive amount (>= 1, blocks -, e)
//   - submitPageContribution()     : Submits in-page donation & redirects to receipts
// ==============================================================================
let selectedPageAmount = 501;
let selectedPagePaymentMethod = 'UPI';
let selectedUpiApp = 'general';
let memberDonationSettings = null;

        async function fetchMemberDonationSettings() {
            try {
                const res = await fetch('http://127.0.0.1:8000/api/donation-settings');
                if (res.ok) {
                    memberDonationSettings = await res.json();
                } else {
                    memberDonationSettings = JSON.parse(localStorage.getItem('pbk_donation_settings') || 'null');
                }
            } catch (e) {
                memberDonationSettings = JSON.parse(localStorage.getItem('pbk_donation_settings') || 'null');
            }

            if (!memberDonationSettings) {
                memberDonationSettings = {
                    upi_id: 'chanda.collection@bank',
                    payee_name: 'PBK Community Welfare Fund',
                    bank_name: 'State Bank of India',
                    account_number: '987654321012',
                    ifsc_code: 'SBIN0001234',
                    branch_name: 'Main Branch',
                    notes: 'PBK Chanda Contribution'
                };
            }

            const upiIdEl = document.getElementById('memberUpiIdDisplay');
            const payeeEl = document.getElementById('memberPayeeNameDisplay');
            const bankNameEl = document.getElementById('memberBankNameDisplay');
            const bankAccEl = document.getElementById('memberBankAccDisplay');
            const bankIfscEl = document.getElementById('memberBankIfscDisplay');
            const bankHolderEl = document.getElementById('memberBankHolderDisplay');

            if (upiIdEl) upiIdEl.textContent = memberDonationSettings.upi_id || 'chanda.collection@bank';
            if (payeeEl) payeeEl.textContent = memberDonationSettings.payee_name || 'PBK Community Welfare Fund';
            if (bankNameEl) bankNameEl.textContent = memberDonationSettings.bank_name || 'State Bank of India';
            if (bankAccEl) bankAccEl.textContent = memberDonationSettings.account_number || '987654321012';
            if (bankIfscEl) bankIfscEl.textContent = memberDonationSettings.ifsc_code || 'SBIN0001234';
            if (bankHolderEl) bankHolderEl.textContent = memberDonationSettings.payee_name || 'PBK Community Welfare Fund';

            updateMemberDynamicQr();
        }
        window.fetchMemberDonationSettings = fetchMemberDonationSettings;

        function setPageAmount(amt, button) {
            amt = Math.max(1, parseInt(amt, 10) || 501);
            selectedPageAmount = amt;
            const customInput = document.getElementById('pageCustomAmount');
            if (customInput) customInput.value = amt;

            updateAmountDisplays(amt);

            document.querySelectorAll('.page-amt-btn').forEach(btn => {
                btn.className = "page-amt-btn py-3 text-sm sm:text-base font-extrabold rounded-xl border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition";
            });
            if (button) {
                button.className = "page-amt-btn py-3 text-sm sm:text-base font-extrabold rounded-xl border-2 border-amber-600 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 shadow-sm transition";
            }
            updateMemberDynamicQr();
        }
        window.setPageAmount = setPageAmount;

        function syncPageAmount() {
            const input = document.getElementById('pageCustomAmount');
            if (!input) return;
            let raw = input.value;
            
            // Strictly positive validation: cannot be negative or zero
            let val = parseInt(raw, 10);
            if (isNaN(val) || val < 1) {
                if (raw !== '') {
                    val = 1;
                    input.value = 1;
                } else {
                    val = 1;
                }
            }

            selectedPageAmount = val;
            updateAmountDisplays(val);

            document.querySelectorAll('.page-amt-btn').forEach(btn => {
                const bAmt = parseInt(btn.innerText.replace(/\D/g, ''), 10);
                if (bAmt === val) {
                    btn.className = "page-amt-btn py-3 text-sm sm:text-base font-extrabold rounded-xl border-2 border-amber-600 bg-amber-50 dark:bg-amber-950/50 text-amber-900 dark:text-amber-300 shadow-sm transition";
                } else {
                    btn.className = "page-amt-btn py-3 text-sm sm:text-base font-extrabold rounded-xl border-2 border-gray-300 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition";
                }
            });

            updateMemberDynamicQr();
        }
        window.syncPageAmount = syncPageAmount;

        function updateAmountDisplays(amt) {
            const btnAmt = document.getElementById('pagePayBtnAmt');
            const qrAmt = document.getElementById('qrPayAmountDisplay');
            const directAmt = document.getElementById('upiDirectAmt');
            const bankAmt = document.getElementById('bankPayAmountDisplay');
            const cashAmt = document.getElementById('cashPayAmountDisplay');

            if (btnAmt) btnAmt.innerText = amt;
            if (qrAmt) qrAmt.innerText = amt;
            if (directAmt) directAmt.innerText = amt;
            if (bankAmt) bankAmt.innerText = amt;
            if (cashAmt) cashAmt.innerText = amt;
        }

        function selectUpiApp(appKey, button) {
            selectedUpiApp = appKey;
            const appNames = {
                'general': 'Any UPI App',
                'phonepe': 'PhonePe',
                'gpay': 'Google Pay',
                'paytm': 'Paytm',
                'bhim': 'BHIM UPI'
            };
            const appName = appNames[appKey] || 'UPI App';
            const displayEl = document.getElementById('selectedAppNameDisplay');
            if (displayEl) displayEl.textContent = appName;

            document.querySelectorAll('#memberUpiAppGrid .upi-app-btn').forEach(b => {
                b.classList.remove('border-amber-600', 'bg-amber-50', 'dark:bg-amber-950/60', 'shadow-sm');
                b.classList.add('border-gray-200', 'dark:border-gray-700');
            });
            if (button) {
                button.classList.add('border-amber-600', 'bg-amber-50', 'dark:bg-amber-950/60', 'shadow-sm');
                button.classList.remove('border-gray-200', 'dark:border-gray-700');
            }

            updateMemberDynamicQr();
        }
        window.selectUpiApp = selectUpiApp;

        function updateMemberDynamicQr() {
            const container = document.getElementById('memberDynamicQrCode');
            if (!container) return;

            const upiId = (memberDonationSettings && memberDonationSettings.upi_id) || 'chanda.collection@bank';
            const payee = (memberDonationSettings && memberDonationSettings.payee_name) || 'PBK Community Welfare Fund';
            const amt = Math.max(1, selectedPageAmount || 501);
            const notes = (memberDonationSettings && memberDonationSettings.notes) || 'PBK Chanda Contribution';

            // Standard UPI URI format prefilling exact amount:
            const standardUpiUrl = `upi://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${amt}&cu=INR&tn=${encodeURIComponent(notes)}`;

            let intentUrl = standardUpiUrl;
            if (selectedUpiApp === 'phonepe') {
                intentUrl = `phonepe://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${amt}&cu=INR&tn=${encodeURIComponent(notes)}`;
            } else if (selectedUpiApp === 'gpay') {
                intentUrl = `gpay://upi/pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${amt}&cu=INR&tn=${encodeURIComponent(notes)}`;
            } else if (selectedUpiApp === 'paytm') {
                intentUrl = `paytmmp://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${amt}&cu=INR&tn=${encodeURIComponent(notes)}`;
            } else if (selectedUpiApp === 'bhim') {
                intentUrl = `bhim://pay?pa=${encodeURIComponent(upiId)}&pn=${encodeURIComponent(payee)}&am=${amt}&cu=INR&tn=${encodeURIComponent(notes)}`;
            }

            const directBtn = document.getElementById('btnDirectUpiPay');
            if (directBtn) {
                directBtn.href = standardUpiUrl;
                directBtn.onclick = (e) => {
                    try {
                        window.location.href = intentUrl;
                    } catch (err) {
                        window.location.href = standardUpiUrl;
                    }
                };
            }

            container.innerHTML = '';
            if (typeof QRCode !== 'undefined') {
                new QRCode(container, {
                    text: standardUpiUrl,
                    width: 176,
                    height: 176,
                    colorDark: "#111827",
                    colorLight: "#ffffff",
                    correctLevel: QRCode.CorrectLevel.M
                });
            } else {
                const img = document.createElement('img');
                img.src = `https://api.qrserver.com/v1/create-qr-code/?size=176x176&data=${encodeURIComponent(standardUpiUrl)}`;
                img.alt = `UPI QR Code for ₹${amt}`;
                img.className = 'w-44 h-44 mx-auto';
                container.appendChild(img);
            }
        }
        window.updateMemberDynamicQr = updateMemberDynamicQr;

        function setPagePaymentMethod(method) {
            selectedPagePaymentMethod = method;
            const methods = ['UPI', 'Bank Transfer', 'Cash'];
            methods.forEach(m => {
                const card = document.getElementById('pagePayCard-' + m);
                if (card) {
                    const radio = card.querySelector('input[type="radio"]');
                    if (m === method) {
                        card.className = "page-pay-method-card border-2 border-amber-600 bg-amber-50/90 dark:bg-amber-950/60 rounded-xl p-3.5 flex items-center space-x-2.5 cursor-pointer text-sm font-extrabold text-amber-900 dark:text-amber-300 shadow-sm transition";
                        if (radio) radio.checked = true;
                    } else {
                        card.className = "page-pay-method-card border-2 border-gray-300 dark:border-gray-700 rounded-xl p-3.5 flex items-center space-x-2.5 cursor-pointer text-sm font-extrabold text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition";
                        if (radio) radio.checked = false;
                    }
                }
            });

            // Toggle panels on the right side
            const upiPanel = document.getElementById('memberUpiPaymentPanel');
            const bankPanel = document.getElementById('memberBankPaymentPanel');
            const cashPanel = document.getElementById('memberCashPaymentPanel');
            const txnRefWrapper = document.getElementById('pageTxnRefWrapper');

            if (method === 'UPI') {
                if (upiPanel) upiPanel.classList.remove('hidden');
                if (bankPanel) bankPanel.classList.add('hidden');
                if (cashPanel) cashPanel.classList.add('hidden');
                if (txnRefWrapper) txnRefWrapper.classList.remove('hidden');
                updateMemberDynamicQr();
            } else if (method === 'Bank Transfer') {
                if (upiPanel) upiPanel.classList.add('hidden');
                if (bankPanel) bankPanel.classList.remove('hidden');
                if (cashPanel) cashPanel.classList.add('hidden');
                if (txnRefWrapper) txnRefWrapper.classList.remove('hidden');
            } else if (method === 'Cash') {
                if (upiPanel) upiPanel.classList.add('hidden');
                if (bankPanel) bankPanel.classList.add('hidden');
                if (cashPanel) cashPanel.classList.remove('hidden');
                if (txnRefWrapper) txnRefWrapper.classList.add('hidden');
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }
        window.setPagePaymentMethod = setPagePaymentMethod;

        function copyUpiId() {
            const upiId = (memberDonationSettings && memberDonationSettings.upi_id) || "chanda.collection@bank";
            if (navigator.clipboard) {
                navigator.clipboard.writeText(upiId).then(() => {
                    showToast('✓ UPI ID copied: ' + upiId);
                }).catch(() => fallbackCopy(upiId, 'UPI ID'));
            } else {
                fallbackCopy(upiId, 'UPI ID');
            }
        }
        window.copyUpiId = copyUpiId;

        function copyText(elementId, label = 'Text') {
            const el = document.getElementById(elementId);
            const text = el ? el.innerText.trim() : '';
            if (!text) return;
            if (navigator.clipboard) {
                navigator.clipboard.writeText(text).then(() => {
                    showToast(`✓ ${label} copied to clipboard!`);
                }).catch(() => fallbackCopy(text, label));
            } else {
                fallbackCopy(text, label);
            }
        }
        window.copyText = copyText;

        function fallbackCopy(text, label) {
            const textArea = document.createElement("textarea");
            textArea.value = text;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                showToast(`✓ ${label} copied to clipboard!`);
            } catch (err) {}
            document.body.removeChild(textArea);
        }

        async function submitPageContribution() {
            const rawVal = document.getElementById('pageCustomAmount').value;
            const amt = Math.max(1, parseInt(rawVal, 10) || selectedPageAmount || 501);
            
            if (isNaN(amt) || amt <= 0) {
                showToast("Invalid Amount: Please enter a valid positive value greater than 0.");
                return;
            }

            const purpose = document.getElementById('pagePurpose').value;
            const validFunds = (Array.isArray(allFundsData) && allFundsData.length > 0)
                ? allFundsData
                : [
                    { name: 'Youth Fund', status: 'Active' },
                    { name: 'Village Fund', status: 'Active' },
                    { name: 'General Fund', status: 'Active' }
                  ];
            const matchedFund = validFunds.find(f => f.name === purpose);
            if (!matchedFund) {
                showToast("Please select a valid Fund type created in Admin.");
                return;
            }
            if (matchedFund.status === 'Inactive' || matchedFund.status === 'Disabled') {
                showToast("This fund is currently disabled and not accepting contributions.");
                return;
            }

            const dateVal = document.getElementById('pageDate').value;
            const notes = document.getElementById('pageNotes').value;
            const txnRef = document.getElementById('pageTxnRef')?.value.trim() || null;

            let formattedDate = '30 Sep 2026';
            if (dateVal) {
                const d = new Date(dateVal);
                formattedDate = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
            }

            const memberId = savedMemberSession?.member_id || activeMemberId || 1;
            let newId = 'PBK-C' + String(userContributions.length + 1).padStart(3, '0');
            let contribStatus = 'Pending';

            try {
                const res = await fetch(`http://127.0.0.1:8000/api/members/${memberId}/contributions`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contribution_amount: amt,
                        fund_name: purpose,
                        payment_method: selectedPagePaymentMethod === 'UPI' ? 'QR Code / UPI' : selectedPagePaymentMethod,
                        notes: notes,
                        contribution_date: dateVal || null,
                        transaction_reference: txnRef,
                        status: 'pending'
                    })
                });
                const data = await res.json();
                if (data && data.receipt_number) {
                    newId = data.receipt_number;
                }
                if (data && data.status) {
                    contribStatus = data.status === 'completed' ? 'Completed' : (data.status === 'rejected' ? 'Rejected' : 'Pending');
                }
            } catch (e) {
                console.warn('Backend page contribution error:', e);
            }

            userContributions.unshift({
                id: newId,
                date: formattedDate,
                purpose: purpose,
                amount: amt,
                method: selectedPagePaymentMethod === 'UPI' ? 'QR Code / UPI' : selectedPagePaymentMethod,
                status: contribStatus,
                notes: notes,
                transaction_reference: txnRef
            });

            localStorage.setItem('pbk_user_contributions', JSON.stringify(userContributions));
            
            showToast('Contribution of ₹' + amt + ' submitted! Status: Pending Admin Verification.');
            renderContributions();
            
            document.getElementById('pageNotes').value = '';
            const txnInput = document.getElementById('pageTxnRef');
            if (txnInput) txnInput.value = '';
            setPageAmount(501, document.querySelector('.page-amt-btn'));
            
            switchTab('my-contributions');
        }

// ==============================================================================
// SECTION 11: MEMBER ACCOUNT LIFECYCLE (DISABLE & 30-DAY RETENTION OTP DELETION)
// Linked Tab: Profile Tab -> Security Settings Subtab
// Functions:
//   - openDisableAccountModal() : Opens confirmation popup to temporarily disable account
//   - executeDisableAccount()   : Signs out member and sets account status to 'inactive'
//   - openDeleteAccountModal()  : Prepares phone/email OTP deletion modal
//   - sendDeleteAccountOtp()    : Generates & dispatches 6-digit confirmation OTP
//   - confirmDeleteAccount()    : Verifies OTP, activates 30-day retention grace period
// ==============================================================================
let activeDeleteOtpId = null;

function openDisableAccountModal() {
            const modal = document.getElementById('disableAccountModal');
            const pwdInput = document.getElementById('disableAccPassword');
            if (pwdInput) pwdInput.value = '';
            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        function closeDisableAccountModal() {
            const modal = document.getElementById('disableAccountModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }

        async function executeDisableAccount() {
            const btn = document.getElementById('confirmDisableBtn');
            const pwdInput = document.getElementById('disableAccPassword');
            const memberId = getActiveMemberId();

            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '<span class="animate-spin mr-2">⏳</span> Disabling Account...';
            }

            try {
                const res = await fetch(`http://127.0.0.1:8000/api/members/${memberId}/disable`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ password: pwdInput ? pwdInput.value.trim() : null })
                });
                const data = await res.json();
                if (!res.ok) {
                    showToast(data.detail || 'Failed to disable account', 'error');
                    return;
                }

                closeDisableAccountModal();
                alert('Your account has been temporarily disabled. All your data and receipts are preserved. You can reactivate anytime simply by logging back in.');
                sessionStorage.removeItem('pbk_member');
                window.location.href = '../HomeLogRegisPass/HomeLogRegisPass.html#login';
            } catch (err) {
                showToast('Network error: ' + err.message, 'error');
            } finally {
                if (btn) {
                    btn.disabled = false;
                    btn.innerHTML = '<i data-lucide="pause" class="w-4 h-4"></i> Yes, Disable Account';
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }
        }

        function openDeleteAccountModal() {
            activeDeleteOtpId = null;
            const modal = document.getElementById('deleteAccountModal');
            const otpContainer = document.getElementById('delOtpInputContainer');
            const otpInput = document.getElementById('delOtpCodeInput');
            const sendBtn = document.getElementById('btnSendDeleteOtp');

            if (otpContainer) otpContainer.classList.add('hidden');
            if (otpInput) otpInput.value = '';
            if (sendBtn) {
                sendBtn.disabled = false;
                sendBtn.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5"></i> Send Verification OTP Code';
            }

            const phone = memberProfile?.phone || savedMemberSession?.phone || '';
            const email = memberProfile?.email || savedMemberSession?.email || '';

            const phoneEl = document.getElementById('delOtpPhoneTarget');
            if (phoneEl) {
                const cleanP = phone.replace(/\D/g, '');
                phoneEl.textContent = cleanP.length >= 4 ? `+91 ******${cleanP.slice(-4)}` : (phone || 'Registered Mobile');
            }

            const emailEl = document.getElementById('delOtpEmailTarget');
            if (emailEl) {
                if (email && email.includes('@')) {
                    const parts = email.split('@');
                    emailEl.textContent = `${parts[0].slice(0, 2)}***@${parts[1]}`;
                } else {
                    emailEl.textContent = email || 'No registered email';
                }
            }

            const alertEl = document.getElementById('delModalAlert');
            if (alertEl) {
                alertEl.innerHTML = '';
                alertEl.className = 'hidden mb-3.5 p-3.5 rounded-xl border text-xs font-bold transition';
            }

            if (modal) {
                modal.classList.remove('hidden');
                modal.classList.add('flex');
            }
            if (typeof lucide !== 'undefined') lucide.createIcons();
        }

        function closeDeleteAccountModal() {
            const modal = document.getElementById('deleteAccountModal');
            if (modal) {
                modal.classList.add('hidden');
                modal.classList.remove('flex');
            }
        }

        async function sendDeleteAccountOtp() {
            const sendBtn = document.getElementById('btnSendDeleteOtp');
            const channelInput = document.querySelector('input[name="deleteOtpChannel"]:checked');
            const channel = channelInput ? channelInput.value : 'Phone';
            const memberId = getActiveMemberId();
            const alertEl = document.getElementById('delModalAlert');

            if (sendBtn) {
                sendBtn.disabled = true;
                sendBtn.innerHTML = '<span class="animate-spin mr-2">⏳</span> Sending Code...';
            }

            try {
                const res = await fetch(`http://127.0.0.1:8000/api/members/${memberId}/delete/send-otp`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ otp_channel: channel })
                });
                const data = await res.json();
                if (!res.ok) {
                    if (alertEl) {
                        alertEl.className = 'mb-3.5 p-3.5 rounded-2xl border border-red-500/40 bg-red-50 dark:bg-red-950/60 text-red-900 dark:text-red-200 text-xs font-bold flex items-center gap-2';
                        alertEl.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4 text-red-500"></i><span>${data.detail || 'Failed to send OTP code'}</span>`;
                        alertEl.classList.remove('hidden');
                    }
                    showToast(data.detail || 'Failed to send OTP code');
                    return;
                }

                activeDeleteOtpId = data.otp_id;
                const otpContainer = document.getElementById('delOtpInputContainer');
                const hintEl = document.getElementById('delOtpTargetHint');
                const dispEl = document.getElementById('delOtpCodeDisplay');
                const codeInput = document.getElementById('delOtpCodeInput');

                if (alertEl) {
                    alertEl.className = 'p-3 rounded-2xl border border-emerald-500/40 bg-emerald-50/95 dark:bg-emerald-950/70 text-emerald-950 dark:text-emerald-200 text-xs font-bold flex items-start gap-2.5 shadow-sm';
                    alertEl.innerHTML = `
                        <div class="w-6 h-6 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                            <i data-lucide="check-circle-2" class="w-4 h-4"></i>
                        </div>
                        <div class="flex-1">
                            <div class="font-extrabold text-emerald-800 dark:text-emerald-300 text-xs">✓ Verification Code Sent!</div>
                            <div class="text-[11px] text-gray-700 dark:text-gray-300 mt-0.5">Dispatched to <strong>${data.masked_target || channel}</strong>.</div>
                            <div class="mt-1.5 flex items-center gap-2">
                                <span class="text-[10px] uppercase font-bold text-gray-500 tracking-wider">Your Code:</span>
                                <span class="font-mono text-sm font-black text-amber-900 dark:text-amber-200 bg-amber-100 dark:bg-amber-900/60 px-2.5 py-0.5 rounded border border-amber-300 dark:border-amber-700 tracking-widest">${data.otp_code}</span>
                            </div>
                        </div>
                    `;
                    alertEl.classList.remove('hidden');
                }

                if (otpContainer) otpContainer.classList.remove('hidden');
                if (hintEl) hintEl.textContent = `Sent to ${data.masked_target || channel}`;
                if (dispEl) dispEl.innerHTML = '';
                if (codeInput) {
                    codeInput.value = data.otp_code || '';
                    codeInput.focus();
                }

                showToast(`✓ Verification code: ${data.otp_code} (Sent to ${data.channel})`);
            } catch (err) {
                if (alertEl) {
                    alertEl.className = 'mb-3.5 p-3.5 rounded-2xl border border-red-500/40 bg-red-50 dark:bg-red-950/60 text-red-900 dark:text-red-200 text-xs font-bold flex items-center gap-2';
                    alertEl.innerHTML = `<i data-lucide="alert-circle" class="w-4 h-4 text-red-500"></i><span>Network error: ${err.message}</span>`;
                    alertEl.classList.remove('hidden');
                }
                showToast('Network error: ' + err.message);
            } finally {
                if (sendBtn) {
                    sendBtn.disabled = false;
                    sendBtn.innerHTML = '<i data-lucide="send" class="w-3.5 h-3.5"></i> Resend Verification Code';
                }
                if (typeof lucide !== 'undefined') lucide.createIcons();
            }
        }

        async function confirmDeleteAccount() {
            const codeInput = document.getElementById('delOtpCodeInput');
            const reasonSelect = document.getElementById('delReasonSelect');
            const confirmBtn = document.getElementById('confirmDeleteAccountBtn');
            const memberId = getActiveMemberId();

            if (!activeDeleteOtpId) {
                showToast('Please click "Send Verification OTP Code" first.', 'warning');
                return;
            }

            const code = codeInput ? codeInput.value.trim() : '';
            if (!code || code.length < 4) {
                showToast('Please enter the verification code sent to your registered Phone or Email.', 'warning');
                return;
            }

            if (confirmBtn) {
                confirmBtn.disabled = true;
                confirmBtn.innerHTML = '<span class="animate-spin mr-2">⏳</span> Verifying & Scheduling Deletion...';
            }

            try {
                const res = await fetch(`http://127.0.0.1:8000/api/members/${memberId}/delete/confirm`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        otp_id: activeDeleteOtpId,
                        otp_code: code,
                        reason: reasonSelect ? reasonSelect.value : 'Member self-service deletion'
                    })
                });
                const data = await res.json();
                if (!res.ok) {
                    showToast(data.detail || 'Failed to schedule deletion', 'error');
                    return;
                }

                closeDeleteAccountModal();
                alert('Your account deletion request has been submitted with a 30-day grace period.\n\nAll your details are safely kept in the 30-day retention recycle bin.\n\nIf you want your account back, simply log in within 30 days and click "Restore My Account"!');
                sessionStorage.removeItem('pbk_member');
                window.location.href = '../HomeLogRegisPass/HomeLogRegisPass.html#login';
            } catch (err) {
                showToast('Network error: ' + err.message, 'error');
            } finally {
                if (confirmBtn) {
                    confirmBtn.disabled = false;
                    confirmBtn.innerHTML = '<i data-lucide="trash-2" class="w-4 h-4"></i> Confirm Deletion (30 Days)';
                    if (typeof lucide !== 'undefined') lucide.createIcons();
                }
            }
        }