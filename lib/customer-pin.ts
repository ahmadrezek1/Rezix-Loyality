import crypto from 'node:crypto';
const pepper=(v:string)=>`${v}:${process.env.REZIX_SESSION_SECRET||''}`;
export function createCustomerPin(pin:string){if(!/^\d{4}$/.test(pin))throw new Error('Invalid PIN');const salt=crypto.randomBytes(16).toString('hex');return {salt,hash:crypto.scryptSync(pepper(pin),salt,32).toString('hex')};}
export function verifyCustomerPin(pin:string,salt:string,expected:string){if(!/^\d{4}$/.test(pin)||!salt||!expected)return false;const actual=crypto.scryptSync(pepper(pin),salt,32);const exp=Buffer.from(expected,'hex');return exp.length===actual.length&&crypto.timingSafeEqual(actual,exp);}
