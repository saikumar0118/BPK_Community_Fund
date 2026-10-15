# 🏛️ PBK Community Welfare Fund Management System

[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.143.0-009688.svg)](https://fastapi.tiangolo.com/)
[![MySQL](https://img.shields.io/badge/Database-MySQL-4479A1.svg)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)
[![Status](https://img.shields.io/badge/Status-Active%20Development-success.svg)]()

> A full-stack web application designed for community welfare organizations to manage members, handle monetary contributions, distribute funds to verified social causes, generate downloadable PDF receipts, and provide transparent administrative tracking.

> [!TIP]
> 📖 **Are you a complete beginner?** Check out the step-by-step master tutorial: [**BEGINNER_GUIDE.md**](BEGINNER_GUIDE.md) — includes software installation, MySQL password configuration, table generation, folder navigation, and GitHub upload in 10 simple steps!

---

## 📌 Table of Contents
- [📘 10-Step Beginner Master Guide](BEGINNER_GUIDE.md)
- [🖥️ System Architecture ](FLOWCHART.md)
- [🗺️ BPK 10-Step Setup Roadmap](SETUP_ROADMAP.svg)
- [📖 About The Project](#-about-the-project)
- [🏗️ System Architecture & Workflow](#️-system-architecture--workflow)
- [✨ Key Features](#-key-features)
- [📂 Project Directory Structure](#-project-directory-structure)
- [🚀 Beginner Setup & Installation Guide](#-beginner-setup--installation-guide)
  - [Prerequisites](#prerequisites)
  - [Step 1: Set Up MySQL Database](#step-1-set-up-mysql-database)
  - [Step 2: Backend Setup & Server Start](#step-2-backend-setup--server-start)
  - [Step 3: Launch Frontend Portals](#step-3-launch-frontend-portals)
- [📡 API Documentation](#-api-documentation)
- [🔐 Security & Configuration](#-security--configuration)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)

---

## 📖 About The Project

**PBK Community Welfare Fund** provides a digital solution for non-profit and community groups. It automates financial ledger tracking, member record keeping, and administrative governance with security checks like OTP verification and a 30-day recycle bin for data recovery.

The project consists of:
1. **Interactive Frontend Web Portals** (Clean HTML5, CSS3, JavaScript with QR code & PDF receipt generators).
2. **High-Performance FastAPI REST API** (Python asynchronous backend with SQLAlchemy ORM and Pydantic validation).
3. **Relational MySQL Database** (Structured schema supporting 13 interconnected entities).

---

## 🏗️ System Architecture & Workflow

Here is how the entire application flows from user interaction to database persistence:

```mermaid
flowchart TD
    subgraph Users["👥 User Interaction Layer"]
        M[Members / Donors]
        A[System Administrators]
    end

    subgraph Frontend["💻 Frontend Web Portals"]
        FP1["🔐 Auth Portal\n(HomeLogRegisPass.html)"]
        FP2["👤 Member Portal\n(member.html)"]
        FP3["🛡️ Admin Dashboard\n(admin.html)"]
    end

    subgraph Backend["⚡ Backend API Layer (FastAPI)"]
        API["FastAPI App (main.py)"]
        RT["REST API Router (routes.py)\n- /api/auth\n- /api/members\n- /api/funds\n- /api/contributions\n- /api/causes\n- /api/announcements"]
        SC["Data Validation (schemas.py)"]
        ORM["SQLAlchemy Models (models.py)"]
    end

    subgraph Database["🗄️ Database Layer"]
        DB[("MySQL Database\n(pbk_db)")]
    end

    M --> FP1
    M --> FP2
    A --> FP1
    A --> FP3

    FP1 -- "HTTP / JSON REST" --> API
    FP2 -- "HTTP / JSON REST" --> API
    FP3 -- "HTTP / JSON REST" --> API

    API --> RT
    RT --> SC
    SC --> ORM
    ORM <--> DB
```

---

## ✨ Key Features

### 👤 Member Portal
- **User Authentication:** Registration, Secure Login, Password Recovery, and OTP verification.
- **Member Dashboard:** Real-time summary of total contributions, active community causes, and verified announcements.
- **Contribution System:** Make contributions, enter transaction details, and upload payment proofs.
- **PDF Receipts:** Download instant PDF receipts generated on the client side using `jspdf` and `html2canvas`.
- **Digital ID Card & QR Code:** Dynamic QR generation for member verification.

### 🛡️ Admin Portal
- **Member Management:** Search, filter, approve, or soft-delete member accounts.
- **Fund & Expense Oversight:** Track incoming fund pools, allocate expenditures, and log usage details.
- **Causes & Events:** Publish community initiatives, set fundraising targets, and monitor completion status.
- **Receipt Verification:** Audit donor transactions and verify bank transaction references.
- **Recycle Bin (Trash):** 30-day soft deletion safety net allowing restoration of mistakenly deleted records.
- **Activity & Security Logs:** Live tracking of login sessions and critical administrative actions.

---

## 📂 Project Directory Structure

```text
BPK_Community_Fund/
├── .github/                         # GitHub templates and workflows
│   └── ISSUE_TEMPLATE/
│       ├── bug_report.md            # Template for reporting bugs
│       └── feature_request.md       # Template for proposing new features
├── .gitignore                       # Rules for files to exclude from Git
├── CONTRIBUTING.md                  # Guidelines for contributing to the repository
├── LICENSE                          # MIT open-source license
├── README.md                        # Project documentation (this file)
├── requirements.txt                 # Backend dependency pointer
├── BackEnd/                         # Python FastAPI REST API
│   ├── database.py                  # Database connection & SQLAlchemy engine
│   ├── database.sql                 # Complete MySQL schema & starter seed SQL script
│   ├── init_db.py                   # 1-command automatic database & table creator
│   ├── main.py                      # FastAPI entrypoint, auto table builder & health checks
│   ├── models.py                    # SQLAlchemy database tables & relationships
│   ├── routes.py                    # API route handlers & business logic
│   ├── schemas.py                   # Pydantic request/response validation schemas
│   ├── requirements.txt             # Python libraries & package dependencies
│   └── .env.example                 # Example template for environment secrets
└── FrontEnd/                        # Client-side user interface portals
    ├── Admin/                       # Administrator Control Panel
    │   ├── admin.html               # Main admin dashboard layout
    │   ├── pbk_logo.jpg             # Organization branding logo
    │   ├── qrcode.min.js            # QR code rendering library
    │   ├── script.js                # Admin logic, API calls, dynamic tables
    │   └── style.css                # Admin portal styling
    ├── HomeLogRegisPass/            # Authentication & Landing Pages
    │   ├── HomeLogRegisPass.html    # Login, Registration, Forgot Password UI
    │   ├── pbk_logo.jpg             # Organization branding logo
    │   ├── script.js                # Form validation, OTP timers, Auth API calls
    │   └── style.css                # Authentication portal styling
    └── Members/                     # Member Self-Service Portal
        ├── html2canvas.min.js       # Canvas snapshot utility for receipt export
        ├── jspdf.umd.min.js         # Client-side PDF generation library
        ├── member.html              # Member dashboard & contribution view
        ├── pbk_logo.jpg             # Organization branding logo
        ├── qrcode.min.js            # Dynamic QR code generation script
        ├── script.js                # Member profile logic, API integration
        └── style.css                # Member portal styling
```

## 🗺️ BPK 10-Step Setup Roadmap

<div align="center">
  <img src="SETUP_ROADMAP.svg" alt="BPK 10-Step Setup Roadmap" width="100%">
</div>

---

## 🚀 Beginner Setup & Installation Guide

Follow these steps sequentially to get the project running on your computer.

### Prerequisites
Make sure you have installed on your machine:
- **Python (Version 3.10 or higher)**: [python.org](https://www.python.org/downloads/)
- **MySQL Server (or XAMPP / WampServer)**: [mysql.com](https://dev.mysql.com/downloads/installer/)
- A modern web browser (Google Chrome, Microsoft Edge, Mozilla Firefox)

---

### Step 1: Set Up MySQL Database

You have two easy ways to set up the database:

#### Method A: Automatic Python Script (Recommended for Beginners)
Simply run the initialization script inside the `BackEnd` folder:
```bash
cd D:\BPK_Community_Fund\BackEnd
python init_db.py
```
*This automatically creates the `pbk_db` database, builds all 13 tables, and sets up starter funds!*

#### Method B: Import `database.sql` via MySQL Workbench / CLI
```sql
mysql -u root -p < database.sql
```
*(Default connection string in `database.py`: `mysql+pymysql://root:root@localhost:3306/pbk_db`)*.

---

### Step 2: Backend Setup & Server Start

Open **PowerShell** or **Command Prompt** and run the following commands:

1. **Navigate to the BackEnd folder:**
```bash
cd D:\BPK_Community_Fund\BackEnd
```

2. **Create a virtual environment (optional if you already have one):**
```bash
python -m venv venv
```

3. **Activate the virtual environment:**
- **On Windows (PowerShell):**
```powershell
.\venv\Scripts\Activate.ps1
```
- **On Windows (Command Prompt):**
```cmd
venv\Scripts\activate.bat
```

4. **Install required dependencies:**
```bash
pip install -r requirements.txt
```

5. **Start the FastAPI backend server:**
```bash
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```

6. **Verify server is live:**
Open your browser and visit: `http://127.0.0.1:8000`
You should see:
```json
{"message": "PBK Community Fund Backend is running"}
```

---

### Step 3: Launch Frontend Portals

The frontend uses standard HTML/CSS/JavaScript and does not require complex build steps:

1. **Authentication Portal (Login / Register):**
   - Double-click `FrontEnd/HomeLogRegisPass/HomeLogRegisPass.html` or open it in your browser.
2. **Member Dashboard:**
   - Open `FrontEnd/Members/member.html`.
3. **Admin Control Panel:**
   - Open `FrontEnd/Admin/admin.html`.

---

## 📡 API Documentation

FastAPI provides automatic interactive API documentation out of the box:

- **Swagger UI (Interactive):** [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)
- **ReDoc (Detailed Specifications):** [http://127.0.0.1:8000/redoc](http://127.0.0.1:8000/redoc)

---

## 🔐 Security & Configuration

- **CORS Configuration:** Configured in `BackEnd/main.py` to allow seamless local testing between frontend files and backend endpoints.
- **Passwords:** Encrypted with `bcrypt` salt hashing before being stored in the database.
- **Protected Environment Variables:** Sensitive database passwords and JWT secrets should be configured via `BackEnd/.env` (see `BackEnd/.env.example`).

---

## 🤝 Contributing

Contributions make the open-source community an amazing place to learn and build. Any contributions you make are **greatly appreciated**.

Please review [CONTRIBUTING.md](CONTRIBUTING.md) for details on our code of conduct and development workflow.

---

## 📄 License

Distributed under the MIT License. See [LICENSE](LICENSE) for more details.
