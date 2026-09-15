import postgres from 'postgres';
const shared=globalThis as typeof globalThis & {rezixDatabase?:ReturnType<typeof postgres>};
export function database(){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL fehlt');
 // Keep one shared pool per server instance. The size is configurable so production can
 // match the database connection budget instead of queueing behind only two sockets.
 const configured=Number.parseInt(process.env.REZIX_DB_POOL_MAX||'5',10);
 const max=Number.isFinite(configured)?Math.max(2,Math.min(20,configured)):5;
 return shared.rezixDatabase??=postgres(process.env.DATABASE_URL,{ssl:'require',max,idle_timeout:20,connect_timeout:10,prepare:false});
}
