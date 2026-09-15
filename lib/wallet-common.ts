import crypto from 'node:crypto';

export function walletSafeId(value:string){
  return value.replace(/[^A-Za-z0-9._-]/g,'_').slice(0,120);
}
export function hexToRgbString(hex:string|undefined|null,fallback='rgb(20,32,64)'){
  if(!hex||!/^#[0-9a-f]{6}$/i.test(hex))return fallback;
  const n=parseInt(hex.slice(1),16);return `rgb(${(n>>16)&255},${(n>>8)&255},${n&255})`;
}
export function pemFromEnv(name:string){
  const raw=process.env[name]; if(!raw)return null;
  if(raw.includes('BEGIN '))return raw.replace(/\\n/g,'\n');
  try{return Buffer.from(raw,'base64').toString('utf8');}catch{return null;}
}
export function stableWalletToken(...parts:string[]){
  const secret=process.env.WALLET_TOKEN_SECRET||process.env.AUTH_SECRET;
  if(!secret)throw new Error('WALLET_TOKEN_SECRET or AUTH_SECRET is required');
  return crypto.createHmac('sha256',secret).update(parts.join(':')).digest('hex');
}
