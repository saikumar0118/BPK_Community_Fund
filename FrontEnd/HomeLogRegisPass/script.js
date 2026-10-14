/* ==============================================================================
   PBK COMMUNITY CHANDA FUND — AUTHENTICATION & ONBOARDING CLIENT SCRIPT (script.js)
   ==============================================================================
   This module powers the unified authentication and onboarding gateway for:
     1. Page Routing: Hash-based SPA switching between Home, Login, Register, Change Password
     2. Theme Management: Dark / Light / System preference toggles & live listeners
     3. Security Verification: Arithmetic CAPTCHA generation and real-time validation
     4. Dual-Role Authentication: Member & Administrator login with 30-day retention checks
     5. Member Onboarding: Multi-step signup form with phone & email OTP verification
     6. Administrator Onboarding: Single-use invitation code validation & RBAC setup
     7. Password Recovery: Self-service credential resets via OTP verification
     8. 30-Day Retention Restoration: Account undo & self-reactivation modal flows
   ============================================================================== */

/* ============================================================================== */
/* SECTION 1: CORE SPA NAVIGATION, THEME MANAGER, CAPTCHA & UI UTILITIES         */
/* Controls page view switching, hashchange listeners, theme menu interactions,   */
/* mobile responsive drawer, and arithmetic anti-bot CAPTCHA generator.          */
/* ============================================================================== */

lucide.createIcons();

let currentRole = 'member';
let captchaAnswer = 14; // 8 + 6 = 14

function refreshCaptcha() {
    const num1 = Math.floor(Math.random() * 9) + 1;
    const num2 = Math.floor(Math.random() * 9) + 1;

    captchaAnswer = num1 + num2;

    const captchaDisplay = document.getElementById('captcha-display');

    if (captchaDisplay) {
        captchaDisplay.textContent = `${num1} + ${num2} = ?`;
    }

    const captchaInput = document.getElementById('captcha-input');

    if (captchaInput) {
        captchaInput.value = '';
    }
}

function switchPage(pageId) {
    document.querySelectorAll('.page-view').forEach(el => el.classList.add('hidden'));
    const target = document.getElementById('page-' + pageId);
    if (target) {
        target.classList.remove('hidden');
        if (pageId !== 'register' && pageId !== 'login' && pageId !== 'changepassword' && pageId !== 'home') {
            window.scrollTo({ top: 0, behavior: 'smooth' });
        }
        if (pageId === 'changepassword') {
            if (typeof switchPwdMode === 'function') switchPwdMode('otp');
            const loginUsername = document.getElementById('login-username')?.value?.trim();
            const resetIdInput = document.getElementById('reset-identifier');
            if (loginUsername && resetIdInput && !resetIdInput.value) {
                resetIdInput.value = loginUsername;
            }
        }
    }

    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('text-amber-400', 'border-amber-400');
        link.classList.add('text-gray-300', 'border-transparent');
    });

    const activeLink = document.getElementById('nav-link-' + pageId);
    if (activeLink) {
        activeLink.classList.remove('text-gray-300', 'border-transparent');
        activeLink.classList.add('text-amber-400', 'border-amber-400');
    }

    window.location.hash = pageId;
    if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
}

window.addEventListener('hashchange', () => {
    const hash = window.location.hash.replace('#', '');
    if (['home', 'login', 'register', 'changepassword'].includes(hash)) {
        switchPage(hash);
    }
});

const themeMenu = document.getElementById('themeMenu');

function toggleThemeMenu() {
    const willOpen = themeMenu.classList.contains('hidden');
    themeMenu.classList.toggle('hidden');
    themeMenu.classList.toggle('flex');
    const toggleButton = document.getElementById('themeToggleBtn');
    if (toggleButton) toggleButton.setAttribute('aria-expanded', String(willOpen));
}

document.addEventListener('click', (e) => {
    if (!e.target.closest('.relative')) {
        themeMenu.classList.add('hidden');
        themeMenu.classList.remove('flex');
    }
});

function getSystemTheme() {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function renderThemeIcon(iconName, iconClasses) {
    const icon = document.getElementById('themeIcon');
    if (icon) {
        icon.outerHTML = `<i data-lucide="${iconName}" id="themeIcon" class="${iconClasses}"></i>`;
    }
}

function applyTheme(theme) {
    const selectedTheme = theme === 'light' ? 'white' : theme;
    let activeTheme = selectedTheme;
    if (selectedTheme === 'system') {
        activeTheme = getSystemTheme();
    }

    const themeLabel = document.getElementById('themeLabel');

    if (activeTheme === 'dark') {
        document.documentElement.classList.add('dark');
        renderThemeIcon(
            selectedTheme === 'system' ? 'monitor' : 'moon',
            selectedTheme === 'system' ? 'w-4 h-4 text-gray-300' : 'w-4 h-4 text-indigo-400'
        );
    } else {
        document.documentElement.classList.remove('dark');
        renderThemeIcon(
            selectedTheme === 'system' ? 'monitor' : 'sun',
            selectedTheme === 'system' ? 'w-4 h-4 text-gray-300' : 'w-4 h-4 text-amber-500'
        );
    }

    if (themeLabel) {
        themeLabel.textContent =
            selectedTheme === 'system' ? 'System' :
                selectedTheme === 'dark' ? 'Dark' : 'Light';
    }

    lucide.createIcons();

    document.querySelectorAll('#themeMenu button').forEach(btn => {
        const buttonTheme = btn.getAttribute('data-theme') === 'light' ? 'white' : btn.getAttribute('data-theme');
        btn.setAttribute('aria-pressed', String(buttonTheme === selectedTheme));
    });
}

function setTheme(theme) {
    const selectedTheme = theme === 'light' ? 'white' : theme;
    localStorage.setItem('pbk_theme', selectedTheme);
    localStorage.setItem('pbk_admin_theme', selectedTheme === 'white' ? 'light' : selectedTheme);
    applyTheme(selectedTheme);
    themeMenu.classList.add('hidden');
    themeMenu.classList.remove('flex');
    const toggleButton = document.getElementById('themeToggleBtn');
    if (toggleButton) toggleButton.setAttribute('aria-expanded', 'false');
}

window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (localStorage.getItem('pbk_theme') === 'system' || !localStorage.getItem('pbk_theme')) {
        applyTheme('system');
    }
});

function toggleMobileMenu() {
    document.getElementById('mobileMenu').classList.toggle('hidden');
}

