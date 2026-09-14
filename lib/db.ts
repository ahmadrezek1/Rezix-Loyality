import postgres from 'postgres';
const shared=globalThis as typeof globalThis & {rezixDatabase?:ReturnType<typeof postgres>};
export function database(){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL fehlt');
 // One small pool shared by auth, billing and dashboard queries in each instance.
 return shared.rezixDatabase??=postgres(process.env.DATABASE_URL,{ssl:'require',max:2,idle_timeout:5,connect_timeout:10,prepare:false});
}
