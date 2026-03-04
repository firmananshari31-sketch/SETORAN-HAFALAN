import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";

const db = new Database("hafalan.db");

// Initialize database
db.exec(`
  CREATE TABLE IF NOT EXISTS hafalan_v3 (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_name TEXT NOT NULL,
    surah_name TEXT NOT NULL,
    start_ayat INTEGER NOT NULL,
    end_ayat INTEGER NOT NULL,
    date TEXT NOT NULL,
    grade TEXT NOT NULL
  )
`);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.get("/api/logs", (req, res) => {
    const logs = db.prepare("SELECT * FROM hafalan_v3 ORDER BY date ASC").all();
    res.json(logs);
  });

  app.post("/api/logs", (req, res) => {
    const { student_name, surah_name, start_ayat, end_ayat, date, grade } = req.body;
    db.prepare(`
      INSERT INTO hafalan_v3 (student_name, surah_name, start_ayat, end_ayat, date, grade)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(student_name, surah_name, start_ayat, end_ayat, date, grade);
    
    res.json({ success: true });
  });

  app.delete("/api/logs/:id", (req, res) => {
    db.prepare("DELETE FROM hafalan_v3 WHERE id = ?").run(req.params.id);
    res.json({ success: true });
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static("dist"));
    app.get("*", (req, res) => {
      res.sendFile(path.resolve("dist/index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
