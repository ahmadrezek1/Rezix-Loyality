import PwaRegistration from '@/components/PwaRegistration';
import './styles.css';
export const metadata={title:'Rezix Loyalty',description:'Digitale Treuekarten für moderne Barbershops',manifest:'/manifest.webmanifest',appleWebApp:{capable:true,statusBarStyle:'default',title:'Rezix Loyalty'},icons:{icon:'/icon-192.png',apple:'/apple-touch-icon.png'}};
export const viewport={width:'device-width',initialScale:1,themeColor:'#0b2451'};
export default function RootLayout({children}:{children:React.ReactNode}){return <html lang="de" dir="ltr"><body>{children}<PwaRegistration/></body></html>}
