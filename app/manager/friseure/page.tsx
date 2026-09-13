import Workspace from '@/components/ManagerWorkspace';
export const dynamic='force-dynamic';
export default function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){return <Workspace view="friseure" searchParams={searchParams}/>;}
