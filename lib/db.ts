import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

let dbInstance: Database | null = null;
const dbPath = path.join(process.cwd(), 'kapunyito.db');

export async function getDb(): Promise<Database> {
  if (!dbInstance) {
    // Kifejezetten megadjuk a node_modules-ban lévő WASM fájl elérését
    const wasmPath = path.join(
      process.cwd(),
      'node_modules',
      'sql.js',
      'dist',
      'sql-wasm.wasm'
    );

    const SQL = await initSqlJs({
      locateFile: () => wasmPath,
    });

    if (fs.existsSync(dbPath)) {
      const filebuffer = fs.readFileSync(dbPath);
      dbInstance = new SQL.Database(filebuffer);
    } else {
      dbInstance = new SQL.Database();
    }
  }
  return dbInstance;
}

export function saveDb(db: Database) {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(dbPath, buffer);
}