# ==============================================================================
# PBK COMMUNITY WELFARE FUND - DATABASE INITIALIZATION SCRIPT
# File: BackEnd/init_db.py
# Usage: python init_db.py
# Purpose: Automatically creates the MySQL 'pbk_db' database, builds all 13 tables
#          from SQLAlchemy ORM models, and optionally seeds initial starter data.
# ==============================================================================

import sys
import os
import pymysql
import bcrypt

# Ensure the BackEnd directory is in Python module search path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from database import engine, Base, SessionLocal
import models


def create_database_if_not_exists(host="localhost", user="root", password="root", port=3306, db_name="pbk_db"):
    """Connects to MySQL server without database specified to create the target database."""
    print("=" * 65)
    print(" 🛠️  PBK COMMUNITY WELFARE FUND - DATABASE INITIALIZER")
    print("=" * 65)
    print(f"Connecting to MySQL server at {host}:{port} as user '{user}'...")
    
    try:
        conn = pymysql.connect(
            host=host,
            user=user,
            password=password,
            port=port,
            charset="utf8mb4"
        )
        with conn.cursor() as cursor:
            cursor.execute(f"CREATE DATABASE IF NOT EXISTS `{db_name}` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;")
            print(f"✅ Database `{db_name}` verified / created successfully.")
        conn.close()
    except Exception as exc:
        print(f"❌ Failed to connect to MySQL: {exc}")
        print("\n💡 Tip: Make sure your MySQL service is running and credentials match database.py.")
        sys.exit(1)


def create_tables():
    """Generates all database tables defined in models.py via SQLAlchemy Base.metadata."""
    print("\nCreating all SQLAlchemy tables...")
    try:
        Base.metadata.create_all(bind=engine)
        print("✅ All tables created successfully!")
    except Exception as exc:
        print(f"❌ Error creating tables: {exc}")
        sys.exit(1)


def seed_initial_data():
    """Seeds default funds and a default super admin if the database is fresh."""
    db = SessionLocal()
    try:
        # 1. Seed Initial Admin if no admins exist
        admin_count = db.query(models.Admin).count()
        if admin_count == 0:
            print("\n👤 No admins found. Creating default Super Admin...")
            default_password = "admin"
            salt = bcrypt.gensalt()
            hashed_pwd = bcrypt.hashpw(default_password.encode("utf-8"), salt).decode("utf-8")
            
            default_admin = models.Admin(
                first_name="Super",
                last_name="Admin",
                gender="M",
                phone="9999999999",
                email="admin@pbkfund.org",
                role="Super Admin",
                password_hash=hashed_pwd,
                status="active"
            )
            db.add(default_admin)
            db.commit()
            print("✅ Default Super Admin created:")
            print("   Email:    admin@pbkfund.org")
            print("   Phone:    9999999999")
            print("   Password: admin (Please change this after first login!)")
        else:
            print(f"ℹ️  Existing admins found ({admin_count}). Skipping default admin creation.")

        # 2. Seed Initial Funds if none exist
        fund_count = db.query(models.Fund).count()
        if fund_count == 0:
            print("\n💰 Seeding starter active funds...")
            starter_funds = [
                models.Fund(financial_year="2026 - 2027", name="Youth Fund", target_amount=100000.00, status="Active"),
                models.Fund(financial_year="2026 - 2027", name="Village Fund", target_amount=100000.00, status="Active"),
                models.Fund(financial_year="2026 - 2027", name="General Fund", target_amount=100000.00, status="Active"),
            ]
            db.add_all(starter_funds)
            db.commit()
            print("✅ Default funds created ('Youth Fund', 'Village Fund', 'General Fund').")
        else:
            print(f"ℹ️  Existing funds found ({fund_count}). Skipping default fund seeding.")

    except Exception as exc:
        db.rollback()
        print(f"⚠️  Warning while checking seed data: {exc}")
    finally:
        db.close()


def print_summary():
    """Prints a neat summary table of all database tables and current row counts."""
    print("\n" + "=" * 65)
    print(f"{'TABLE NAME':<30} | {'ROW COUNT':<15}")
    print("-" * 65)
    
    table_names = [
        "admins", "admin_invitations", "members", "member_documents",
        "funds", "fund_usage", "causes", "contributions",
        "announcements", "activity_logs", "registration_otps",
        "password_reset_requests", "deleted_records"
    ]
    
    db = SessionLocal()
    try:
        from sqlalchemy import text
        for t in table_names:
            result = db.execute(text(f"SELECT COUNT(*) FROM `{t}`")).scalar()
            print(f"{t:<30} | {result:<15}")
    except Exception as exc:
        print(f"Error fetching counts: {exc}")
    finally:
        db.close()
    
    print("=" * 65)
    print("🎉 Database setup is 100% COMPLETE and ready for use!")
    print("=" * 65)


if __name__ == "__main__":
    create_database_if_not_exists()
    create_tables()
    seed_initial_data()
    print_summary()
