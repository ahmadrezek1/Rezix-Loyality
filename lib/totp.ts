import crypto from 'node:crypto';
const alphabet='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
export function base32Encode(buf:Buffer){let bits=0,value=0,out='';for(const byte of buf){value=(value<<8)|byte;bits+=8;while(bits>=5){out+=alphabet[(value>>>(bits-5))&31];bits-=5}}if(bits>0)out+=alphabet[(value<<(5-bits))&31];return out}
export function base32Decode(s:string){let bits=0,value=0;const out:number[]=[];for(const ch of s.replace(/=|\s/g,'').toUpperCase()){const i=alphabet.indexOf(ch);if(i<0)continue;value=(value<<5)|i;bits+=5;if(bits>=8){out.push((value>>>(bits-8))&255);bits-=8}}return Buffer.from(out)}
export function generateTotpSecret(){return base32Encode(crypto.randomBytes(20))}
export function totpCode(secret:string,at=Date.now()){const counter=Math.floor(at/30000);const b=Buffer.alloc(8);b.writeBigUInt64BE(BigInt(counter));const h=crypto.createHmac('sha1',base32Decode(secret)).update(b).digest();const off=h[h.length-1]&15;const n=(h.readUInt32BE(off)&0x7fffffff)%1_000_000;return String(n).padStart(6,'0')}
export function verifyTotp(secret:string,code:string){const c=code.replace(/\s/g,'');if(!/^\d{6}$/.test(c))return false;for(const delta of [-30000,0,30000]){const expected=totpCode(secret,Date.now()+delta);if(crypto.timingSafeEqual(Buffer.from(c),Buffer.from(expected)))return true}return false}
export function otpauthUri(secret:string,label:string,issuer='Rezix'){return `otpauth://totp/${encodeURIComponent(issuer+':'+label)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=30`}
