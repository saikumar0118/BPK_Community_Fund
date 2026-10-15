# 📘 BPK Community Welfare Fund — Complete 10-Step Beginner Master Handbook

> **Target Audience:** Complete beginners with zero prior experience in Full-Stack Web Development, Python, FastAPI, MySQL, or GitHub.  
> Follow these **10 steps** strictly from top to bottom. Every step has exact instructions, code boxes, and explanations.

---

## 🗺️ Master Roadmap (The 10 Steps)

```mermaid
flowchart TD
    Start(["🚀 Start"]) --> S1["1️⃣ Install Required Softwares\n(Python, MySQL, VS Code, Git)"]
    S1 --> S2["2️⃣ Place Project Folders\n(Understand BackEnd & FrontEnd)"]
    S2 --> S3["3️⃣ MySQL Setup & Password Linking\n(Edit BackEnd/database.py)"]
    S3 --> S4["4️⃣ Python Virtual Environment\n(Activate venv & install packages)"]
    S4 --> S5["5️⃣ Create Database & 13 Tables\n(Run python init_db.py)"]
    S5 --> S6["6️⃣ Start & Link FastAPI Backend\n(Run uvicorn server at port 8000)"]
    S6 --> S7["7️⃣ Open & Connect Frontend Portals\n(HomeLog, Admin & Members)"]
    S7 --> S8["8️⃣ End-to-End System Testing\n(Login, Donate, Generate Receipt)"]
    S8 --> S9["9️⃣ Understand GitHub Files\n(What to upload & what to block)"]
    S9 --> S10["🔟 Push to GitHub Step-by-Step\n(Box-by-box Git commands)"]
    S10 --> Finish(["🎉 100% Live on GitHub!"])

    style Start fill:#1d4ed8,stroke:#60a5fa,stroke-width:2px,color:#ffffff
    style S1 fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#f8fafc
    style S2 fill:#0f172a,stroke:#818cf8,stroke-width:2px,color:#f8fafc
    style S3 fill:#0f172a,stroke:#fbbf24,stroke-width:2px,color:#f8fafc
    style S4 fill:#0f172a,stroke:#f87171,stroke-width:2px,color:#f8fafc
    style S5 fill:#0f172a,stroke:#fb923c,stroke-width:2px,color:#f8fafc
    style S6 fill:#0f172a,stroke:#34d399,stroke-width:2px,color:#f8fafc
    style S7 fill:#0f172a,stroke:#2dd4bf,stroke-width:2px,color:#f8fafc
    style S8 fill:#0f172a,stroke:#c084fc,stroke-width:2px,color:#f8fafc
    style S9 fill:#0f172a,stroke:#facc15,stroke-width:2px,color:#f8fafc
    style S10 fill:#0f172a,stroke:#22d3ee,stroke-width:2px,color:#f8fafc
    style Finish fill:#059669,stroke:#34d399,stroke-width:2px,color:#ffffff
```

---

## 📦 STEP 1: Install Required Software on Your Computer

Before touching any code, install these **4 tools**. If you already have any of them installed, you can skip that item.

