import { DatabaseSync } from "node:sqlite";
import { readFileSync, existsSync, mkdirSync } from "node:fs";
import { dirname, resolve } from "node:path";
import dotenv from "dotenv";

dotenv.config();

const DEFAULT_DB_PATH = resolve(process.cwd(), process.env.DATABASE_PATH || "./db/ajo.db");

class DatabaseClient {
  private db: DatabaseSync;

  constructor(dbPath: string = DEFAULT_DB_PATH) {
    const dir = dirname(dbPath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }

    this.db = new DatabaseSync(dbPath);
    // Enable WAL mode and foreign keys for high performance and integrity
    this.db.exec("PRAGMA journal_mode = WAL;");
    this.db.exec("PRAGMA foreign_keys = ON;");
  }

  public initSchema(schemaPath?: string): void {
    const path = schemaPath || resolve(process.cwd(), "./db/schema.sql");
    const sql = readFileSync(path, "utf-8");
    this.db.exec(sql);
  }

  public exec(sql: string): void {
    this.db.exec(sql);
  }

  public query<T = Record<string, unknown>>(sql: string, params: (string | number | bigint | null)[] = []): T[] {
    const stmt = this.db.prepare(sql);
    return stmt.all(...params) as T[];
  }

  public get<T = Record<string, unknown>>(sql: string, params: (string | number | bigint | null)[] = []): T | undefined {
    const stmt = this.db.prepare(sql);
    return stmt.get(...params) as T | undefined;
  }

  public run(sql: string, params: (string | number | bigint | null)[] = []): { lastInsertRowid: number | bigint; changes: number | bigint } {
    const stmt = this.db.prepare(sql);
    const result = stmt.run(...params);
    return {
      lastInsertRowid: result.lastInsertRowid,
      changes: result.changes,
    };
  }

  public transaction<T>(callback: () => T): T {
    this.db.exec("BEGIN TRANSACTION;");
    try {
      const result = callback();
      this.db.exec("COMMIT;");
      return result;
    } catch (error) {
      this.db.exec("ROLLBACK;");
      throw error;
    }
  }

  public close(): void {
    this.db.close();
  }
}

// Singleton database instance
export const db = new DatabaseClient();
export { DatabaseClient };
