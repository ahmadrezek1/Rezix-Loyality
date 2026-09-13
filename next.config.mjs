/** @type {import('next').NextConfig} */
const securityHeaders=[
 {key:'X-Content-Type-Options',value:'nosniff'},
 {key:'X-Frame-Options',value:'DENY'},
 {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
 {key:'Permissions-Policy',value:'camera=(self), microphone=(), geolocation=()'},
 {key:'Cross-Origin-Opener-Policy',value:'same-origin'},
 {key:'Content-Security-Policy',value:"default-src 'self'; img-src 'self' data: https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"}
];
const nextConfig={reactStrictMode:true,async headers(){return [{source:'/:path*',headers:securityHeaders}]}};
export default nextConfig;