window.showToast = function (message, type = 'error') {
    const container = document.getElementById('toast-container');
    if (!container) return;
    const toast = document.createElement('div');
    toast.className = `p-4 rounded-xl shadow-xl text-sm font-semibold flex items-center gap-3 transition-all duration-300 opacity-0 translate-y-[-10px] ${type === 'error' ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`;
    toast.innerHTML = `<span>${type === 'error' ? '⚠' : '✔'}</span> <span>${message}</span>`;
    container.appendChild(toast);
    setTimeout(() => toast.classList.remove('opacity-0', 'translate-y-[-10px]'), 10);
    setTimeout(() => {
        toast.classList.add('opacity-0', 'translate-y-[-10px]');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function setRole(role) {
    currentRole = role;
    const btnMember = document.getElementById('btn-member');
    const btnAdmin = document.getElementById('btn-admin');
    const titleText = document.getElementById('form-title-text');
    const submitBtn = document.getElementById('login-submit-btn');

    if (role === 'admin') {
        btnAdmin.className = "flex-1 py-3.5 px-6 rounded-xl font-extrabold text-sm text-amber-400 bg-[#1f2937] shadow-md border border-[#374151] transition flex items-center justify-center gap-2 cursor-pointer";
        btnMember.className = "flex-1 py-3.5 px-6 rounded-xl font-extrabold text-sm text-gray-400 hover:text-white transition flex items-center justify-center gap-2 cursor-pointer";
        titleText.innerText = "Admin Portal";
        submitBtn.innerHTML = 'Access Dashboard <i data-lucide="arrow-right" class="w-5 h-5"></i>';
    } else {
        btnMember.className = "flex-1 py-3.5 px-6 rounded-xl font-extrabold text-sm text-amber-400 bg-[#1f2937] shadow-md border border-[#374151] transition flex items-center justify-center gap-2 cursor-pointer";
        btnAdmin.className = "flex-1 py-3.5 px-6 rounded-xl font-extrabold text-sm text-gray-400 hover:text-white transition flex items-center justify-center gap-2 cursor-pointer";
        titleText.innerText = "Member Login";
        submitBtn.innerHTML = 'Secure Login <i data-lucide="arrow-right" class="w-5 h-5"></i>';
    }
    lucide.createIcons();
    hideMessage('login-status-message');
}

function showMessage(elementId, msg, type) {
    const box = document.getElementById(elementId);
    if (!box) return;
    box.className = `p-4 rounded-xl mb-6 text-sm font-semibold flex items-center gap-3 ${type === 'error' ? 'bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300 border border-red-300' : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300 border border-emerald-300'}`;
    box.innerHTML = `<i data-lucide="${type === 'error' ? 'alert-circle' : 'check-circle'}" class="w-5 h-5 flex-shrink-0"></i><span>${msg}</span>`;
    box.classList.remove('hidden');
    lucide.createIcons();
}

function hideMessage(elementId) {
    const box = document.getElementById(elementId);
    if (box) box.classList.add('hidden');
}


/* ============================================================================== */
/* SECTION 2: LOGIN AUTHENTICATION & ROLE-BASED DASHBOARD REDIRECTION            */
/* Validates arithmetic CAPTCHA, posts credentials to FastAPI login endpoints,    */
/* intercepts 30-day pending deletion/disabled states, and persists sessions.     */
/* ============================================================================== */

async function handleLogin(event) {
    event.preventDefault();

    // Step 1: Validate CAPTCHA
    const captcha = parseInt(
        document.getElementById('captcha-input').value,
        10
    );

    if (captcha !== captchaAnswer) {
        showMessage(
            'login-status-message',
            'Incorrect security verification answer. Please try again.',
            'error'
        );
        return;
    }

    // Step 2: Get login details
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const btn = document.getElementById('login-submit-btn');

    // Step 3: Show loading status
    btn.disabled = true;
    btn.innerText = 'Authenticating...';

    const loginEndpoint = currentRole === 'admin'
        ? 'http://127.0.0.1:8000/api/admins/login'
        : 'http://127.0.0.1:8000/api/members/login';

    try {
        // Step 4: Send login request to FastAPI
        const response = await fetch(
            loginEndpoint,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            }
        );

        const result = await response.json();

        // Step 5: Handle failed login
        if (!response.ok) {
            showMessage(
                'login-status-message',
                result.detail || 'Login failed. Check your credentials.',
                'error'
            );
            return;
        }

        if (currentRole === 'admin') {
            sessionStorage.setItem(
                'pbk_admin',
                JSON.stringify(result)
            );

            showMessage(
                'login-status-message',
                'Admin login successful! Redirecting to admin dashboard...',
                'success'
            );

            setTimeout(() => {
                window.location.href = '../Admin/admin.html';
            }, 1000);
        } else {
            // Check if member account is scheduled for deletion (30-day grace period)
            if (result.status === 'pending_deletion') {
                showAccountRestoreModal(result);
                return;
            }

            // Check if member account is temporarily disabled
            if (result.status === 'disabled') {
                showAccountDisabledModal(result);
                return;
            }

            sessionStorage.setItem(
                'pbk_member',
                JSON.stringify(result)
            );

            showMessage(
                'login-status-message',
                'Login successful! Redirecting to member dashboard...',
                'success'
            );

            setTimeout(() => {
                window.location.href = '../Members/member.html';
            }, 1000);
        }

    } catch (error) {
        console.error('Login API error:', error);

        showMessage(
            'login-status-message',
            'Unable to connect to the backend server.',
            'error'
        );

    } finally {
        btn.disabled = false;
        btn.innerText = currentRole === 'admin' ? 'Access Dashboard' : 'Secure Login';
    }
}



/* ============================================================================== */
/* SECTION 3: REGISTRATION CONTROLLER & TAB SWITCHING (MEMBER VS ADMIN)           */
/* Manages Member vs Administrator registration tabs, form field unlocking,      */
/* gender selectors, and email format regex validation.                          */
/* ============================================================================== */

document.addEventListener("DOMContentLoaded", function () {
    const savedTheme = localStorage.getItem('pbk_theme') || 'system';
    applyTheme(savedTheme === 'light' ? 'white' : savedTheme);

    const memberButton = document.getElementById("btn-member-reg");
    const adminButton = document.getElementById("btn-admin-reg");
    const memberForm = document.getElementById("memberRegForm");
    const adminForm = document.getElementById("adminRegForm");

    if (memberButton && adminButton) {
        memberButton.addEventListener("click", function () {
            memberButton.className = "flex-1 py-3.5 px-6 rounded-xl font-extrabold text-sm text-amber-400 bg-[#1f2937] shadow-md border border-[#374151] transition flex items-center justify-center gap-2 cursor-pointer";
            adminButton.className = "flex-1 py-3.5 px-6 rounded-xl font-extrabold text-sm text-gray-400 hover:text-white transition flex items-center justify-center gap-2 cursor-pointer";
            memberForm.classList.remove("hidden");
            adminForm.classList.add("hidden");
            document.getElementById("tab-helper-text").textContent = "Please fill in your valid details to complete member registration. All fields are fully accessible.";
            lucide.createIcons();
        });

        adminButton.addEventListener("click", function () {
            adminButton.className = "flex-1 py-3.5 px-6 rounded-xl font-extrabold text-sm text-amber-400 bg-[#1f2937] shadow-md border border-[#374151] transition flex items-center justify-center gap-2 cursor-pointer";
            memberButton.className = "flex-1 py-3.5 px-6 rounded-xl font-extrabold text-sm text-gray-400 hover:text-white transition flex items-center justify-center gap-2 cursor-pointer";
            adminForm.classList.remove("hidden");
            memberForm.classList.add("hidden");
            document.getElementById("tab-helper-text").textContent = "Please enter your valid Admin Invitation Code, followed by phone and email OTP verification to unlock the administrator registration form.";
            lucide.createIcons();
        });
    }

    window.selectGender = function (formType, val) {
        const groupContainer = document.getElementById(formType === 'member' ? 'memberGenderGroup' : 'adminGenderGroup');
        const hiddenInput = document.getElementById(formType === 'member' ? 'memberGenderVal' : 'adminGenderVal');
        if (!groupContainer || !hiddenInput) return;

        groupContainer.querySelectorAll('button').forEach(btn => {
            btn.className = "flex-1 py-3.5 border-2 border-[#374151] rounded-xl font-bold text-gray-300 hover:border-[#eea220] transition cursor-pointer";
            if (btn.innerText === val) {
                btn.className = "flex-1 py-3.5 border-2 border-[#eea220] bg-[#1f2937] text-amber-400 rounded-xl font-bold transition shadow-sm cursor-pointer";
            }
        });
        hiddenInput.value = val;
    }

    window.validateEmailInput = function (prefix) {
        const input = document.getElementById(`${prefix}Email`);
        const errorDiv = document.getElementById(`${prefix}EmailError`);
        if (!input || !errorDiv) return true;
        const val = input.value.trim();
        if (prefix === 'member' && val === '') {
            errorDiv.classList.add('hidden');
            return true;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (val && !emailRegex.test(val)) {
            errorDiv.classList.remove('hidden');
            return false;
        } else {
            errorDiv.classList.add('hidden');
            return true;
        }
    }

/* ============================================================================== */
/* SECTION 4: SECURITY OTP DISPATCH, INPUT AUTOMATION & VERIFICATION              */
/* Manages Phone & Email verification, 4-digit input box auto-focus, countdown   */
/* resend timers, status lock boxes, and invitation code authorization.           */
/* ============================================================================== */

    window.unlockOtpGroup = function (groupId, btnId, msgId) {
        const group = document.getElementById(groupId);
        if (group) {
            const boxes = group.querySelectorAll('input');
            boxes.forEach(box => {
                box.disabled = false;
                box.value = '';
            });
            if (boxes[0]) boxes[0].focus();
        }
        const verifyBtn = document.getElementById(btnId);
        if (verifyBtn) verifyBtn.disabled = false;
        const msgElem = document.getElementById(msgId);
        if (msgElem) {
            msgElem.textContent = "Enter 4-digit code sent";
            msgElem.className = "text-xs text-gray-400 font-semibold mt-1";
        }
    }

    const otpTracking = {};

    window.sendOTP = async function (fieldId) {
        const input = document.getElementById(fieldId);
        if (fieldId.includes('Phone')) {
            const cleanDigits = input.value.replace(/\D/g, '').slice(-10);
            if (cleanDigits.length !== 10) {
                showToast("Please enter a valid 10-digit mobile number.", "error");
                return;
            }
        }
        if (fieldId.includes('Email') && !validateEmailInput(fieldId === 'memberEmail' ? 'member' : 'admin')) {
            showToast("Please enter a valid email address.", "error");
            return;
        }

        const btn = document.getElementById('btn-' + fieldId);
        const timerDiv = document.getElementById('timer-' + fieldId);
        if (btn) { btn.disabled = true; btn.style.opacity = '0.5'; }

        const userType = fieldId.startsWith('member') ? 'Member' : 'Admin';
        const otpType = fieldId.includes('Phone') ? 'Phone' : 'Email';
        const cleanVal = otpType === 'Phone' ? input.value.replace(/\D/g, '').slice(-10) : input.value.trim();

        try {
            const payload = {
                user_type: userType,
                otp_type: otpType,
                phone: otpType === 'Phone' ? cleanVal : null,
                email: otpType === 'Email' ? cleanVal : null
            };

            const response = await fetch('http://127.0.0.1:8000/api/registration-otp/send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || 'Failed to send OTP.');
            }

            // Save OTP ID for verification
            otpTracking[fieldId] = data.otp_id;

            // Reveal OTP container for this field
            const otpSec = document.getElementById(`section-${fieldId}OTP`);
            if (otpSec) otpSec.classList.remove('hidden');

            if (fieldId === 'memberPhone') unlockOtpGroup('group-memberPhoneOTP', 'btn-verify-memberPhone', 'msg-memberPhoneOTP');
            else if (fieldId === 'memberEmail') unlockOtpGroup('group-memberEmailOTP', 'btn-verify-memberEmail', 'msg-memberEmailOTP');
            else if (fieldId === 'adminPhone') unlockOtpGroup('group-adminPhoneOTP', 'btn-verify-adminPhone', 'msg-adminPhoneOTP');
            else if (fieldId === 'adminEmail') unlockOtpGroup('group-adminEmailOTP', 'btn-verify-adminEmail', 'msg-adminEmailOTP');

            let timeLeft = 30;
            if (timerDiv) timerDiv.textContent = `Resend OTP in ${timeLeft}s`;
            const countdown = setInterval(() => {
                timeLeft--;
                if (timeLeft > 0) {
                    if (timerDiv) timerDiv.textContent = `Resend OTP in ${timeLeft}s`;
                } else {
                    clearInterval(countdown);
                    if (timerDiv) timerDiv.textContent = "";
                    if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
                }
            }, 1000);

            showToast(`OTP sent successfully! (Dev Code: ${data.otp})`, "success");

        } catch (error) {
            console.error('Send OTP error:', error);
            showToast(error.message || 'Unable to send OTP.', 'error');
            if (btn) { btn.disabled = false; btn.style.opacity = '1'; }
        }
    }

    window.handleOtpInput = function (e, className, index) {
        const boxes = document.querySelectorAll('.' + className);
        const val = e.target.value;
        if (val && /^[0-9]$/.test(val)) {
            if (index < boxes.length - 1) boxes[index + 1].focus();
        } else {
            e.target.value = '';
        }
    }

    window.handleOtpBackspace = function (e, className, index) {
        if (e.key === 'Backspace') {
            const boxes = document.querySelectorAll('.' + className);
            if (!e.target.value && index > 0) boxes[index - 1].focus();
            else e.target.value = '';
        }
    }

    function getOtpValue(className) {
        let code = '';
        document.querySelectorAll('.' + className).forEach(b => code += b.value);
        return code;
    }

    function setStatusBox(boxId, success) {
        const box = document.getElementById(boxId);
        if (!box) return;
        box.textContent = success ? '✔' : '✖';
        box.className = `w-12 h-12 rounded-xl border-2 flex items-center justify-center font-bold flex-shrink-0 ${success ? 'bg-emerald-950/60 text-emerald-400 border-emerald-500' : 'bg-red-950/60 text-red-400 border-red-500'}`;
    }

    window.verifyMemberOTP = async function (type) {
        const isPhone = type === 'phone';
        const fieldId = isPhone ? 'memberPhone' : 'memberEmail';
        const otpClass = isPhone ? 'm-otp' : 'm-email-otp';
        const statusBoxId = isPhone ? 'member-phone-status-box' : 'member-email-status-box';
        const msgId = isPhone ? 'msg-memberPhoneOTP' : 'msg-memberEmailOTP';
        const btnId = isPhone ? 'btn-verify-memberPhone' : 'btn-verify-memberEmail';

        const code = getOtpValue(otpClass);
        if (code.length !== 4) {
            showToast("Please enter a valid 4-digit OTP.", "error");
            return;
        }

        const otpId = otpTracking[fieldId];
        if (!otpId) {
            showToast("Please click Send OTP first.", "error");
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:8000/api/registration-otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp_id: otpId, otp_code: code })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || 'Invalid OTP');
            }

            setStatusBox(statusBoxId, true);
            document.getElementById(msgId).textContent = (isPhone ? 'Phone' : 'Email') + ' verified successfully!';
            document.getElementById(msgId).className = 'text-xs text-emerald-400 font-semibold mt-1';
            lockBoxes(otpClass, btnId);
            showToast((isPhone ? 'Phone' : 'Email') + ' verified successfully!', "success");

        } catch (error) {
            setStatusBox(statusBoxId, false);
            showToast(error.message || 'OTP verification failed.', 'error');
        }
    }

    window.verifyInviteCode = async function () {
        const btn = document.getElementById('btn-adminInviteCode');
        const input = document.getElementById('adminInviteCode');
        const timer = document.getElementById('timer-adminInviteCode');
        const fieldset = document.getElementById('admin-fieldset');
        const box = document.getElementById('invite-status-box');

        // If currently in verified state and user clicks "Change", unlock and reset
        if (btn && btn.textContent.trim().toLowerCase() === 'change') {
            if (input) {
                input.disabled = false;
                input.value = '';
                input.focus();
            }
            btn.textContent = 'Verify';
            btn.disabled = false;
            if (fieldset) fieldset.disabled = true;
            if (box) {
                box.textContent = '🔒';
                box.className = 'w-12 h-12 rounded-xl border-2 border-[#374151] flex items-center justify-center font-bold text-gray-400 bg-[#111827] flex-shrink-0';
            }
            if (timer) {
                timer.textContent = 'Enter valid admin code';
                timer.className = 'text-xs text-gray-400 font-semibold mt-1.5';
            }
            return;
        }

        const val = input ? input.value.trim() : '';

        if (!val) {
            showToast("Please enter an invitation code.", "error");
            return;
        }

        try {
            const response = await fetch(
                "http://127.0.0.1:8000/api/admin-invitations/verify?invitation_code=" + encodeURIComponent(val),
                {
                    method: "POST"
                }
            );

            const data = await response.json();

            if (!response.ok) {
                throw new Error(
                    data.detail || "Invalid invitation code."
                );
            }

            const assignedRole = data.role || "Admin";
            setStatusBox('invite-status-box', true);

            if (timer) {
                timer.innerHTML = `✓ Valid invitation code! Assigned Role: <strong class="text-amber-300 font-bold">${assignedRole}</strong>`;
                timer.className = 'text-xs text-emerald-400 font-semibold mt-1.5';
            }

            if (input) input.disabled = true;
            if (btn) {
                btn.textContent = 'Change';
                btn.disabled = false;
            }

            if (fieldset) fieldset.disabled = false;

            showToast(
                `Invitation Code Verified! Role: ${assignedRole}`,
                "success"
            );

        } catch (error) {
            setStatusBox('invite-status-box', false);

            if (timer) {
                timer.textContent = error.message || 'Invalid code!';
                timer.className = 'text-xs text-red-400 font-semibold mt-1.5';
            }

            if (input) input.disabled = false;
            if (btn) {
                btn.textContent = 'Verify';
                btn.disabled = false;
            }
            if (fieldset) fieldset.disabled = true;

            showToast(
                error.message || "Invalid Invitation Code.",
                "error"
            );
        }
    };


    window.verifyAdminOTP = async function (type) {
        const isPhone = type === 'phone';
        const fieldId = isPhone ? 'adminPhone' : 'adminEmail';
        const otpClass = isPhone ? 'a-otp' : 'a-email-otp';
        const statusBoxId = isPhone ? 'phone-status-box' : 'email-status-box';
        const msgId = isPhone ? 'msg-adminPhoneOTP' : 'msg-adminEmailOTP';
        const btnId = isPhone ? 'btn-verify-adminPhone' : 'btn-verify-adminEmail';

        const code = getOtpValue(otpClass);
        if (code.length !== 4) {
            showToast("Please enter a valid 4-digit OTP.", "error");
            return;
        }

        const otpId = otpTracking[fieldId];
        if (!otpId) {
            showToast("Please click Send OTP first.", "error");
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:8000/api/registration-otp/verify', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ otp_id: otpId, otp_code: code })
            });

            const data = await response.json();
            if (!response.ok) {
                throw new Error(data.detail || 'Invalid OTP');
            }

            setStatusBox(statusBoxId, true);
            document.getElementById(msgId).textContent = (isPhone ? 'Phone' : 'Email') + ' verified successfully!';
            document.getElementById(msgId).className = 'text-xs text-emerald-400 font-semibold mt-1';
            lockBoxes(otpClass, btnId);
            showToast((isPhone ? 'Phone' : 'Email') + ' verified successfully!', "success");

        } catch (error) {
            setStatusBox(statusBoxId, false);
            showToast(error.message || 'OTP verification failed.', 'error');
        }
    }

    function lockBoxes(className, btnId) {
        document.querySelectorAll('.' + className).forEach(b => b.disabled = true);
        const btn = document.getElementById(btnId);
        if (btn) btn.disabled = true;
    }

    window.togglePassword = function (inputId, btn) {
        const input = document.getElementById(inputId);
        if (!input) return;
        const eyeOn = btn.querySelector('.eye-on');
        const eyeOff = btn.querySelector('.eye-off');
        if (input.type === 'password') {
            input.type = 'text';
            eyeOn.classList.add('hidden');
            eyeOff.classList.remove('hidden');
        } else {
            input.type = 'password';
            eyeOn.classList.remove('hidden');
            eyeOff.classList.add('hidden');
        }
    }

    window.validatePasswords = function (prefix) {
        const p1 = document.getElementById(`${prefix}Password`).value;
        const p2 = document.getElementById(`${prefix}ConfirmPassword`).value;
        const err = document.getElementById(`${prefix}PasswordError`);
        if (p2 && p1 !== p2) {
            err.classList.remove('hidden');
            return false;
        } else {
            err.classList.add('hidden');
            return true;
        }
    }

