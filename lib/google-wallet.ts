import { createHash, createPrivateKey, sign } from 'node:crypto';
import type { Business } from './store';

export function googleWalletAvailable(){return process.env.GOOGLE_WALLET_ENABLED==='true'&&['GOOGLE_WALLET_ISSUER_ID','GOOGLE_WALLET_CLIENT_EMAIL','GOOGLE_WALLET_KEY_BASE64','NEXT_PUBLIC_APP_URL'].every(key=>!!process.env[key]?.trim());}
const localized=(value:string)=>({defaultValue:{language:'de',value}});
const identity=(...parts:string[])=>createHash('sha256').update(JSON.stringify(parts)).digest('hex');
function publicImage(value:string|null){
 if(!value||!process.env.SUPABASE_URL)return undefined;
 try{const url=new URL(value);return url.protocol==='https:'&&url.origin===new URL(process.env.SUPABASE_URL).origin&&url.pathname.startsWith('/storage/v1/object/public/rezix-assets/')?url.href:undefined;}catch{return undefined;}
}
export function googleWalletPayload(business:Business,customer:{id:string;name:string;code:string}){
 const issuer=process.env.GOOGLE_WALLET_ISSUER_ID!;
 if(!/^\d+$/.test(issuer))throw new Error('Invalid issuer ID');
 const origin=new URL(process.env.NEXT_PUBLIC_APP_URL!);
 if(origin.protocol!=='https:')throw new Error('Wallet requires HTTPS');
 const classId=`${issuer}.${identity(business.id)}`;
 const logo=publicImage(business.logoUrl)||`${origin.origin}/icon-192.png`;
 const hero=business.customerDesign.mode==='image'?publicImage(business.customerDesign.imageUrl):undefined;
 return {genericClasses:[{id:classId}],genericObjects:[{
  id:`${issuer}.${identity(business.id,customer.id)}`,classId,state:'ACTIVE',genericType:'GENERIC_LOYALTY_CARD',
  cardTitle:localized(business.name),header:localized(customer.name),subheader:localized(business.cardTitle),
  hexBackgroundColor:/^#[0-9a-f]{6}$/i.test(business.customerDesign.color)?business.customerDesign.color:business.primaryColor,
  logo:{sourceUri:{uri:logo},contentDescription:localized(business.name)},
  ...(hero?{heroImage:{sourceUri:{uri:hero},contentDescription:localized('Kartendesign')}}:{}),
  barcode:{type:'QR_CODE',value:customer.code,alternateText:customer.code},
  textModulesData:[{id:'membership',header:'Mitgliedskarte',body:'Zeige den QR-Code beim Besuch. Deinen aktuellen Stempelstand und deine Belohnung findest du auf deiner digitalen Kundenkarte.'}],
  linksModuleData:{uris:[{id:'current-card',uri:`${origin.origin}/s/${encodeURIComponent(business.slug)}`,description:'Aktueller Stempelstand & Belohnung'}]}
 }]};
}
export function createGoogleWalletLink(business:Business,customer:{id:string;name:string;code:string}){
 if(!googleWalletAvailable())throw new Error('Google Wallet is not configured');
 const claims={iss:process.env.GOOGLE_WALLET_CLIENT_EMAIL,aud:'google',typ:'savetowallet',iat:Math.floor(Date.now()/1000),origins:[new URL(process.env.NEXT_PUBLIC_APP_URL!).hostname],payload:googleWalletPayload(business,customer)};
 const encode=(value:unknown)=>Buffer.from(JSON.stringify(value)).toString('base64url');
 const body=`${encode({alg:'RS256',typ:'JWT'})}.${encode(claims)}`;
 const key=createPrivateKey(Buffer.from(process.env.GOOGLE_WALLET_KEY_BASE64!,'base64'));
 if(key.asymmetricKeyType!=='rsa')throw new Error('Google Wallet requires an RSA key');
 return `https://pay.google.com/gp/v/save/${body}.${sign('RSA-SHA256',Buffer.from(body),key).toString('base64url')}`;
}
