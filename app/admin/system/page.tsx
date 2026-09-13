import Workspace from '@/components/AdminWorkspace';
export const dynamic='force-dynamic';
export default function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){return <Workspace view="system" searchParams={searchParams}/>;}
