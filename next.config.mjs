/** @type {import('next').NextConfig} */
const securityHeaders=[
 {key:'X-Content-Type-Options',value:'nosniff'},
 {key:'X-Frame-Options',value:'DENY'},
 {key:'Referrer-Policy',value:'strict-origin-when-cross-origin'},
 {key:'Permissions-Policy',value:'camera=(self), microphone=(), geolocation=()'},
 {key:'Cross-Origin-Opener-Policy',value:'same-origin'},
 {key:'Content-Security-Policy',value:`default-src 'self'; img-src 'self' data: blob: https:; media-src 'self' https:; style-src 'self' 'unsafe-inline'; script-src 'self' 'unsafe-inline' ${process.env.NODE_ENV==='development'?"'unsafe-eval'":''}; connect-src 'self' https:; frame-ancestors 'none'; base-uri 'self'; form-action 'self' https://checkout.stripe.com https://billing.stripe.com`}
];
const nextConfig={reactStrictMode:true,async headers(){return [{source:'/:path*',headers:securityHeaders},{source:'/sw.js',headers:[{key:'Cache-Control',value:'no-cache, no-store, must-revalidate'}]},{source:'/api/:path*',headers:[{key:'Cache-Control',value:'private, no-store'}]}]}};
export default nextConfig;