/* ============================================================================== */
/* SECTION 5: MEMBER REGISTRATION SUBMISSION & ONBOARDING HANDLER                */
/* Validates phone/email OTP verification statuses, password complexity, collects */
/* personal details, creates active member record, and redirects to login.       */
/* ============================================================================== */

    const memberRegForm = document.getElementById('memberRegForm');

    if (memberRegForm) {
        memberRegForm.addEventListener('submit', async function (e) {
            e.preventDefault();

            const genderVal =
                document.getElementById('memberGenderVal').value;

            if (!genderVal) {
                showToast("Please select your gender.", "error");
                return;
            }

            const password =
                document.getElementById('memberPassword').value;

            const confirmPassword =
                document.getElementById('memberConfirmPassword').value;

            if (password !== confirmPassword) {
                showToast("Passwords do not match.", "error");
                return;
            }

            const memberData = {
                first_name:
                    document.getElementById('memberFirstName').value.trim(),

                last_name:
                    document.getElementById('memberLastName').value.trim(),

                gender: genderVal,

                phone:
                    document.getElementById('memberPhone').value.replace(/\D/g, '').slice(-10),

                email:
                    document.getElementById('memberEmail').value.trim() || null,

                state:
                    document.getElementById('memberState').value.trim(),

                district:
                    document.getElementById('memberDistrict').value.trim(),

                city:
                    document.getElementById('memberCity').value.trim(),

                village:
                    document.getElementById('memberVillage').value.trim(),

                address:
                    document.getElementById('memberAddress').value.trim(),

                password: password
            };

            console.log(
                "Sending Member Registration Data:",
                memberData
            );

            try {
                const response = await fetch(
                    "http://127.0.0.1:8000/api/members/register",
                    {
                        method: "POST",

                        headers: {
                            "Content-Type": "application/json"
                        },

                        body: JSON.stringify(memberData)
                    }
                );

                const result = await response.json();

                console.log(
                    "Backend Registration Response:",
                    result
                );

                if (!response.ok) {
                    showToast(
                        result.detail || "Registration failed.",
                        "error"
                    );
                    return;
                }

                showToast(
                    `Member Registration Successful! Member ID: ${result.member_id}`,
                    "success"
                );

                console.log(
                    "New Member ID:",
                    result.member_id
                );

                memberRegForm.reset();
                ['memberPhone', 'memberEmail'].forEach(f => {
                    const s = document.getElementById(`section-${f}OTP`);
                    if (s) s.classList.add('hidden');
                });
                const mPhoneBox = document.getElementById('member-phone-status-box');
                if (mPhoneBox) { mPhoneBox.textContent = '🔒'; mPhoneBox.className = 'w-12 h-12 rounded-xl border-2 border-[#374151] flex items-center justify-center font-bold text-gray-400 bg-[#111827] flex-shrink-0'; }
                const mEmailBox = document.getElementById('member-email-status-box');
                if (mEmailBox) { mEmailBox.textContent = '🔒'; mEmailBox.className = 'w-12 h-12 rounded-xl border-2 border-[#374151] flex items-center justify-center font-bold text-gray-400 bg-[#111827] flex-shrink-0'; }
                setTimeout(() => {
                    switchPage('login');
                    setRole('member');
                    const loginUserInput = document.getElementById('login-username');
                    if (loginUserInput) loginUserInput.value = memberData.phone;
                }, 1200);

            } catch (error) {

                console.error(
                    "Registration API Error:",
                    error
                );

                showToast(
                    "Unable to connect to the backend server.",
                    "error"
                );
            }
        });
    }

