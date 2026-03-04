import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("school.db");

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS results (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_name TEXT NOT NULL,
      student_id TEXT NOT NULL,
      subject TEXT NOT NULL,
      assignment INTEGER DEFAULT 0,
      test INTEGER DEFAULT 0,
      ca INTEGER DEFAULT 0,
      exam INTEGER DEFAULT 0,
      total INTEGER DEFAULT 0,
      grade TEXT NOT NULL,
      term TEXT NOT NULL,
      session TEXT NOT NULL,
      class TEXT NOT NULL
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS admissions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fullName TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT,
      classApplied TEXT NOT NULL,
      previousSchool TEXT NOT NULL,
      address TEXT,
      appliedAt DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);
  console.log("Database initialized");
} catch (err) {
  console.error("DB Error:", err);
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.post("/api/login", (req, res) => {
    const { username, password } = req.body;
    if (username?.toUpperCase() === "CHARLES" && password === "CHARLES") {
      res.json({ success: true, token: "token" });
    } else {
      res.status(401).json({ success: false });
    }
  });

  app.post("/api/admission", (req, res) => {
    const { fullName, phone, email, classApplied, previousSchool, address } = req.body;
    const stmt = db.prepare("INSERT INTO admissions (fullName, phone, email, classApplied, previousSchool, address) VALUES (?, ?, ?, ?, ?, ?)");
    stmt.run(fullName, phone, email, classApplied, previousSchool, address);
    res.json({ success: true });
  });

  app.get("/api/results/search", (req, res) => {
    const { name, student_id } = req.query;
    let query = "SELECT * FROM results WHERE 1=1";
    const params = [];
    if (name) { query += " AND student_name LIKE ?"; params.push(`%${name}%`); }
    if (student_id) { query += " AND student_id = ?"; params.push(student_id); }
    res.json(db.prepare(query).all(...params));
  });

  app.post("/api/results/upload", (req, res) => {
    const { student_name, student_id, term, session, className, subjects } = req.body;
    const stmt = db.prepare("INSERT INTO results (student_name, student_id, subject, assignment, test, ca, exam, total, grade, term, session, class) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)");
    const insert = db.transaction((subs) => {
      for (const s of subs) stmt.run(student_name, student_id, s.subject, s.assignment, s.test, s.ca, s.exam, s.total, s.grade, term, session, className);
    });
    insert(subjects);
    res.json({ success: true });
  });

  app.get("/api/results/all", (req, res) => res.json(db.prepare("SELECT * FROM results ORDER BY id DESC").all()));
  app.delete("/api/results/:id", (req, res) => { db.prepare("DELETE FROM results WHERE id = ?").run(req.params.id); res.json({ success: true }); });

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => res.sendFile(path.resolve("dist/index.html")));
  }

  app.listen(3000, "0.0.0.0", () => console.log("Server running on port 3000"));
}
startServer();