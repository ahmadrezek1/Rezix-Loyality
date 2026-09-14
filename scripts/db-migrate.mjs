import dotenv from 'dotenv';
import fs from 'node:fs';
import postgres from 'postgres';
dotenv.config({path:'.env.local',quiet:true});
if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL fehlt');
const sql=postgres(process.env.DATABASE_URL,{ssl:'require',max:1,prepare:false,connect_timeout:10,onnotice:()=>{}});
const migrations=['migrate-multitenant.sql','migrate-security-v04.sql','migrate-roles-v041.sql','migrate-gdpr-v05.sql','migrate-auth-v06.sql','migrate-billing-v07.sql','migrate-email-otp-v074.sql','migrate-loyalty-designer-v080.sql','migrate-email-only-auth-v084.sql','migrate-v100.sql','migrate-customer-design-v101.sql','migrate-manager-verification-v102.sql'];
try {
 await sql.begin(async tx=>{
  await tx`select pg_advisory_xact_lock(731902401)`;
  await tx`create table if not exists rezix_migrations(name text primary key, applied_at timestamptz not null default now())`;
  for(const name of migrations){
   const applied=await tx`select 1 from rezix_migrations where name=${name}`;
   if(applied.length)continue;
   await tx.unsafe(fs.readFileSync(new URL('../db/'+name,import.meta.url),'utf8'));
   await tx`insert into rezix_migrations(name) values(${name})`;
   console.log('Applied '+name);
  }
 });
 console.log('Migration v1.0 complete.');
}finally{await sql.end({timeout:5})}
