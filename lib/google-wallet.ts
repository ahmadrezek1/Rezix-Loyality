import crypto from 'node:crypto';
import { walletSafeId } from './wallet-common';

type WalletCustomer={id:string;code:string;name:string;stamps:number;rewards_redeemed?:number};
type WalletBusiness={id:string;name:string;reward_target:number;reward_text:string;primary_color?:string|null;logo_url?:string|null};

function b64url(input:string|Buffer){return Buffer.from(input).toString('base64url')}
function credentials(){
 const issuerId=process.env.GOOGLE_WALLET_ISSUER_ID;
 const classSuffix=process.env.GOOGLE_WALLET_CLASS_SUFFIX||'rezix_loyalty_v1';
 const email=process.env.GOOGLE_WALLET_SERVICE_ACCOUNT_EMAIL;
 const key=(process.env.GOOGLE_WALLET_PRIVATE_KEY||'').replace(/\\n/g,'\n');
 if(!issuerId||!email||!key)return null;
 return {issuerId,classSuffix,email,key};
}
function signJwt(payload:Record<string,unknown>,key:string){
 const header=b64url(JSON.stringify({alg:'RS256',typ:'JWT'}));
 const body=b64url(JSON.stringify(payload));
 const unsigned=`${header}.${body}`;
 const sig=crypto.sign('RSA-SHA256',Buffer.from(unsigned),key).toString('base64url');
 return `${unsigned}.${sig}`;
}
function classId(businessId:string){
 const c=credentials();if(!c)throw new Error('Google Wallet not configured');
 return `${c.issuerId}.${walletSafeId(`${c.classSuffix}_${businessId}`)}`;
}
export function googleWalletConfigured(){return Boolean(credentials())}
export function googleObjectId(customerId:string){const c=credentials();if(!c)throw new Error('Google Wallet not configured');return `${c.issuerId}.${walletSafeId(customerId)}`}

async function accessToken(){
 const c=credentials();if(!c)throw new Error('Google Wallet not configured'); const now=Math.floor(Date.now()/1000);
 const assertion=signJwt({iss:c.email,scope:'https://www.googleapis.com/auth/wallet_object.issuer',aud:'https://oauth2.googleapis.com/token',iat:now,exp:now+3600},c.key);
 const r=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion}),cache:'no-store'});
 if(!r.ok){const detail=await r.text();throw new Error(`Google OAuth failed: ${r.status} ${detail.slice(0,300)}`)}
 return String((await r.json()).access_token);
}

function absoluteLogo(business:WalletBusiness,origin:string){
 try{if(business.logo_url)return new URL(business.logo_url,origin).toString()}catch{}
 return new URL('/icon-512.png',origin).toString();
}

async function ensureLoyaltyClass(business:WalletBusiness,origin:string,token:string){
 const id=classId(business.id); const endpoint=`https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass/${encodeURIComponent(id)}`;
 const existing=await fetch(endpoint,{headers:{authorization:`Bearer ${token}`},cache:'no-store'});
 if(existing.ok)return id;
 if(existing.status!==404){const detail=await existing.text();throw new Error(`Google Wallet class lookup failed: ${existing.status} ${detail.slice(0,300)}`)}
 const body={id,issuerName:business.name.slice(0,20),programName:`${business.name} Treueprogramm`,programLogo:{sourceUri:{uri:absoluteLogo(business,origin)}},accountNameLabel:'Mitglied',accountIdLabel:'Kundencode',reviewStatus:'UNDER_REVIEW',hexBackgroundColor:business.primary_color||'#142040',multipleDevicesAndHoldersAllowedStatus:'MULTIPLE_HOLDERS'};
 const created=await fetch('https://walletobjects.googleapis.com/walletobjects/v1/loyaltyClass',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
 if(!created.ok&&created.status!==409){const detail=await created.text();throw new Error(`Google Wallet class creation failed: ${created.status} ${detail.slice(0,500)}`)}
 return id;
}

function loyaltyObject(customer:WalletCustomer,business:WalletBusiness,resolvedClassId:string){
 return {id:googleObjectId(customer.id),classId:resolvedClassId,state:'ACTIVE',accountId:customer.code,accountName:customer.name,
  loyaltyPoints:{label:'Stempel',balance:{int:customer.stamps}},
  barcode:{type:'QR_CODE',value:customer.code,alternateText:customer.code},
  textModulesData:[{id:'reward',header:'Belohnung',body:business.reward_text},{id:'progress',header:'Fortschritt',body:`${customer.stamps} von ${business.reward_target} Stempeln`}]
 };
}

export async function googleSaveUrl(customer:WalletCustomer,business:WalletBusiness,origin:string){
 const c=credentials();if(!c)throw new Error('Google Wallet not configured');
 const token=await accessToken();
 const resolvedClassId=await ensureLoyaltyClass(business,origin,token);
 const jwt=signJwt({iss:c.email,aud:'google',typ:'savetowallet',iat:Math.floor(Date.now()/1000),origins:[origin],payload:{loyaltyObjects:[loyaltyObject(customer,business,resolvedClassId)]}},c.key);
 return `https://pay.google.com/gp/v/save/${jwt}`;
}

export async function syncGoogleWallet(customer:WalletCustomer,business:WalletBusiness,origin?:string){
 if(!googleWalletConfigured())return;
 const token=await accessToken();
 const resolvedClassId=await ensureLoyaltyClass(business,origin||process.env.NEXT_PUBLIC_APP_URL||'https://rezix.at',token);
 const id=encodeURIComponent(googleObjectId(customer.id));
 const body={classId:resolvedClassId,loyaltyPoints:{label:'Stempel',balance:{int:customer.stamps}},barcode:{type:'QR_CODE',value:customer.code,alternateText:customer.code},textModulesData:[{id:'reward',header:'Belohnung',body:business.reward_text},{id:'progress',header:'Fortschritt',body:`${customer.stamps} von ${business.reward_target} Stempeln`}]};
 const r=await fetch(`https://walletobjects.googleapis.com/walletobjects/v1/loyaltyObject/${id}`,{method:'PATCH',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},body:JSON.stringify(body),cache:'no-store'});
 // 404 is expected until the customer saves the object for the first time.
 if(!r.ok&&r.status!==404){const detail=await r.text();throw new Error(`Google Wallet update failed: ${r.status} ${detail.slice(0,300)}`)}
}
