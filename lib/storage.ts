import crypto from 'node:crypto';
const BUCKET='rezix-assets';
function config(){const url=(process.env.SUPABASE_URL||'').replace(/\/$/,'');const key=process.env.SUPABASE_SERVICE_ROLE_KEY||'';if(!url||!key) throw new Error('SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY fehlt');return {url,key}}
async function ensureBucket(){const {url,key}=config();const headers={Authorization:`Bearer ${key}`,apikey:key};const r=await fetch(`${url}/storage/v1/bucket/${BUCKET}`,{headers,cache:'no-store'});if(r.ok)return;if(r.status!==404)throw new Error(`Storage bucket check failed (${r.status})`);const c=await fetch(`${url}/storage/v1/bucket`,{method:'POST',headers:{...headers,'content-type':'application/json'},body:JSON.stringify({id:BUCKET,name:BUCKET,public:true,file_size_limit:2097152,allowed_mime_types:['image/png','image/jpeg','image/webp']})});if(!c.ok)throw new Error(`Storage bucket creation failed (${c.status})`)}
export async function uploadSalonAsset(file:File,path:string){
 if(!file||file.size===0)return null;
 if(file.size>2*1024*1024)throw new Error('Datei ist größer als 2 MB');
 const extensions:Record<string,string>={'image/png':'png','image/jpeg':'jpg','image/webp':'webp'};
 const ext=extensions[file.type];if(!ext||! /^[a-z0-9-]+\/(logo|stamp|background)$/.test(path))throw new Error('Ungültiges Bildformat oder Pfad');
 const bytes=Buffer.from(await file.arrayBuffer());
 const valid=file.type==='image/png'?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])):file.type==='image/jpeg'?bytes.length>3&&bytes[0]===255&&bytes[1]===216&&bytes[2]===255:bytes.subarray(0,4).toString()==='RIFF'&&bytes.subarray(8,12).toString()==='WEBP';
 if(!valid)throw new Error('Dateiinhalt passt nicht zum Bildformat');
 await ensureBucket();const {url,key}=config();const objectPath=`${path}-${crypto.randomBytes(8).toString('hex')}.${ext}`;
 const r=await fetch(`${url}/storage/v1/object/${BUCKET}/${objectPath}`,{method:'POST',headers:{Authorization:`Bearer ${key}`,apikey:key,'content-type':file.type},body:bytes});
 if(!r.ok)throw new Error(`Upload failed (${r.status})`);
 return `${url}/storage/v1/object/public/${BUCKET}/${objectPath}`;
}
