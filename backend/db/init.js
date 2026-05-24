const initSqlJs = require("sql.js");
const bcrypt = require("bcryptjs");
const path = require("path");
const fs = require("fs");

const DB_PATH = path.join(__dirname, "../data/saiwardha.db");
let db = null;
let saveTimer = null;

function scheduleSave() {
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(persistDb, 400);
}

function persistDb() {
  if (!db) return;
  try {
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(DB_PATH, Buffer.from(db._raw.export()));
  } catch(e) { console.error("persist error:", e.message); }
}

function normalizeArgs(args) {
  if (args.length === 0) return [];
  if (args.length === 1 && Array.isArray(args[0])) return args[0];
  return args;
}

function makeProxy(rawDb) {
  return {
    _raw: rawDb,

    prepare(sql) {
      const isWrite = /^\s*(INSERT|UPDATE|DELETE|ALTER|DROP)/i.test(sql);
      return {
        run(...args) {
          try {
            const stmt = rawDb.prepare(sql);
            const params = normalizeArgs(args);
            if (params.length > 0) stmt.bind(params);
            stmt.step();
            stmt.free();
            const res = rawDb.exec("SELECT last_insert_rowid()");
            const lastId = res[0]?.values?.[0]?.[0] ?? null;
            if (isWrite) scheduleSave();
            return { lastInsertRowid: lastId };
          } catch(e) {
            console.error("DB run error:", e.message, "SQL:", sql.trim().substring(0,80));
            throw e;
          }
        },
        get(...args) {
          try {
            const stmt = rawDb.prepare(sql);
            const params = normalizeArgs(args);
            if (params.length > 0) stmt.bind(params);
            let result = undefined;
            if (stmt.step()) result = stmt.getAsObject();
            stmt.free();
            return result;
          } catch(e) {
            console.error("DB get error:", e.message, "SQL:", sql.trim().substring(0,80));
            throw e;
          }
        },
        all(...args) {
          try {
            const stmt = rawDb.prepare(sql);
            const params = normalizeArgs(args);
            if (params.length > 0) stmt.bind(params);
            const results = [];
            while (stmt.step()) results.push(stmt.getAsObject());
            stmt.free();
            return results;
          } catch(e) {
            console.error("DB all error:", e.message, "SQL:", sql.trim().substring(0,80));
            throw e;
          }
        }
      };
    },

    exec(sql) {
      const isWrite = /^\s*(INSERT|UPDATE|DELETE|ALTER|DROP)/i.test(sql);
      try {
        const result = rawDb.exec(sql);
        if (isWrite) scheduleSave();
        return result;
      } catch(e) {
        console.error("DB exec error:", e.message, "SQL:", sql.trim().substring(0,80));
        throw e;
      }
    },

    transaction(fn) {
      return (...args) => {
        rawDb.exec("BEGIN");
        try {
          const result = fn(...args);
          rawDb.exec("COMMIT");
          scheduleSave();
          return result;
        } catch(e) {
          try { rawDb.exec("ROLLBACK"); } catch {}
          throw e;
        }
      };
    }
  };
}

async function initDb() {
  const SQL = await initSqlJs();
  const dir = path.dirname(DB_PATH);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  let rawDb;
  if (fs.existsSync(DB_PATH)) {
    console.log("Loading existing database...");
    rawDb = new SQL.Database(fs.readFileSync(DB_PATH));
  } else {
    console.log("Creating new database...");
    rawDb = new SQL.Database();
  }
  db = makeProxy(rawDb);

  db.exec(`
    CREATE TABLE IF NOT EXISTS roles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      can_rate INTEGER DEFAULT 0,
      can_view_penalties INTEGER DEFAULT 0,
      can_add_remarks INTEGER DEFAULT 0,
      can_export INTEGER DEFAULT 0,
      can_manage_users INTEGER DEFAULT 0,
      can_manage_settings INTEGER DEFAULT 0,
      is_admin INTEGER DEFAULT 0
    );
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role_id INTEGER,
      assigned_area_id INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS plant_info (
      id INTEGER PRIMARY KEY,
      package_name TEXT DEFAULT 'SWPGPL Plant',
      benchmark REAL DEFAULT 3.5,
      key_deliverable_no TEXT DEFAULT '3',
      grade TEXT DEFAULT 'Grade 3.5',
      sla_description TEXT DEFAULT 'As per agreed SLA (Grade 3.5)',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS assessment_months (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month_label TEXT NOT NULL,
      month_date TEXT NOT NULL,
      is_locked INTEGER DEFAULT 0,
      is_current INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area_number INTEGER NOT NULL,
      area_name TEXT NOT NULL,
      in_charge TEXT DEFAULT '',
      display_order INTEGER,
      is_active INTEGER DEFAULT 1
    );
    CREATE TABLE IF NOT EXISTS sub_areas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area_id INTEGER NOT NULL,
      name TEXT NOT NULL,
      display_order INTEGER
    );
    CREATE TABLE IF NOT EXISTS ratings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month_id INTEGER NOT NULL,
      area_id INTEGER NOT NULL,
      sub_area_id INTEGER,
      week_number INTEGER NOT NULL,
      grade REAL,
      rated_by INTEGER,
      rated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
    CREATE TABLE IF NOT EXISTS remarks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      month_id INTEGER NOT NULL,
      area_id INTEGER NOT NULL,
      week_number INTEGER,
      remark_type TEXT NOT NULL,
      remark_text TEXT DEFAULT '',
      created_by INTEGER,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );
  `);

  seedData();

  // Migrations for existing databases
  try { db.exec("ALTER TABLE users ADD COLUMN assigned_area_id INTEGER"); } catch {}

  persistDb();
  console.log("Database ready.");
}

