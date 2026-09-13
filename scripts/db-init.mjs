import dotenv from 'dotenv';
import fs from 'node:fs';
import postgres from 'postgres';

dotenv.config({path:'.env.local',quiet:true});
const url = process.env.DATABASE_URL;
if (!url) { console.error('DATABASE_URL fehlt.'); process.exit(1); }
const sql = postgres(url, { ssl: 'require', max: 1, prepare: false });
try {
  const schema = fs.readFileSync(new URL('../db/schema.sql', import.meta.url), 'utf8');
  await sql.unsafe(schema);
  console.log('Rezix-Datenbank wurde initialisiert.');
} finally { await sql.end({ timeout: 5 }); }