/* ============================================================================== */
/* SECTION 6: ADMINISTRATOR REGISTRATION SUBMISSION & RBAC INITIALIZATION        */
/* Verifies invitation code authorization, phone/email OTP verification,         */
/* creates administrator account with assigned role, and redirects to admin login.*/
/* ============================================================================== */

    const adminRegForm = document.getElementById('adminRegForm');
    if (adminRegForm) {
        adminRegForm.addEventListener('submit', async function (e) {
            e.preventDefault();
            const genderVal = document.getElementById('adminGenderVal').value;
            if (!genderVal) {
                showToast("Please select your gender.", "error");
                return;
            }

            const inviteCode = document.getElementById('adminInviteCode').value.trim();
            if (!inviteCode) {
                showToast("Please enter and verify your invitation code first.", "error");
                return;
            }

            const password = document.getElementById('adminPassword').value;
            const confirmPassword = document.getElementById('adminConfirmPassword').value;
            if (password !== confirmPassword) {
                showToast("Passwords do not match.", "error");
                return;
            }

            const adminData = {
                invitation_code: inviteCode,
                first_name: document.getElementById('adminFirstName').value.trim(),
                last_name: document.getElementById('adminLastName').value.trim() || null,
                gender: genderVal,
                phone: document.getElementById('adminPhone').value.replace(/\D/g, '').slice(-10),
                email: document.getElementById('adminEmail').value.trim(),
                phone_otp: getOtpValue('a-otp') || null,
                email_otp: getOtpValue('a-email-otp') || null,
                state: document.getElementById('adminState').value.trim() || null,
                district: document.getElementById('adminDistrict').value.trim() || null,
                city: document.getElementById('adminCity').value.trim() || null,
                village: document.getElementById('adminVillage').value.trim() || null,
                address: document.getElementById('adminAddress').value.trim() || null,
                password: password
            };

            try {
                const response = await fetch("http://127.0.0.1:8000/api/admins/register", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(adminData)
                });

                const result = await response.json();

                if (!response.ok) {
                    showToast(result.detail || "Admin registration failed.", "error");
                    if (result.detail && (result.detail.toLowerCase().includes("invitation code") || result.detail.toLowerCase().includes("code"))) {
                        setStatusBox('invite-status-box', false);
                        const inviteInput = document.getElementById('adminInviteCode');
                        if (inviteInput) {
                            inviteInput.disabled = false;
                        }
                        const inviteBtn = document.getElementById('btn-adminInviteCode');
                        if (inviteBtn) {
                            inviteBtn.textContent = 'Verify';
                            inviteBtn.disabled = false;
                        }
                        const adminFieldset = document.getElementById('admin-fieldset');
                        if (adminFieldset) adminFieldset.disabled = true;
                        const inviteTimer = document.getElementById('timer-adminInviteCode');
                        if (inviteTimer) {
                            inviteTimer.textContent = result.detail;
                            inviteTimer.className = 'text-xs text-red-400 font-semibold mt-1.5';
                        }
                    }
                    return;
                }

                showToast("Admin Registration Successful!", "success");
                adminRegForm.reset();
                ['adminPhone', 'adminEmail'].forEach(f => {
                    const s = document.getElementById(`section-${f}OTP`);
                    if (s) s.classList.add('hidden');
                });
                const aPhoneBox = document.getElementById('phone-status-box');
                if (aPhoneBox) { aPhoneBox.textContent = '🔒'; aPhoneBox.className = 'w-12 h-12 rounded-xl border-2 border-[#374151] flex items-center justify-center font-bold text-gray-400 bg-[#111827] flex-shrink-0'; }
                const aEmailBox = document.getElementById('email-status-box');
                if (aEmailBox) { aEmailBox.textContent = '🔒'; aEmailBox.className = 'w-12 h-12 rounded-xl border-2 border-[#374151] flex items-center justify-center font-bold text-gray-400 bg-[#111827] flex-shrink-0'; }

                // Reset Admin Invitation Code Box and lock fieldset
                const inviteInput = document.getElementById('adminInviteCode');
                if (inviteInput) {
                    inviteInput.disabled = false;
                    inviteInput.value = '';
                }
                const inviteBtn = document.getElementById('btn-adminInviteCode');
                if (inviteBtn) {
                    inviteBtn.textContent = 'Verify';
                    inviteBtn.disabled = false;
                }
                const adminFieldset = document.getElementById('admin-fieldset');
                if (adminFieldset) adminFieldset.disabled = true;
                const inviteStatus = document.getElementById('invite-status-box');
                if (inviteStatus) {
                    inviteStatus.textContent = '🔒';
                    inviteStatus.className = 'w-12 h-12 rounded-xl border-2 border-[#374151] flex items-center justify-center font-bold text-gray-400 bg-[#111827] flex-shrink-0';
                }
                const inviteTimer = document.getElementById('timer-adminInviteCode');
                if (inviteTimer) {
                    inviteTimer.textContent = 'Enter valid admin code';
                    inviteTimer.className = 'text-xs text-gray-400 font-semibold mt-1.5';
                }

                setTimeout(() => {
                    switchPage('login');
                    setRole('admin');
                    const loginUserInput = document.getElementById('login-username');
                    if (loginUserInput) loginUserInput.value = adminData.email;
                }, 1200);

            } catch (error) {
                console.error("Admin registration error:", error);
                showToast("Unable to connect to the backend server.", "error");
            }
        });
    }

