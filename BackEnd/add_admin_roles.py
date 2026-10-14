import sys
from pathlib import Path

# Add BackEnd directory to sys.path
backend_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(backend_dir))

from database import engine
from sqlalchemy import inspect, text

def migrate():
    insp = inspect(engine)
    with engine.connect() as conn:
        admin_cols = [c['name'] for c in insp.get_columns('admins')]
        if 'role' not in admin_cols:
            conn.execute(text("ALTER TABLE admins ADD COLUMN role VARCHAR(50) DEFAULT 'Super Admin'"))
            conn.commit()
            print("Successfully added 'role' column to admins table.")
        else:
            print("'role' column already exists in admins table.")

        conn.execute(text("UPDATE admins SET role = 'Super Admin' WHERE role IS NULL OR role = '' OR id = 1"))
        conn.commit()

        inv_cols = [c['name'] for c in insp.get_columns('admin_invitations')]
        if 'role' not in inv_cols:
            conn.execute(text("ALTER TABLE admin_invitations ADD COLUMN role VARCHAR(50) DEFAULT 'Admin'"))
            conn.commit()
            print("Successfully added 'role' column to admin_invitations table.")
        else:
            print("'role' column already exists in admin_invitations table.")

        # Print all admins with their roles
        res = conn.execute(text("SELECT id, first_name, last_name, email, role FROM admins")).fetchall()
        print("Admins:", res)

if __name__ == '__main__':
    migrate()