| Software | What It Does | Official Download Link |
| :--- | :--- | :--- |
| **1. Python 3.10+** | Runs the backend code and API | [python.org/downloads](https://www.python.org/downloads/) *(⚠️ Check "Add Python to PATH" during installation!)* |
| **2. MySQL Community Server 8.0 & Workbench** | Stores the database and all 13 tables | [dev.mysql.com/downloads/installer](https://dev.mysql.com/downloads/installer/) |
| **3. Git for Windows** | Uploads and syncs code with GitHub | [git-scm.com/download/win](https://git-scm.com/download/win) |
| **4. Visual Studio Code (VS Code)** | Code editor to view and edit files | [code.visualstudio.com](https://code.visualstudio.com/) |

### 🔍 How to Verify Software Installations
Open **Windows PowerShell** and paste these commands one by one:

#### Check Python:
```powershell
python --version
```
> **Expected Output:** `Python 3.13.x` (or higher)

#### Check Git:
```powershell
git --version
```
> **Expected Output:** `git version 2.x.x.windows.1`

#### Check MySQL:
```powershell
mysql --version
```
> **Expected Output:** `mysql Ver 8.0.x for Win64`  
> *(If not recognized in PATH, verify that the `MySQL80` service is running in Windows Services).*

---

## 📂 STEP 2: Place the Project Folders on Your Computer

Place your project folder in your preferred directory (for example: `C:\Users\sai\Documents\BPK_Community_Fund`).

### 🗺️ Visual Directory Map (Where everything lives)

```text
BPK_Community_Fund/                  <-- ROOT FOLDER
│
├── BackEnd/                         <-- 🐍 PYTHON BACKEND FOLDER
│   ├── database.py                  <-- Database connection file (YOU EDIT PASSWORD HERE)
│   ├── database.sql                 <-- Raw SQL table creation script
│   ├── init_db.py                   <-- Automated 1-click database builder
│   ├── main.py                      <-- FastAPI server entrypoint
│   ├── models.py                    <-- 13 Database table definitions
│   ├── routes.py                    <-- All API endpoints (/api/auth, /api/members, etc.)
│   ├── schemas.py                   <-- Input and output data validation
│   ├── requirements.txt             <-- Python package list
│   └── .env.example                 <-- Secret configuration template
│
├── FrontEnd/                        <-- 🌐 HTML / CSS / JS FRONTEND FOLDER
│   ├── HomeLogRegisPass/            <-- Portal 1: Login, Registration & OTP
│   │   ├── HomeLogRegisPass.html    <-- The Web Page (Double-click to open!)
│   │   ├── script.js                <-- Frontend JavaScript logic
│   │   ├── style.css                <-- Styling
│   │   └── pbk_logo.jpg             <-- Logo image
│   ├── Admin/                       <-- Portal 2: Admin Dashboard
│   │   ├── admin.html               <-- Admin Dashboard Web Page
│   │   ├── script.js                <-- Admin API integration
│   │   ├── style.css                <-- Admin styling
│   │   ├── pbk_logo.jpg             <-- Logo image
│   │   └── qrcode.min.js            <-- QR code generator
│   └── Members/                     <-- Portal 3: Member Dashboard
│       ├── member.html              <-- Member Dashboard Web Page
│       ├── script.js                <-- Member API integration
│       ├── style.css                <-- Member styling
│       ├── pbk_logo.jpg             <-- Logo image
│       ├── html2canvas.min.js       <-- HTML to image generator
│       └── jspdf.umd.min.js         <-- PDF receipt generator
│
├── .gitignore                       <-- Shields your repository from unwanted files
├── README.md                        <-- Project presentation for GitHub
└── BEGINNER_GUIDE.md                <-- This master step-by-step handbook
```

---

## 🔑 STEP 3: Setup MySQL & Link Your Password in the Code

Your backend Python code needs permission to talk to your MySQL server.

### 1. Remember Your MySQL Username & Password 
When you installed MySQL, you created a **Username and Password** (for example: `Username: root` & `Password: root`).

### 2. Open `BackEnd/database.py` in VS Code
Look at **Line 16**:

```python
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:root@localhost:3306/pbk_db")
```

### 3. Replace with your actual MySQL username & password:
```text
mysql+pymysql://<YOUR_USER>:<YOUR_PASSWORD>@localhost:3306/pbk_db
```

### 🔄 Example Comparison Box:

| If your `username` & `password` is: | Change Line 16 to: |
| :--- | :--- |
| `root` & `root` *(Default on your PC)* | `DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:root@localhost:3306/pbk_db")` |
| `root` & `admin123` | `DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:admin123@localhost:3306/pbk_db")` |
| `root` & `mypassword` | `DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:mypassword@localhost:3306/pbk_db")` |

Save the file (`Ctrl + S`).

---

## 🐍 STEP 4: Setup Python Virtual Environment & Install Packages

A Python virtual environment keeps your project packages isolated from other apps on your PC.

### Run these commands in PowerShell (one by one):

#### 1. Navigate to BackEnd:
```powershell
cd C:\Users\sai\Documents\BPK_Community_Fund\BackEnd
```

#### 2. Create the Virtual Environment:
```powershell
python -m venv venv
```
*Creates an isolated `venv` folder.*

#### 3. Activate the Environment:
```powershell
Set-ExecutionPolicy -Scope Process -ExecutionPolicy Bypass
.\venv\Scripts\Activate.ps1
```
> *(You will see `(venv)` appear on the left side of your terminal line).*

#### 4. Install All Required Dependencies:
```powershell
pip install -r requirements.txt
```
*This installs FastAPI, Uvicorn, SQLAlchemy, PyMySQL, BCrypt, and Pydantic automatically.*

---

## 🛠️ STEP 5: Create the Database & All 13 Tables (1 Command)

You don't need to manually type SQL commands. We built an automated script [`BackEnd/init_db.py`](BackEnd/init_db.py).

### Run this command in PowerShell (with `(venv)` active):

```powershell
python init_db.py
```

### What happens automatically:
1. It connects to your MySQL server at `localhost:3306`.
2. It executes `CREATE DATABASE IF NOT EXISTS pbk_db`.
3. It creates all **13 tables**:
   - `members`, `admins`, `admin_invitations`, `registration_otps`, `funds`, `fund_usage`, `causes`, `contributions`, `announcements`, `activity_logs`, `member_documents`, `password_reset_requests`, `deleted_records`.
4. It seeds a default Super Admin account if no admins exist:
   - **Email:** `admin@pbkfund.org`
   - **Password:** `admin`
5. It prints a confirmation table with green checkmarks!

*(Alternative: You can also import [`BackEnd/database.sql`](BackEnd/database.sql) directly in MySQL Workbench).*

---

## ⚡ STEP 6: Start & Test the FastAPI Backend

Now start the backend engine!

### 1. Run the Uvicorn Server Command:
```powershell
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

### 2. What You Will See in the Terminal:
```text
INFO:     Uvicorn running on http://127.0.0.1:8000 (Press CTRL+C to quit)
INFO:     Started reloader process
INFO:     Application startup complete.
```

### 3. How to Test the Backend:
Open your web browser (Chrome or Edge) and visit:

* **Health Check URL:** [http://127.0.0.1:8000/](http://127.0.0.1:8000/)  
  > Shows: `{"message": "PBK Community Fund Backend is running"}`
* **Interactive API Documentation (Swagger UI):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)  
  > You will see all 50+ REST API endpoints neatly listed with interactive "Try it out" buttons!

> [!IMPORTANT]
> **Keep this PowerShell terminal window open!** It must stay running in the background for the frontend to work.

---

## 🌐 STEP 7: Launch & Connect the Frontend Portals

The frontend is built using standard HTML5, CSS3, and JavaScript. It connects to your running backend at `http://127.0.0.1:8000/api`.

### 📂 How to Open Each Portal:
Open **Windows File Explorer** and navigate to your `FrontEnd` folder:

```mermaid
flowchart LR
    Root["📂 FrontEnd Folder"] --> B["HomeLogRegisPass/\nHomeLogRegisPass.html\n(Double Click)"]
    Root --> C["Admin/\nadmin.html\n(Double Click)"]
    Root --> D["Members/\nmember.html\n(Double Click)"]

    B --> P1["🔐 Login & Register Portal"]
    C --> P2["🛡️ Admin Control Panel"]
    D --> P3["👤 Member Dashboard"]

    style Root fill:#0f172a,stroke:#38bdf8,stroke-width:2px,color:#ffffff
    style B fill:#0f172a,stroke:#818cf8,stroke-width:2px,color:#ffffff
    style C fill:#0f172a,stroke:#c084fc,stroke-width:2px,color:#ffffff
    style D fill:#0f172a,stroke:#34d399,stroke-width:2px,color:#ffffff
```

1. **Authentication Portal:**
   - Double-click: `FrontEnd/HomeLogRegisPass/HomeLogRegisPass.html`
   - Use this to register new members, verify OTP, or sign in.
2. **Admin Portal:**
   - Double-click: `FrontEnd/Admin/admin.html`
   - Use this to approve members, manage funds, log expenses, and view activity logs.
3. **Member Portal:**
   - Double-click: `FrontEnd/Members/member.html`
   - Use this to view member ID card, donate funds, and download PDF receipts.

*(Alternative: You can also open with **VS Code Live Server** or run `python -m http.server 3000` in the `FrontEnd` folder).*

---

## 🧪 STEP 8: End-to-End System Testing (Walkthrough)

Test that your full stack is communicating from browser to MySQL database:

1. **Test Member Registration:**
   - Go to `HomeLogRegisPass.html`.
   - Click **Register**. Fill in First Name, Phone, and Password.
   - Click **Send OTP**. Enter received OTP (or check terminal for OTP).
   - Click **Submit**. Your record is now securely saved in MySQL `members` table!
2. **Test Admin Login:**
   - Open `HomeLogRegisPass.html` (toggle role to Admin) or `admin.html`.
   - Login with:
     - **Email:** `admin@pbkfund.org` *(or your registered `sai@gmail.com`)*
     - **Password:** `admin`
   - You will see the Admin Dashboard with Live Statistics and the Members list!
3. **Test Making a Contribution & Receipt:**
   - Open `member.html`.
   - Navigate to **Contribute**.
   - Enter Amount: `500`, select Fund: `General Fund`, enter reference number.
   - Submit and click **Download Receipt (PDF)**. A formatted PDF receipt will download to your computer!

---

## 🛡️ STEP 9: What Files Can GitHub Handle (And What Must Be Blocked)

When uploading to GitHub, beginners often make the mistake of uploading **50,000 hidden system files** from the `venv` folder, which freezes Git.

Here is the exact breakdown:

| File / Folder | Can GitHub Handle It? | Action Taken by `.gitignore` | Why? |
| :--- | :---: | :---: | :--- |
| **Python files (`.py`)** | ✅ YES | Upload to GitHub | This is your actual application code. |
| **HTML / CSS / JS** | ✅ YES | Upload to GitHub | This is your frontend code. |
| **Images (`pbk_logo.jpg`)** | ✅ YES | Upload to GitHub | Branding logos and icons. |
| **`database.sql`** | ✅ YES | Upload to GitHub | Table schema blueprint for other developers. |
| **`requirements.txt`** | ✅ YES | Upload to GitHub | Tells others what packages to install. |
| **`BackEnd/venv/`** | ❌ **NEVER!** | 🚫 **BLOCKED by `.gitignore`** | 500 MB+ and 40,000+ files. Others build their own `venv`. |
| **`__pycache__/`** | ❌ **NEVER!** | 🚫 **BLOCKED by `.gitignore`** | Temporary compiled Python bytecode. |
| **`.env`** | ❌ **NEVER!** | 🚫 **BLOCKED by `.gitignore`** | Contains secret passwords. |

Our [`.gitignore`](.gitignore) already protects you from all mistakes!

---

## 🚀 STEP 10: Step-by-Step GitHub Upload (Box by Box)

Follow this exact command sequence in **PowerShell**:

### 1️⃣ Navigate to Project Root
```powershell
cd C:\Users\sai\Documents\BPK_Community_Fund
```
> **What it does:** Sets the active directory to your project folder.

---

### 2️⃣ Initialize Local Git Tracking
```powershell
git init
```
> **What it does:** Creates a hidden `.git` folder on your disk.  
> **Expected Output:** `Initialized empty Git repository in .../.git/`

---

### 3️⃣ Stage All Allowed Files
```powershell
git add .
```
> **What it does:** Scans your project and stages all source code files. (It skips `venv/` automatically).  
> **Verification command:** `git status` (All your files will appear in **green**).

---

### 4️⃣ Record Your Milestone Snapshot (Commit)
```powershell
git commit -m "feat: complete initial setup of BPK Community Fund system"
```
> **What it does:** Saves a permanent local version of your code.  
> **Expected Output:** `[main (root-commit) ...] 18 files changed, 2500 insertions(+)`

---

### 5️⃣ Set Main Branch Name
```powershell
git branch -M main
```
> **What it does:** Renames default branch to `main`.

---

### 6️⃣ Link to Your GitHub Repository
Go to [github.com](https://github.com/), click **New Repository**, name it `BPK_Community_Fund`, do NOT add README, and copy the repository link:

```powershell
git remote add origin https://github.com/saikumar0118/BPK_Community_Fund.git
```

---

### 7️⃣ Push Your Code to the Cloud!
```powershell
git push -u origin main
```
> **What it does:** Uploads all your files to GitHub.  
> **Popup:** A small browser window will appear asking you to sign into GitHub. Click **Sign in with your browser**.

---

🎉 **Congratulations! Your full stack BPK Community Fund Web App is now officially live on GitHub!**