/* ============================================================================== */
/* SECTION 7: PASSWORD MANAGEMENT & RECOVERY CONTROLLER (CHANGE PASSWORD)        */
/* Supports identity verification via phone/email, OTP confirmation flow,        */
/* current password validation, and secure password updates via FastAPI auth.    */
/* ============================================================================== */

    let resetPasswordOtpId = null;
    let resetPasswordOtpVerified = false;

    window.switchPwdMode = function (mode) {
        const tabOtp = document.getElementById('tab-pwd-otp');
        const tabOld = document.getElementById('tab-pwd-old');
        const formOtp = document.getElementById('form-pwd-otp');
        const formOld = document.getElementById('form-pwd-old');
        const statusMsg = document.getElementById('pwd-status-message');
        if (statusMsg) statusMsg.classList.add('hidden');

        if (mode === 'otp') {
            if (formOtp) formOtp.classList.remove('hidden');
            if (formOld) formOld.classList.add('hidden');
            if (tabOtp) {
                tabOtp.className = "py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 bg-[#eea220] text-gray-950 shadow-md";
            }
            if (tabOld) {
                tabOld.className = "py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:bg-white/5";
            }
        } else {
            if (formOtp) formOtp.classList.add('hidden');
            if (formOld) formOld.classList.remove('hidden');
            if (tabOld) {
                tabOld.className = "py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 bg-[#eea220] text-gray-950 shadow-md";
            }
            if (tabOtp) {
                tabOtp.className = "py-3 px-4 rounded-xl text-xs sm:text-sm font-extrabold transition flex items-center justify-center gap-2 text-gray-400 hover:text-white hover:bg-white/5";
            }
        }
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    };

    window.onResetChannelChange = function (channel) {
        const icon = document.getElementById('reset-channel-icon');
        const input = document.getElementById('reset-identifier');
        if (channel === 'Email') {
            if (icon) icon.setAttribute('data-lucide', 'mail');
            if (input) input.placeholder = 'Enter registered email address';
        } else {
            if (icon) icon.setAttribute('data-lucide', 'phone');
            if (input) input.placeholder = 'Enter Member ID, Mobile, Email, or Name';
        }
        if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
    };

    window.sendResetPasswordOTP = async function () {
        const input = document.getElementById('reset-identifier');
        const val = (input?.value || '').trim();
        if (!val) {
            showToast("Please enter your Member ID, Mobile number, Email, or Name.", "error");
            return false;
        }

        const isEmail = val.includes('@') || document.querySelector('input[name="reset-channel"]:checked')?.value === 'Email';
        const otpType = isEmail ? 'Email' : 'Phone';

        const sendBtn = document.getElementById('btn-reset-send-otp');
        const sendText = document.getElementById('btn-reset-send-text');
        if (sendBtn) { sendBtn.disabled = true; sendBtn.style.opacity = '0.5'; }
        if (sendText) sendText.innerText = 'Sending...';

        try {
            const res = await fetch("http://127.0.0.1:8000/api/auth/reset-password/send-otp", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    identifier: val,
                    otp_type: otpType
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Failed to send OTP.");
            }

            resetPasswordOtpId = data.otp_id;
            resetPasswordOtpVerified = true;

            const secOtp = document.getElementById('section-reset-otp');
            if (secOtp) secOtp.classList.remove('hidden');

            const badge = document.getElementById('otp-verified-badge');
            if (badge) badge.classList.remove('hidden');

            // Auto-populate 4 OTP input boxes with received code
            const otpCodeStr = String(data.otp_code || '');
            const otpInputs = document.querySelectorAll('.r-otp');
            otpInputs.forEach((b, idx) => {
                b.value = otpCodeStr[idx] || '';
                b.disabled = false;
            });

            showMessage('pwd-status-message', `Verification OTP code: ${data.otp_code} (Sent to ${data.target})`, 'success');
            showToast(`OTP Code: ${data.otp_code} (Auto-filled)`, 'success');

            const msgEl = document.getElementById('msg-reset-otp');
            if (msgEl) msgEl.innerText = `OTP code sent to ${data.target}. Valid for 10 minutes.`;

            let timeLeft = 60;
            const interval = setInterval(() => {
                timeLeft--;
                if (sendText) sendText.innerText = `Resend (${timeLeft}s)`;
                if (timeLeft <= 0) {
                    clearInterval(interval);
                    if (sendBtn) { sendBtn.disabled = false; sendBtn.style.opacity = '1'; }
                    if (sendText) sendText.innerText = 'Resend OTP';
                }
            }, 1000);

            if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
            return true;

        } catch (err) {
            console.error("Send OTP error:", err);
            showMessage('pwd-status-message', err.message || 'Unable to send OTP.', 'error');
            showToast(err.message || 'Unable to send OTP.', 'error');
            if (sendBtn) { sendBtn.disabled = false; sendBtn.style.opacity = '1'; }
            if (sendText) sendText.innerText = 'Send OTP';
            return false;
        }
    };

    window.verifyResetOtpOnly = async function () {
        const code = getOtpValue('r-otp');
        if (code.length !== 4) {
            showToast("Please enter all 4 digits of the OTP code.", "error");
            return;
        }
        if (!resetPasswordOtpId) {
            showToast("Please click Send OTP first.", "error");
            return;
        }
        try {
            const res = await fetch("http://127.0.0.1:8000/api/registration-otp/verify", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    otp_id: resetPasswordOtpId,
                    otp_code: code
                })
            });
            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Invalid OTP code.");
            }
            resetPasswordOtpVerified = true;
            const badge = document.getElementById('otp-verified-badge');
            if (badge) badge.classList.remove('hidden');
            showToast("OTP verified successfully!", "success");
            if (typeof lucide !== 'undefined' && lucide.createIcons) lucide.createIcons();
        } catch (err) {
            showToast(err.message, "error");
        }
    };

    window.handleResetPasswordWithOtp = async function (event) {
        event.preventDefault();
        const identifier = (document.getElementById('reset-identifier')?.value || '').trim();
        const p1 = document.getElementById('reset-new-password')?.value || '';
        const p2 = document.getElementById('reset-confirm-password')?.value || '';

        if (!identifier) {
            showToast("Please enter your Member ID, Mobile number, Email, or Name.", "error");
            return;
        }
        if (p1.length < 6) {
            showToast("New password must be at least 6 characters long.", "warning");
            return;
        }
        if (p1 !== p2) {
            showToast("New password and confirm password do not match.", "error");
            return;
        }

        const submitBtn = document.getElementById('btn-submit-reset-otp');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.style.opacity = '0.5'; }

        try {
            // If OTP hasn't been requested yet, automatically request it first
            if (!resetPasswordOtpId) {
                showToast("Requesting verification OTP...", "info");
                const sent = await window.sendResetPasswordOTP();
                if (!sent || !resetPasswordOtpId) {
                    return;
                }
            }

            let code = getOtpValue('r-otp');
            if (code.length !== 4) {
                showToast("Please enter all 4 digits of the OTP code.", "error");
                return;
            }

            const res = await fetch("http://127.0.0.1:8000/api/auth/reset-password/verify-and-change", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    identifier: identifier,
                    otp_id: resetPasswordOtpId,
                    otp_code: code,
                    new_password: p1
                })
            });

            const data = await res.json();
            if (!res.ok) {
                throw new Error(data.detail || "Failed to reset password.");
            }

            showMessage('pwd-status-message', "Password reset successfully! Redirecting to login...", 'success');
            showToast("Password reset successfully! Redirecting to login...", "success");

            setTimeout(() => {
                switchPage('login');
                const loginUserInput = document.getElementById('login-username');
                if (loginUserInput) loginUserInput.value = identifier;
                const loginPwdInput = document.getElementById('login-password');
                if (loginPwdInput) { loginPwdInput.value = ''; loginPwdInput.focus(); }
            }, 1200);

        } catch (err) {
            console.error("Reset password error:", err);
            showMessage('pwd-status-message', err.message || "Failed to reset password.", 'error');
            showToast(err.message || "Failed to reset password.", 'error');
        } finally {
            if (submitBtn) { submitBtn.disabled = false; submitBtn.style.opacity = '1'; }
        }
    };

    window.handleChangePassword = async function (event) {
        event.preventDefault();
        const username = document.getElementById('pwd-username').value.trim();
        const currentPassword = document.getElementById('pwd-current').value;
        const n1 = document.getElementById('pwd-new').value;
        const n2 = document.getElementById('pwd-confirm').value;

        if (n1 !== n2) {
            showToast("New passwords do not match.", "error");
            return;
        }

        try {
            const response = await fetch("http://127.0.0.1:8000/api/auth/change-password", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    username: username,
                    current_password: currentPassword,
                    new_password: n1,
                    user_type: currentRole === 'admin' ? 'Admin' : 'Member'
                })
            });

            const result = await response.json();

            if (!response.ok) {
                showMessage('pwd-status-message', result.detail || "Failed to update password.", 'error');
                showToast(result.detail || "Failed to update password.", "error");
                return;
            }

            showMessage('pwd-status-message', "Password updated successfully! Redirecting to login...", 'success');
            showToast("Password updated successfully!", "success");
            setTimeout(() => {
                switchPage('login');
                const loginUserInput = document.getElementById('login-username');
                if (loginUserInput) loginUserInput.value = username;
            }, 1200);

        } catch (error) {
            console.error("Change password error:", error);
            showToast("Unable to connect to the backend server.", "error");
        }
    };

    const initialHash = window.location.hash.replace('#', '');
    if (['home', 'login', 'register', 'changepassword'].includes(initialHash)) {
        switchPage(initialHash);
    } else {
        switchPage('home');
    }
});

