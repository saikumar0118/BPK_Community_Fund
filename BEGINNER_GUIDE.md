# 📘 PBK COMMUNITY FUND - BEGINNER FULL-STACK WEB DEVELOPMENT GUIDE
> **Project Path:** `C:\Users\sai\Documents\BPK_Community_Fund`  
> **Architecture:** FastAPI (Python) + MySQL 8.0 + Vanilla HTML5/CSS3/JavaScript  
> **Level:** Complete Beginner to Full-Stack Web Developer

---

## 🗺️ Master Architecture & Data Flow

```mermaid
flowchart TD
    subgraph Client ["🖥️ CLIENT BROWSER (FrontEnd)"]
        A1["Home & Auth Portal\n(HomeLogRegisPass.html)"]
        A2["Admin Dashboard\n(admin.html)"]
        A3["Member Dashboard\n(member.html)"]
    end

    subgraph API ["⚡ REST API BACKEND (FastAPI - Port 8000)"]
        B1["main.py\n(CORS + App Entry)"]
        B2["routes.py\n(/api/admins, /api/members, /api/funds)"]
        B3["schemas.py\n(Data Validation via Pydantic)"]
        B4["database.py & models.py\n(SQLAlchemy ORM Engine)"]
    end

    subgraph DB ["🗄️ DATABASE (MySQL 8.0 - Port 3306)"]
        C1[("pbk_db\n(13 Relational Tables)")]
    end

    A1 -->|"HTTP fetch() JSON"| B1
    A2 -->|"HTTP fetch() JSON"| B1
    A3 -->|"HTTP fetch() JSON"| B1
    B1 --> B2
    B2 --> B3
    B2 --> B4
    B4 -->|"SQL Queries via PyMySQL"| C1
```

---