function seedData() {
  const existing = db.prepare("SELECT COUNT(*) as c FROM roles").get();
  if (existing && existing.c > 0) {
    console.log("Data already seeded, skipping.");
    return;
  }
  console.log("Seeding initial data...");

  db.prepare("INSERT INTO roles (name,can_rate,can_view_penalties,can_add_remarks,can_export,can_manage_users,can_manage_settings,is_admin) VALUES (?,?,?,?,?,?,?,?)").run("Administrator",1,1,1,1,1,1,1);
  db.prepare("INSERT INTO roles (name,can_rate,can_view_penalties,can_add_remarks,can_export,can_manage_users,can_manage_settings,is_admin) VALUES (?,?,?,?,?,?,?,?)").run("Viewer",0,1,0,1,0,0,0);
  db.prepare("INSERT INTO roles (name,can_rate,can_view_penalties,can_add_remarks,can_export,can_manage_users,can_manage_settings,is_admin) VALUES (?,?,?,?,?,?,?,?)").run("Rater",1,0,1,0,0,0,0);

  const adminRole = db.prepare("SELECT id FROM roles WHERE name=?").get("Administrator");
  const viewerRole = db.prepare("SELECT id FROM roles WHERE name=?").get("Viewer");

  db.prepare("INSERT OR IGNORE INTO users (username,password_hash,full_name,role_id) VALUES (?,?,?,?)").run(
    "admin", bcrypt.hashSync("admin123", 10), "Administrator", adminRole.id
  );
  db.prepare("INSERT OR IGNORE INTO users (username,password_hash,full_name,role_id) VALUES (?,?,?,?)").run(
    "viewer", bcrypt.hashSync("view123", 10), "Viewer", viewerRole.id
  );

  db.exec("INSERT OR IGNORE INTO plant_info (id,package_name,benchmark,key_deliverable_no,grade,sla_description) VALUES (1,'SWPGPL Plant',3.5,'3','Grade 3.5','As per agreed SLA (Grade 3.5)')");

  const areas = [
    {num:1,name:"Boiler upto 9 mtr Area",ic:"Mr. Manoj Binzade",subs:["0 Mtr","4.5 Mtr","9 Mtr","Firing Floor","9 Mtr Passage","Above 9 Mtr","Trench near IBD Tank","Feeder Staircase","Feeder Floor"]},
    {num:2,name:"Mill Area",ic:"",subs:["0 Mtr - Front side","4.5 Mtr","Classifier","Mill Passage 0 Mtr-Backside","SSCX & DC Area","Bottom ash hopper passage area"]},
    {num:3,name:"ID Fan",ic:"",subs:["ID Fan area"]},
    {num:4,name:"ESP",ic:"",subs:["0 Mtr","4.5 Mtr","Trench infront of ESP","ESP top area"]},
    {num:5,name:"SILO",ic:"",subs:["0 Mtr","4.5 Mtr","Silo Top area"]},
    {num:6,name:"TG",ic:"",subs:["0 Mtr","4.5 Mtr","9 Mtr","Generator cooler floor","PH 1 Concentator/ Ash water pump","PH 2 Concentator/ Ash water pump","Dearator Floor"]},
    {num:7,name:"FOPH",ic:"",subs:["FOPH","Aux Boiler","CW pump house & pit","All Unit CT Fan"]},
    {num:8,name:"WTP",ic:"Mr. P. K. Giri",subs:[]},
    {num:9,name:"CHP, Weigh Bridge, Bunker Floor",ic:"Mr. Nandkishor Bhirange",subs:[]},
    {num:10,name:"Chimney 2",ic:"Mr. Mayur T",subs:[]},
    {num:11,name:"Plant Road / Drain Cleaning",ic:"Mr. P. Pote",subs:[]},
    {num:12,name:"Admin B, Stores, OHC, Canteen",ic:"Mr. Ashish U",subs:[]},
    {num:13,name:"TG Building- 0mtr",ic:"Mr. Manish B",subs:[]},
    {num:14,name:"TG Building- 4.5 mtr",ic:"",subs:[]},
    {num:15,name:"HVAC",ic:"",subs:[]},
    {num:16,name:"DCS & PLC Panel",ic:"Mr. Shirish L",subs:[]},
    {num:17,name:"Transformer area, Switchyard area and All elec Panel room",ic:"Mr. Kalyan P",subs:[]},
    {num:18,name:"Fire Pump House, Raw Water Pump House",ic:"Mr. Ritesh",subs:[]},
    {num:19,name:"Chimney 1",ic:"Mr. Arvind",subs:[]},
    {num:20,name:"Main Gate to Sez Gate",ic:"Mr. Kharkar",subs:[]}
  ];

  areas.forEach((a, i) => {
    db.prepare("INSERT INTO areas (area_number,area_name,in_charge,display_order) VALUES (?,?,?,?)").run(a.num, a.name, a.ic, i + 1);
    const areaRow = db.prepare("SELECT id FROM areas WHERE area_number=?").get(a.num);
    a.subs.forEach((s, j) => {
      db.prepare("INSERT INTO sub_areas (area_id,name,display_order) VALUES (?,?,?)").run(areaRow.id, s, j + 1);
    });
  });

  db.prepare("INSERT INTO assessment_months (month_label,month_date,is_current,is_locked) VALUES (?,?,?,?)").run("April 2026", "2026-04-01", 1, 0);
  console.log("Seed complete.");
}

function getDb() {
  if (!db) throw new Error("DB not initialized. Call initDb() first.");
  return db;
}

module.exports = { getDb, initDb, persistDb };