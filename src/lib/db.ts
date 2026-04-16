import Database from 'better-sqlite3';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

const dbPath = path.join(process.cwd(), 'procurement.db');
const db = new Database(dbPath);

export function initDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      full_name TEXT NOT NULL,
      role TEXT DEFAULT 'user',
      can_edit INTEGER DEFAULT 0
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL
    );

    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      client TEXT,
      budget REAL DEFAULT 0,
      status TEXT DEFAULT 'Active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS packages (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      name TEXT NOT NULL,
      description TEXT,
      category TEXT,
      origin TEXT DEFAULT 'Domestic',
      currency TEXT DEFAULT 'INR',
      current_stage TEXT DEFAULT 'Spec Received',
      rfq_float_date TEXT,
      award_date TEXT,
      award_value REAL,
      awarded_vendor_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS vendors (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      name TEXT NOT NULL,
      quoted_amount REAL DEFAULT 0,
      revised_amount REAL DEFAULT 0,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS remarks (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      text TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      name TEXT NOT NULL,
      size TEXT,
      type TEXT,
      uploaded_by TEXT NOT NULL,
      uploaded_at TEXT NOT NULL,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
      FOREIGN KEY (uploaded_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS audit_trail (
      id TEXT PRIMARY KEY,
      package_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      field TEXT NOT NULL,
      old_value TEXT,
      new_value TEXT,
      timestamp TEXT NOT NULL,
      FOREIGN KEY (package_id) REFERENCES packages(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
  `);

  // Migrate existing users if can_edit column is missing (SQLite doesn't support IF NOT EXISTS for columns)
  try {
    db.prepare("SELECT can_edit FROM users LIMIT 1").get();
  } catch (e) {
    db.exec("ALTER TABLE users ADD COLUMN can_edit INTEGER DEFAULT 0");
  }

  const count = db.prepare('SELECT count(*) as count FROM categories').get() as { count: number };
  if (count.count === 0) {
    const categories = ['Civil', 'Electrical', 'Mechanical', 'Instrumentation', 'Services'];
    const insert = db.prepare('INSERT OR IGNORE INTO categories (id, name) VALUES (?, ?)');
    categories.forEach(name => insert.run(uuidv4(), name));
  }
  
  const existingAdmin = db.prepare('SELECT * FROM users WHERE username = ?').get('admin') as any;
  if (!existingAdmin) {
    const salt = bcrypt.genSaltSync(10);
    const hashedPassword = bcrypt.hashSync('admin123', salt);
    const insertAdmin = db.prepare('INSERT INTO users (id, username, password, full_name, role, can_edit) VALUES (?, ?, ?, ?, ?, ?)');
    insertAdmin.run(uuidv4(), 'admin', hashedPassword, 'Admin User', 'admin', 1);
  } else if (existingAdmin.can_edit === 0) {
    db.prepare("UPDATE users SET can_edit = 1 WHERE username = 'admin'").run();
  }
}

export function toCamel(obj: any): any {
  if (Array.isArray(obj)) return obj.map(toCamel);
  if (obj !== null && typeof obj === 'object') {
    return Object.keys(obj).reduce((acc: any, key: string) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      acc[camelKey] = toCamel(obj[key]);
      return acc;
    }, {});
  }
  return obj;
}

export default db;
