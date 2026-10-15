# 🌟 PBK Community Welfare Fund — Full-Stack Management System

[![FastAPI](https://img.shields.io/badge/FastAPI-0.143.0-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Python](https://img.shields.io/badge/Python-3.10%2B-blue.svg?logo=python&logoColor=white)](https://www.python.org/)
[![MySQL](https://img.shields.io/badge/MySQL-8.0-orange.svg?logo=mysql&logoColor=white)](https://www.mysql.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)

A comprehensive Full-Stack Community Welfare Fund Management Portal built with **FastAPI**, **SQLAlchemy ORM**, **MySQL 8.0**, and **Vanilla HTML5/CSS3/JavaScript**.

---

## 🚀 Quick Start (In 3 Commands)

```powershell
# 1. Activate BackEnd Virtual Environment
cd BackEnd
.\venv\Scripts\Activate.ps1

# 2. Start Backend API Server
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
- **Live API:** `http://127.0.0.1:8000/`
- **Interactive Swagger Docs:** `http://127.0.0.1:8000/docs`

```powershell
# 3. Open FrontEnd Portal
# Double click FrontEnd/HomeLogRegisPass/HomeLogRegisPass.html
```

---

## 📘 Documentation & Visual Roadmap
- 📖 **Full Handbook:** 👉 **[BEGINNER_GUIDE.md](BEGINNER_GUIDE.md)** *(Complete step-by-step tutorial)*
- 🗺️ **Visual Flowchart:** 👉 **[FLOWCHART.md](FLOWCHART.md)** *(Pure visual diagram view — no confusing code)*

---

## 🏛️ System Architecture

```mermaid
flowchart TD
    subgraph Client ["🖥️ Web Browser (FrontEnd)"]
        A1["Home & Auth Portal\n(HomeLogRegisPass.html)"]
        A2["Admin Control Panel\n(admin.html)"]
        A3["Member Dashboard\n(member.html)"]
    end

    subgraph Server ["⚡ FastAPI REST Engine (Port 8000)"]
        B1["main.py\n(CORS + Lifespan)"]
        B2["routes.py\n(50+ API Endpoints)"]
        B3["schemas.py\n(Pydantic Validation)"]
        B4["database.py & models.py\n(SQLAlchemy ORM)"]
    end

    subgraph Database ["🗄️ MySQL Database (Port 3306)"]
        C1[("pbk_db\n(13 Relational Tables)")]
    end

    A1 -->|"HTTP fetch() JSON"| B1
    A2 -->|"HTTP fetch() JSON"| B1
    A3 -->|"HTTP fetch() JSON"| B1
    B1 --> B2
    B2 --> B3
    B2 --> B4
    B4 -->|"PyMySQL Driver"| C1
```

---

## 📂 Project Organization

```text
BPK_Community_Fund/
├── BackEnd/                         # Python FastAPI API & Database Engine
│   ├── database.py                  # MySQL connection settings
│   ├── database.sql                 # MySQL schema script
│   ├── init_db.py                   # Automated database and table builder
│   ├── main.py                      # FastAPI server entry point
│   ├── models.py                    # 13 SQLAlchemy ORM models
│   ├── routes.py                    # API route controllers
│   ├── schemas.py                   # Pydantic schemas
│   └── requirements.txt             # Python dependencies
│
├── FrontEnd/                        # Client Portals (HTML, CSS, JS)
│   ├── HomeLogRegisPass/            # Login, Registration & OTP
│   ├── Admin/                       # Admin management portal
│   └── Members/                     # Member dashboard & receipts
│
├── .gitignore                       # Repository shielding rules
├── BEGINNER_GUIDE.md                # 10-step master beginner guide
└── README.md                        # Project documentation
```

---

## 🔑 Default Credentials

- **Super Admin Email:** `admin@pbkfund.org` *(or `sai@gmail.com`)*
- **Super Admin Password:** `admin`
- **Default Database Name:** `pbk_db`

---

## 📄 License
This project is licensed under the MIT License.
