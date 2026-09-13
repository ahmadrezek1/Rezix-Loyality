import dotenv from 'dotenv';
import fs from 'node:fs';
import postgres from 'postgres';
dotenv.config({path:'.env.local',quiet:true});
const url=process.env.DATABASE_URL;if(!url){console.error('DATABASE_URL fehlt.');process.exit(1)}
const sql=postgres(url,{ssl:'require',max:1,prepare:false});
try{
  for (const file of ['../db/migrate-multitenant.sql','../db/migrate-security-v04.sql','../db/migrate-roles-v041.sql','../db/migrate-gdpr-v05.sql','../db/migrate-auth-v06.sql','../db/migrate-billing-v07.sql','../db/migrate-email-otp-v074.sql','../db/migrate-loyalty-designer-v080.sql','../db/migrate-email-only-auth-v084.sql']) {
    const migration=fs.readFileSync(new URL(file,import.meta.url),'utf8');
    await sql.unsafe(migration);
  }
  console.log('Rezix Migration bis v0.8.4 wurde erfolgreich ausgeführt.');
}finally{await sql.end({timeout:5})}
