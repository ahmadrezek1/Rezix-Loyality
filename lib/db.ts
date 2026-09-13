import postgres from 'postgres';
let client:ReturnType<typeof postgres>|undefined;
export function database(){
 if(!process.env.DATABASE_URL)throw new Error('DATABASE_URL fehlt');
 return client??=postgres(process.env.DATABASE_URL,{ssl:'require',max:5,idle_timeout:20,connect_timeout:10,prepare:false});
}
