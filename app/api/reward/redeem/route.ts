import { handleLoyalty } from '@/lib/loyalty-handler';
export async function POST(req:Request){return handleLoyalty(req,'redeem');}
