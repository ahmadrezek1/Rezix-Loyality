'use client';
import { QRCodeSVG } from 'qrcode.react';
export default function MfaQr({value}:{value:string}){return <div className="mfa-qr"><QRCodeSVG value={value} size={190} bgColor="#fff" fgColor="#111"/></div>}
