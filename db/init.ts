import { db } from "./client.js";

export function initializeDatabase(): void {
  console.log("📦 Initializing AjoClub SQLite database...");
  db.initSchema();
  console.log("✅ Database schema initialized successfully.");
}

// Auto-run if executed directly via CLI
if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("init.ts")) {
  initializeDatabase();
}
