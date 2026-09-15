import AuthHeader from '@/components/AuthHeader';
import MultiBranchRegistration from '@/components/MultiBranchRegistration';
export default async function Register({searchParams}:{searchParams:Promise<{error?:string;field?:string}>}){const q=await searchParams;return <main className="rezix-auth rezix-enroll"><AuthHeader register/><MultiBranchRegistration error={q.error} errorField={q.field}/></main>;}
