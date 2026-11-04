# ==============================================================================
# PBK COMMUNITY WELFARE FUND - DATABASE CONFIGURATION & CONNECTION
# File: BackEnd/database.py
# Purpose: MySQL database connection setup using SQLAlchemy ORM, engine creation,
#          session factory definition, and declarative base model instantiation.
# ==============================================================================

import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# ------------------------------------------------------------------------------
# 1. DATABASE CONNECTION URL
# Format: mysql+pymysql://<DB_USER>:<DB_PASSWORD>@<DB_HOST>:<DB_PORT>/<DB_NAME>
# Change 'root:root' to your own MySQL username:password if different!
# ------------------------------------------------------------------------------
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://root:root@localhost:3306/pbk_db")

# ------------------------------------------------------------------------------
# 2. SQLALCHEMY ENGINE
# Manages the database connection pool and executes SQL queries
# ------------------------------------------------------------------------------
engine = create_engine(
    DATABASE_URL,
    echo=True
)

# ------------------------------------------------------------------------------
# 3. SESSION FACTORY (SessionLocal)
# Yields independent DB session instances for each incoming HTTP request
# ------------------------------------------------------------------------------
SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

# ------------------------------------------------------------------------------
# 4. DECLARATIVE BASE
# Base class inherited by all SQLAlchemy ORM models (Member, Admin, Fund, etc.)
# ------------------------------------------------------------------------------
Base = declarative_base()