# 📑 Table of Contents (The 10 Master Steps)
1. [Step 1: Install Required Software from Zero](#step-1-install-required-software-from-zero)
2. [Step 2: Understand Folder Structure & Open in VS Code](#step-2-understand-folder-structure--open-in-vs-code)
3. [Step 3: MySQL Database Credentials & Where to Change Code](#step-3-mysql-database-credentials--where-to-change-code)
4. [Step 4: Create Python Virtual Environment & Install Dependencies](#step-4-create-python-virtual-environment--install-dependencies)
5. [Step 5: Initialize Database & Create All Tables](#step-5-initialize-database--create-all-tables)
6. [Step 6: Start FastAPI Backend Server & Check Interactive Docs](#step-6-start-fastapi-backend-server--check-interactive-docs)
7. [Step 7: Connect FrontEnd with FastAPI Backend](#step-7-connect-frontend-with-fastapi-backend)
8. [Step 8: End-to-End Testing (Admin, Member, Registration)](#step-8-end-to-end-testing-admin-member-registration)
9. [Step 9: Beginner Troubleshooting & Common Errors Solved](#step-9-beginner-troubleshooting--common-errors-solved)
10. [Step 10: Git & GitHub Setup (What Files to Push and Ignore)](#step-10-git--github-setup-what-files-to-push-and-ignore)

---

## 🛠️ Step 1: Install Required Software from Zero

| Software | Why It Is Needed | Official Download Link | Installation Crucial Checkpoint |
| :--- | :--- | :--- | :--- |
| **Python (3.10+)** | Runs the FastAPI backend server | [python.org/downloads](https://www.python.org/downloads/) | ⚠️ **MUST CHECK:** *"Add python.exe to PATH"* during setup! |
| **MySQL Server 8.0** | Stores all database records, users, funds | [dev.mysql.com/downloads/installer/](https://dev.mysql.com/downloads/installer/) | Remember your **root password** (Default used in project: `root`). Service name: `MySQL80`. |
| **VS Code** | Code editor to write and manage code | [code.visualstudio.com](https://code.visualstudio.com/) | Recommended extensions: **Python**, **Live Server**. |
| **Git for Windows** | Version control & pushing to GitHub | [git-scm.com/download/win](https://git-scm.com/download/win) | Select "Git from the command line and also from 3rd-party software". |

### Quick Verification in PowerShell:
Press `Win + X` and select **Terminal** (or **PowerShell**), then run:
```powershell
python --version
mysql --version
git --version
```
*If Python or MySQL prints their version numbers, they are successfully installed!*

---

## 📂 Step 2: Understand Folder Structure & Open in VS Code

Your project is located at:
`C:\Users\sai\Documents\BPK_Community_Fund`

### Visual Directory Tree:
```text
C:\Users\sai\Documents\BPK_Community_Fund\
│
├── .gitignore                     <-- Prevents secrets and virtual envs from uploading to GitHub
├── BEGINNER_FULLSTACK_GUIDE.md    <-- This complete master manual
│
├── BackEnd\                       <-- 🐍 PYTHON BACKEND (FastAPI + SQLAlchemy)
│   ├── .env.example               <-- Template for DB host, user, password, secret keys
│   ├── database.py                <-- Connects Python to MySQL database via SQLAlchemy
│   ├── database.sql               <-- Complete SQL script to build tables manually if needed
│   ├── init_db.py                 <-- Auto script: creates 'pbk_db', 13 tables & starter data
│   ├── main.py                    <-- App launcher: starts FastAPI server & configures CORS
│   ├── models.py                  <-- SQLAlchemy database table schemas (Python classes)
│   ├── routes.py                  <-- All API endpoints (/api/members, /api/admins, etc.)
│   ├── schemas.py                 <-- Pydantic models for request & response validation
│   └── requirements.txt           <-- List of Python libraries needed (fastapi, uvicorn, pymysql)
│
└── FrontEnd\                      <-- 🌐 CLIENT PORTALS (HTML + CSS + JavaScript)
    ├── Admin\                     <-- Admin portal (financial oversight, approve members, reports)
    │   ├── admin.html             <-- Admin web page
    │   ├── script.js              <-- Handles admin interactions & API calls to backend
    │   ├── style.css              <-- Admin styling & layout
    │   ├── pbk_logo.jpg           <-- PBK community brand logo
    │   └── qrcode.min.js          <-- QR code generator for receipts
    │
    ├── HomeLogRegisPass\          <-- Public gateway portal
    │   ├── HomeLogRegisPass.html  <-- Home page, Member & Admin Login, Member Registration
    │   ├── script.js              <-- Login logic, OTP generation, password reset
    │   ├── style.css              <-- Public portal styling
    │   └── pbk_logo.jpg           <-- Logo image
    │
    └── Members\                   <-- Member portal
        ├── member.html            <-- Member profile, passbook, fund contributions
        ├── script.js              <-- Member data fetching, donation logic, receipt generation
        ├── style.css              <-- Member portal styling
        ├── html2canvas.min.js     <-- Converts receipt HTML into canvas image
        └── jspdf.umd.min.js       <-- Exports official receipts as downloadable PDF
```

### How to open in VS Code:
1. Open **VS Code**.
2. Click **File** ➔ **Open Folder...**
3. Navigate to `C:\Users\sai\Documents\BPK_Community_Fund` and click **Select Folder**.

---

## 🔑 Step 3: MySQL Database Credentials & Where to Change Code

The backend connects to MySQL using a connection URL with the following format:
`mysql+pymysql://<USERNAME>:<PASSWORD>@<HOST>:<PORT>/<DATABASE_NAME>`

### File 1: `BackEnd/database.py` (Line 16)
Open `C:\Users\sai\Documents\BPK_Community_Fund\BackEnd\database.py`:
```python
# ------------------------------------------------------------------------------
# 1. DATABASE CONNECTION URL
# Format: mysql+pymysql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>
# Change 'root:root' to your own MySQL username:password if different!
# ------------------------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:root@localhost:3306/pbk_db")
```

### 🎯 How to edit your password:
- If your MySQL user is `root` and password is `root`, **no changes are needed!**
- If your MySQL user is `root` and password is `mypassword123`, change it to:
```python
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:mypassword123@localhost:3306/pbk_db")
```

### File 2: `BackEnd/init_db.py` (Line 21)
Open `C:\Users\sai\Documents\BPK_Community_Fund\BackEnd\init_db.py`:
```python
def create_database_if_not_exists(
    host=os.getenv("DB_HOST", "localhost"),
    user=os.getenv("DB_USER", "root"),
    password=os.getenv("DB_PASSWORD", "root"),  # <-- Change 'root' here if your password is different
    port=int(os.getenv("DB_PORT", 3306)),
    db_name=os.getenv("DB_NAME", "pbk_db")
):
```

---

## 📦 Step 4: Create Python Virtual Environment & Install Dependencies

A **Virtual Environment (`venv`)** keeps your project dependencies isolated so they don't conflict with any other Python projects on your machine.

Open **PowerShell** or VS Code Integrated Terminal (`Ctrl + ~`) and copy-paste these commands:

```powershell
# 1. Navigate into the BackEnd folder
cd C:\Users\sai\Documents\BPK_Community_Fund\BackEnd

# 2. Create the virtual environment named 'venv'
python -m venv venv

# 3. Activate the virtual environment
.\venv\Scripts\Activate.ps1
```

> [!TIP]
> If PowerShell shows an error saying *"running scripts is disabled on this system"*, run this single command to unlock it:
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
> .\venv\Scripts\Activate.ps1
> ```
> When activated, your terminal prompt will show `(venv)` at the beginning:
> `(venv) PS C:\Users\sai\Documents\BPK_Community_Fund\BackEnd>`

### Install all requirements:
```powershell
pip install -r requirements.txt
```
This installs:
- **fastapi**: The high-performance modern API framework
- **uvicorn**: The lightning-fast ASGI web server
- **SQLAlchemy**: The Python Object Relational Mapper (ORM)
- **PyMySQL**: The pure-Python driver to talk to MySQL
- **bcrypt**: Secure password encryption and hashing
- **pydantic**: Data schema validation

---

## 🗄️ Step 5: Initialize Database & Create All Tables

You do not need to write complicated SQL by hand! The project includes an automated database builder script: `init_db.py`.

With your `(venv)` active in `BackEnd`:
```powershell
python init_db.py
```

### What this command automatically does:
1. Connects to MySQL server at `localhost:3306`.
2. Creates the database `pbk_db` (with UTF-8 character encoding).
3. Automatically builds all **13 relational tables**:
   - `admins` (Super Admins, General Admins)
   - `admin_invitations` (Invitation tokens for creating new admins)
   - `members` (Community registered members)
   - `member_documents` (Uploaded KYC & ID documents)
   - `funds` (Youth Fund, Village Fund, General Fund)
   - `fund_usage` (Expense logs and fund utilization)
   - `causes` (Special community causes / emergency appeals)
   - `contributions` (Member donations, payment modes, amounts)
   - `announcements` (Community broadcast messages)
   - `activity_logs` (Audit trails for every admin and member action)
   - `registration_otps` (OTP verification codes for signup)
   - `password_reset_requests` (Password recovery tokens)
   - `deleted_records` (Soft delete tracking)
4. Automatically seeds the default **Super Admin**:
   - **Email:** `admin@pbkfund.org`
   - **Phone:** `9999999999`
   - **Password:** `admin`
5. Automatically seeds default funds: `Youth Fund`, `Village Fund`, `General Fund`.

---

## 🚀 Step 6: Start FastAPI Backend Server & Check Interactive Docs

Run the server with Uvicorn:
```powershell
uvicorn main:app --reload
```

### Explanation of parameters:
- `main`: points to `main.py`
- `app`: the FastAPI instance inside `main.py`
- `--reload`: automatically restarts the server whenever you save changes in your code!

### Output in terminal:
```text
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Application startup complete.
```

### Test your backend in your web browser:
1. **Health Check:** Open `http://127.0.0.1:8000/`  
   *Result:* `{"message": "PBK Community Fund Backend is running"}`
2. **Interactive Swagger UI (API Docs):** Open `http://127.0.0.1:8000/docs`  
   *You will see the complete live interactive documentation of all API routes! You can test any route directly from your browser!*
3. **Alternative Redoc Documentation:** Open `http://127.0.0.1:8000/redoc`

---

## 🔗 Step 7: Connect FrontEnd with FastAPI Backend

The frontend consists of 3 distinct portals built with pure HTML, CSS, and modern JavaScript. They communicate with the backend using the standard JavaScript `fetch()` API.

### How Frontend calls Backend:
In `FrontEnd\HomeLogRegisPass\script.js`:
```javascript
// Admin Login Request:
const response = await fetch('http://127.0.0.1:8000/api/admins/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: emailOrPhone, password: password })
});
```

### How to Run the Frontend (Pick Any 1 Method):

#### Method 1: VS Code "Live Server" (Recommended for Beginners)
1. In VS Code, install the extension **Live Server** (by Ritwick Dey).
2. In the VS Code file explorer, expand `FrontEnd` ➔ `HomeLogRegisPass`.
3. Right-click `HomeLogRegisPass.html` and click **"Open with Live Server"**.
4. Your browser will open `http://127.0.0.1:5500/FrontEnd/HomeLogRegisPass/HomeLogRegisPass.html`.

#### Method 2: Python Simple HTTP Server
Open a **new** PowerShell window:
```powershell
cd C:\Users\sai\Documents\BPK_Community_Fund\FrontEnd
python -m http.server 3000
```
Open your browser at:
- Home / Login: `http://localhost:3000/HomeLogRegisPass/HomeLogRegisPass.html`
- Admin Portal: `http://localhost:3000/Admin/admin.html`
- Member Portal: `http://localhost:3000/Members/member.html`

#### Method 3: Direct Double Click
Simply double-click `HomeLogRegisPass.html` in Windows File Explorer!

---

## 🧪 Step 8: End-to-End Testing (Admin, Member, Registration)

Follow this test scenario to verify the whole system is functioning:

```mermaid
sequenceDiagram
    autonumber
    actor Admin as 👤 Admin / User
    participant Browser as 🖥️ Browser (FrontEnd)
    participant Server as ⚡ FastAPI (Port 8000)
    participant DB as 🗄️ MySQL (pbk_db)

    Admin->>Browser: Opens HomeLogRegisPass.html
    Admin->>Browser: Selects "Admin" role & enters credentials
    Browser->>Server: POST /api/admins/login
    Server->>DB: Query admin record & verify bcrypt password
    DB-->>Server: Credentials valid
    Server-->>Browser: HTTP 200 OK + Admin Profile Data
    Browser->>Admin: Redirects to Admin Dashboard (admin.html)
```

### 1. Test Admin Login:
1. Open `HomeLogRegisPass.html`.
2. Toggle role to **Admin**.
3. Enter:
   - **Email / Phone:** `admin@pbkfund.org` (or `sai@gmail.com`)
   - **Password:** `admin`
4. Click **Login**.
5. You will be successfully logged in and redirected to the **Admin Dashboard**!

### 2. Test Member Self-Registration:
1. Click **"New Member Registration"** on `HomeLogRegisPass.html`.
2. Enter your Name, Phone Number, and Email.
3. Click **"Send OTP"**.
4. The system validates the OTP and stores your profile directly into MySQL `members` table!

### 3. Test Member Portal & Contributions:
1. Login as Member or open `member.html`.
2. View available funds (**Youth Fund**, **Village Fund**, **General Fund**).
3. Test making a contribution and generate a downloadable PDF receipt with QR Code!

---

## 🚨 Step 9: Beginner Troubleshooting & Common Errors Solved

### Error 1: `ModuleNotFoundError: No module named 'fastapi'`
- **Cause:** You ran the command in a terminal where the virtual environment is not activated.
- **Fix:** Run:
  ```powershell
  cd C:\Users\sai\Documents\BPK_Community_Fund\BackEnd
  .\venv\Scripts\Activate.ps1
  ```
  Ensure `(venv)` appears before your prompt!

### Error 2: `pymysql.err.OperationalError: (1045, "Access denied for user 'root'@'localhost'")`
- **Cause:** The MySQL password in `database.py` does not match your MySQL Server root password.
- **Fix:** Open `BackEnd\database.py` and replace `root:root` with `root:<your_actual_password>`.

### Error 3: `pymysql.err.OperationalError: (2003, "Can't connect to MySQL server")`
- **Cause:** MySQL service is stopped.
- **Fix:** In PowerShell (Run as Administrator):
  ```powershell
  Start-Service MySQL80
  ```

### Error 4: `Port 8000 is already in use`
- **Cause:** Another instance of Uvicorn or backend is running.
- **Fix:** Run Uvicorn on another port:
  ```powershell
  uvicorn main:app --reload --port 8001
  ```

---

## 🐙 Step 10: Git & GitHub Setup (What Files to Push and Ignore)

When pushing a full-stack project to GitHub, **NEVER** push passwords, temporary caches, or the large virtual environment!

### What to Push vs What to Ignore:

| File / Folder | Action | Why? |
| :--- | :--- | :--- |
| `BackEnd/*.py` (`main.py`, `routes.py`, `models.py`) | ✅ **PUSH** | Core application logic |
| `FrontEnd/**` (`.html`, `.css`, `.js`, images) | ✅ **PUSH** | UI portal files |
| `requirements.txt` | ✅ **PUSH** | Allows anyone else to install the exact same packages |
| `.gitignore` | ✅ **PUSH** | Tells Git what files to ignore |
| `.env.example` | ✅ **PUSH** | Safe sample template without real passwords |
| `venv/` | ❌ **DO NOT PUSH (IGNORED)** | Hundreds of MBs of local computer binaries |
| `__pycache__/` | ❌ **DO NOT PUSH (IGNORED)** | Python compiled bytecode files |
| `.env` (contains real passwords) | ❌ **DO NOT PUSH (IGNORED)** | Security risk |

### First-Time Git Setup & GitHub Push Commands:

Open PowerShell in the root project folder:
```powershell
# 1. Go to root folder
cd C:\Users\sai\Documents\BPK_Community_Fund

# 2. Configure your Git identity (if not already done)
git config --global user.name "Your Name"
git config --global user.email "your.email@example.com"

# 3. Initialize Git repository
git init

# 4. Stage all permitted project files (respecting .gitignore)
git add .

# 5. Make initial commit
git commit -m "Initial commit: PBK Community Fund Full-Stack System"

# 6. Rename branch to main
git branch -M main

# 7. Link to your GitHub repository (Create an empty repo on github.com first)
git remote add origin https://github.com/<YOUR_GITHUB_USERNAME>/BPK_Community_Fund.git

# 8. Push your code to GitHub
git push -u origin main
```

---

## 🎯 Quick Cheat-Sheet Summary

```text
┌────────────────────────────────────────────────────────┐
│             DAILY DEVELOPER RUN COMMANDS               │
├────────────────────────────────────────────────────────┤
│ 1. Open Terminal 1 (Backend):                          │
│    cd C:\Users\sai\Documents\BPK_Community_Fund\BackEnd│
│    .\venv\Scripts\Activate.ps1                         │
│    uvicorn main:app --reload                           │
│                                                        │
│ 2. Backend Live at: http://127.0.0.1:8000              │
│    Swagger API at:  http://127.0.0.1:8000/docs         │
│                                                        │
│ 3. Open Terminal 2 (Frontend):                         │
│    cd C:\Users\sai\Documents\BPK_Community_Fund\FrontEnd│
│    python -m http.server 3000                          │
│                                                        │
│ 4. Frontend Live at:                                   │
│    http://localhost:3000/HomeLogRegisPass/HomeLogRegisPass.html
└────────────────────────────────────────────────────────┘
```
