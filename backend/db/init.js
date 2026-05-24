const { Pool } = require("pg");
const bcrypt = require("bcryptjs");

let pool = null;

function getDb() {
  if (!pool) throw new Error("DB not initialized");
  return pool;
}

// Helper to make pg work like our sql.js wrapper
function makeDb(pgPool) {
  return {
    _pool: pgPool,

    // Synchronous-style query (runs immediately, returns result)
    query(sql, params = []) {
      return pgPool.query(sql, params);
    },

    prepare(sql) {
      // Convert ? placeholders to $1, $2... for PostgreSQL
      let i = 0;
      const pgSql = sql.replace(/\?/g, () => `$${++i}`);

      return {
        async run(...args) {
          const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
          const result = await pgPool.query(pgSql, params);
          return { lastInsertRowid: result.rows[0]?.id || null, rowCount: result.rowCount };
        },
        async get(...args) {
          const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
          const result = await pgPool.query(pgSql, params);
          return result.rows[0] || undefined;
        },
        async all(...args) {
          const params = args.length === 1 && Array.isArray(args[0]) ? args[0] : args;
          const result = await pgPool.query(pgSql, params);
          return result.rows;
        }
      };
    },

    async exec(sql) {
      return pgPool.query(sql);
    },

    transaction(fn) {
      return async (...args) => {
        const client = await pgPool.connect();
        try {
          await client.query("BEGIN");
          const result = await fn(...args);
          await client.query("COMMIT");
          return result;
        } catch(e) {
          await client.query("ROLLBACK");
          throw e;
        } finally {
          client.release();
        }
      };
    }
  };
}

async function initDb() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL environment variable not set");

  const pgPool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }
  });

  pool = makeDb(pgPool);

  // Create tables
  await pgPool.query(`
    CREATE TABLE IF NOT EXISTS roles (
      id SERIAL PRIMARY KEY,
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
      id SERIAL PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      full_name TEXT,
      role_id INTEGER REFERENCES roles(id),
      assigned_area_id INTEGER,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS plant_info (
      id INTEGER PRIMARY KEY DEFAULT 1,
      package_name TEXT DEFAULT 'SWPGPL Plant',
      benchmark REAL DEFAULT 3.5,
      key_deliverable_no TEXT DEFAULT '3',
      grade TEXT DEFAULT 'Grade 3.5',
      sla_description TEXT DEFAULT 'As per agreed SLA (Grade 3.5)',
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS assessment_months (
      id SERIAL PRIMARY KEY,
      month_label TEXT NOT NULL,
      month_date TEXT NOT NULL,
      is_locked INTEGER DEFAULT 0,
      is_current INTEGER DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS areas (
      id SERIAL PRIMARY KEY,
      area_number INTEGER NOT NULL,
      area_name TEXT NOT NULL,
      in_charge TEXT DEFAULT '',
      display_order INTEGER,
      is_active INTEGER DEFAULT 1
    );

    CREATE TABLE IF NOT EXISTS sub_areas (
      id SERIAL PRIMARY KEY,
      area_id INTEGER NOT NULL REFERENCES areas(id),
      name TEXT NOT NULL,
      display_order INTEGER
    );

    CREATE TABLE IF NOT EXISTS ratings (
      id SERIAL PRIMARY KEY,
      month_id INTEGER NOT NULL REFERENCES assessment_months(id),
      area_id INTEGER NOT NULL REFERENCES areas(id),
      sub_area_id INTEGER REFERENCES sub_areas(id),
      week_number INTEGER NOT NULL,
      grade REAL,
      rated_by INTEGER REFERENCES users(id),
      rated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS remarks (
      id SERIAL PRIMARY KEY,
      month_id INTEGER NOT NULL REFERENCES assessment_months(id),
      area_id INTEGER NOT NULL REFERENCES areas(id),
      week_number INTEGER,
      remark_type TEXT NOT NULL,
      remark_text TEXT DEFAULT '',
      created_by INTEGER REFERENCES users(id),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `);

  await seedData(pgPool);
  console.log("PostgreSQL database ready.");
}

async function seedData(pgPool) {
  const existing = await pgPool.query("SELECT COUNT(*) as c FROM roles");
  if (parseInt(existing.rows[0].c) > 0) {
    console.log("Data already seeded.");
    return;
  }
  console.log("Seeding initial data...");

  await pgPool.query(`INSERT INTO roles (name,can_rate,can_view_penalties,can_add_remarks,can_export,can_manage_users,can_manage_settings,is_admin) VALUES ('Administrator',1,1,1,1,1,1,1)`);
  await pgPool.query(`INSERT INTO roles (name,can_rate,can_view_penalties,can_add_remarks,can_export,can_manage_users,can_manage_settings,is_admin) VALUES ('Viewer',0,1,0,1,0,0,0)`);
  await pgPool.query(`INSERT INTO roles (name,can_rate,can_view_penalties,can_add_remarks,can_export,can_manage_users,can_manage_settings,is_admin) VALUES ('Rater',1,0,1,0,0,0,0)`);

  const adminRole = await pgPool.query("SELECT id FROM roles WHERE name='Administrator'");
  const viewerRole = await pgPool.query("SELECT id FROM roles WHERE name='Viewer'");

  const adminHash = bcrypt.hashSync("admin123", 10);
  const viewerHash = bcrypt.hashSync("view123", 10);

  await pgPool.query("INSERT INTO users (username,password_hash,full_name,role_id) VALUES ($1,$2,$3,$4)", ["admin", adminHash, "Administrator", adminRole.rows[0].id]);
  await pgPool.query("INSERT INTO users (username,password_hash,full_name,role_id) VALUES ($1,$2,$3,$4)", ["viewer", viewerHash, "Viewer", viewerRole.rows[0].id]);
  await pgPool.query("INSERT INTO plant_info (id,package_name,benchmark,key_deliverable_no,grade,sla_description) VALUES (1,'SWPGPL Plant',3.5,'3','Grade 3.5','As per agreed SLA (Grade 3.5)') ON CONFLICT (id) DO NOTHING");

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

  for (let i = 0; i < areas.length; i++) {
    const a = areas[i];
    const aRes = await pgPool.query(
      "INSERT INTO areas (area_number,area_name,in_charge,display_order) VALUES ($1,$2,$3,$4) RETURNING id",
      [a.num, a.name, a.ic, i+1]
    );
    const areaId = aRes.rows[0].id;
    for (let j = 0; j < a.subs.length; j++) {
      await pgPool.query("INSERT INTO sub_areas (area_id,name,display_order) VALUES ($1,$2,$3)", [areaId, a.subs[j], j+1]);
    }
  }

  await pgPool.query("INSERT INTO assessment_months (month_label,month_date,is_current,is_locked) VALUES ($1,$2,$3,$4)", ["May 2026","2026-05-01",1,0]);
  console.log("Seed complete.");
}

function getPool() { return pool?._pool; }

module.exports = { getDb, initDb, getPool };