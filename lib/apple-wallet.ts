import { PKPass } from 'passkit-generator';
import sharp from 'sharp';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { createHash, X509Certificate, createPrivateKey } from 'node:crypto';
import type { Business } from './store';

const required=['APPLE_WALLET_PASS_TYPE_ID','APPLE_WALLET_TEAM_ID','APPLE_WALLET_CERT_BASE64','APPLE_WALLET_KEY_BASE64','APPLE_WALLET_WWDR_BASE64','NEXT_PUBLIC_APP_URL'];
export function walletAvailable(){return process.env.APPLE_WALLET_ENABLED==='true'&&required.every(key=>!!process.env[key]?.trim());}
function credentials(){
 if(!walletAvailable())throw new Error('Wallet is not configured');
 const signerCert=Buffer.from(process.env.APPLE_WALLET_CERT_BASE64!,'base64');
 const signerKey=Buffer.from(process.env.APPLE_WALLET_KEY_BASE64!,'base64');
 const wwdr=Buffer.from(process.env.APPLE_WALLET_WWDR_BASE64!,'base64');
 const signerKeyPassphrase=process.env.APPLE_WALLET_KEY_PASSPHRASE;
 const cert=new X509Certificate(signerCert);
 const fields=cert.subject.split('\n');
 if(!fields.includes(`UID=${process.env.APPLE_WALLET_PASS_TYPE_ID}`)||!fields.includes(`OU=${process.env.APPLE_WALLET_TEAM_ID}`))throw new Error('Wallet certificate identity mismatch');
 if(Date.now()<Date.parse(cert.validFrom)||Date.now()>=Date.parse(cert.validTo))throw new Error('Wallet certificate is not valid');
 if(!cert.checkPrivateKey(createPrivateKey({key:signerKey,passphrase:signerKeyPassphrase})))throw new Error('Wallet certificate key mismatch');
 if(!cert.verify(new X509Certificate(wwdr).publicKey))throw new Error('Wallet intermediate certificate mismatch');
 return {signerCert,signerKey,wwdr,signerKeyPassphrase};
}
export function walletColor(hex:string,fallback='#2563EB'){
 const value=/^#[0-9a-f]{6}$/i.test(hex)?hex:fallback;
 return `rgb(${parseInt(value.slice(1,3),16)}, ${parseInt(value.slice(3,5),16)}, ${parseInt(value.slice(5,7),16)})`;
}
// Stable membership identity: current stamps/rewards stay on the authenticated web card.
// Do not embed a balance that would become stale without Apple's update service.
export function walletIdentity(businessId:string,customerId:string){return createHash('sha256').update(JSON.stringify([businessId,customerId])).digest('hex');}
async function logoImage(url:string|null){
 if(!url||!process.env.SUPABASE_URL)return null;
 const target=new URL(url),base=new URL(process.env.SUPABASE_URL);
 if(target.protocol!=='https:'||target.origin!==base.origin||!target.pathname.startsWith('/storage/v1/object/public/rezix-assets/'))return null;
 const response=await fetch(target,{redirect:'error',signal:AbortSignal.timeout(6000)});
 if(!response.ok||Number(response.headers.get('content-length')||0)>2097152)return null;
 const reader=response.body?.getReader();if(!reader)return null;
 const chunks:Uint8Array[]=[];let length=0;
 try{while(true){const part=await reader.read();if(part.done)break;length+=part.value.length;if(length>2097152){await reader.cancel();return null;}chunks.push(part.value);}}finally{reader.releaseLock();}
 return sharp(Buffer.concat(chunks),{limitInputPixels:16000000}).resize(320,100,{fit:'inside',withoutEnlargement:true}).png().toBuffer();
}
export async function createWalletPass(business:Business,customer:{id:string;name:string;code:string}){
 const certs=credentials();
 const origin=new URL(process.env.NEXT_PUBLIC_APP_URL!).origin;
 if(!origin.startsWith('https://'))throw new Error('Wallet requires HTTPS');
 const icon=await readFile(path.join(process.cwd(),'public','icon-192.png'));
 const files:Record<string,Buffer>={
  'icon.png':await sharp(icon).resize(29,29).png().toBuffer(),
  'icon@2x.png':await sharp(icon).resize(58,58).png().toBuffer(),
  'icon@3x.png':await sharp(icon).resize(87,87).png().toBuffer()
 };
 const logo=await logoImage(business.logoUrl).catch(()=>null);
 if(logo){files['logo@2x.png']=logo;files['logo.png']=await sharp(logo).resize({width:160}).png().toBuffer();}
 const bg=business.customerDesign.color||business.primaryColor;
 const rgb=[1,3,5].map(i=>parseInt(bg.slice(i,i+2),16));
 const foreground=(rgb[0]*299+rgb[1]*587+rgb[2]*114)/1000>150?'#172B47':'#FFFFFF';
 const pass=new PKPass(files,certs,{
  formatVersion:1,passTypeIdentifier:process.env.APPLE_WALLET_PASS_TYPE_ID!,teamIdentifier:process.env.APPLE_WALLET_TEAM_ID!,
  serialNumber:walletIdentity(business.id,customer.id),organizationName:business.name,
  description:`Digitale Kundenkarte · ${business.name}`,logoText:business.name,
  backgroundColor:walletColor(bg),foregroundColor:walletColor(foreground),labelColor:walletColor(foreground),
  sharingProhibited:true
 });
 pass.type='storeCard';
 pass.primaryFields.push({key:'member',label:business.cardTitle,value:customer.name});
 pass.secondaryFields.push({key:'membership',label:'KUNDENKARTE',value:customer.code});
 pass.backFields.push({key:'current-card',label:'AKTUELLER STEMPELSTAND & BELOHNUNG',value:`${origin}/s/${encodeURIComponent(business.slug)}`});
 pass.backFields.push({key:'instructions',label:'SO FUNKTIONIERT ES',value:'Zeige diesen QR-Code beim Besuch. Den aktuellen Stempelstand und deine Belohnung findest du in deiner digitalen Kundenkarte. Die Wallet-Karte dient als Mitgliedsausweis.'});
 pass.setBarcodes({format:'PKBarcodeFormatQR',message:customer.code,messageEncoding:'iso-8859-1',altText:customer.code});
 return pass.getAsBuffer();
}