/* ============================================================================== */
/* SECTION 8: 30-DAY RETENTION ACCOUNT RESTORATION & SELF-REACTIVATION CONTROLLER */
/* Renders the countdown recovery modal when a scheduled-for-deletion member logs  */
/* in; sends self-restore API requests to reinstate the account into active MySQL. */
/* ============================================================================== */

let pendingRestoreMember = null;

function showAccountRestoreModal(data) {
    pendingRestoreMember = data;
    const modal = document.getElementById('accountRestoreModal');
    if (!modal) {
        const wantRestore = confirm(`Your account PBK-M${String(data.member_id).padStart(3, '0')} is scheduled for permanent deletion in ${data.days_remaining} day(s).\n\nDo you want to cancel deletion and restore your account now?`);
        if (wantRestore) {
            restoreAccountConfirmed(data.member_id);
        }
        return;
    }

    const titleEl = document.getElementById('restoreModalTitle');
    const nameEl = document.getElementById('restoreModalName');
    const badgeEl = document.getElementById('restoreModalDaysBadge');
    const descEl = document.getElementById('restoreModalDesc');
    const restoreBtn = document.getElementById('restoreModalActionBtn');

    if (titleEl) titleEl.textContent = 'Account Scheduled for Deletion';
    if (nameEl) nameEl.textContent = `${data.first_name || 'Member'} ${data.last_name || ''} (PBK-M${String(data.member_id).padStart(3, '0')})`;
    if (badgeEl) badgeEl.textContent = `⏳ ${data.days_remaining} Days Remaining (Grace Period)`;
    if (descEl) {
        descEl.innerHTML = `Your account is currently within its 30-day scheduled deletion grace period (Scheduled Purge: <strong class="text-amber-400">${data.scheduled_deletion_at || 'in 30 days'}</strong>).<br><br>All your profile details and past contribution records are safely preserved in the backend retention bin.<br><br>Click <strong>"Restore My Account"</strong> to cancel the deletion request and write your account back into active records immediately.`;
    }
    if (restoreBtn) {
        restoreBtn.innerHTML = '<i data-lucide="rotate-ccw" class="w-4 h-4"></i> Restore My Account (Write Back)';
        restoreBtn.onclick = () => restoreAccountConfirmed(data.member_id);
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function showAccountDisabledModal(data) {
    pendingRestoreMember = data;
    const modal = document.getElementById('accountRestoreModal');
    if (!modal) {
        const wantReactivate = confirm(`Your account is currently disabled.\n\nDo you want to reactivate your account now?`);
        if (wantReactivate) {
            reactivateAccountConfirmed(data.member_id);
        }
        return;
    }

    const titleEl = document.getElementById('restoreModalTitle');
    const nameEl = document.getElementById('restoreModalName');
    const badgeEl = document.getElementById('restoreModalDaysBadge');
    const descEl = document.getElementById('restoreModalDesc');
    const restoreBtn = document.getElementById('restoreModalActionBtn');

    if (titleEl) titleEl.textContent = 'Account Temporarily Disabled';
    if (nameEl) nameEl.textContent = `${data.first_name || 'Member'} ${data.last_name || ''} (PBK-M${String(data.member_id).padStart(3, '0')})`;
    if (badgeEl) badgeEl.textContent = `⏸ Disabled Status`;
    if (descEl) {
        descEl.innerHTML = `Your account was placed in temporary suspension. All your data and past contribution receipts are completely intact in the database.<br><br>Click <strong>"Reactivate My Account"</strong> to immediately resume active access.`;
    }
    if (restoreBtn) {
        restoreBtn.innerHTML = '<i data-lucide="check-circle" class="w-4 h-4"></i> Reactivate My Account';
        restoreBtn.onclick = () => reactivateAccountConfirmed(data.member_id);
    }

    modal.classList.remove('hidden');
    modal.classList.add('flex');
    if (typeof lucide !== 'undefined') lucide.createIcons();
}

function closeRestoreModal() {
    const modal = document.getElementById('accountRestoreModal');
    if (modal) {
        modal.classList.add('hidden');
        modal.classList.remove('flex');
    }
    pendingRestoreMember = null;
}

async function restoreAccountConfirmed(memberId) {
    const restoreBtn = document.getElementById('restoreModalActionBtn');
    if (restoreBtn) {
        restoreBtn.disabled = true;
        restoreBtn.innerHTML = '<span class="animate-spin mr-2">⏳</span> Restoring Account...';
    }
    try {
        const res = await fetch(`http://127.0.0.1:8000/api/members/${memberId}/restore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.detail || 'Failed to restore account');
            return;
        }
        closeRestoreModal();
        sessionStorage.setItem('pbk_member', JSON.stringify(data));
        showMessage('login-status-message', '✓ Account restored successfully! Redirecting to member dashboard...', 'success');
        setTimeout(() => {
            window.location.href = '../Members/member.html';
        }, 1000);
    } catch (err) {
        alert('Network error connecting to backend: ' + err.message);
    } finally {
        if (restoreBtn) restoreBtn.disabled = false;
    }
}

async function reactivateAccountConfirmed(memberId) {
    const restoreBtn = document.getElementById('restoreModalActionBtn');
    if (restoreBtn) {
        restoreBtn.disabled = true;
        restoreBtn.innerHTML = '<span class="animate-spin mr-2">⏳</span> Reactivating Account...';
    }
    try {
        const res = await fetch(`http://127.0.0.1:8000/api/members/${memberId}/reactivate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        if (!res.ok) {
            alert(data.detail || 'Failed to reactivate account');
            return;
        }
        closeRestoreModal();
        sessionStorage.setItem('pbk_member', JSON.stringify(data));
        showMessage('login-status-message', '✓ Account reactivated successfully! Redirecting...', 'success');
        setTimeout(() => {
            window.location.href = '../Members/member.html';
        }, 1000);
    } catch (err) {
        alert('Network error connecting to backend: ' + err.message);
    } finally {
        if (restoreBtn) restoreBtn.disabled = false;
    }
}