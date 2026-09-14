export const INDUSTRIES=[
 ['hair_beauty','Friseur & Beauty'],['gastronomy','Gastronomie & Restaurant'],['cafe_bakery','Café & Bäckerei'],['retail','Einzelhandel'],['fitness','Fitness & Sport'],['health','Gesundheit & Praxis'],['automotive','Auto & Werkstatt'],['hotel','Hotel & Unterkunft'],['services','Dienstleistungen'],['education','Bildung & Kurse'],['pets','Tier & Zubehör'],['leisure','Freizeit & Events'],['other','Sonstiges']
] as const;
export type Industry=typeof INDUSTRIES[number][0];
export function industryLabel(value:string){return INDUSTRIES.find(([id])=>id===value)?.[1]||'Sonstiges'}
export function industryDefaults(value:string){
 const defaults:Record<string,{target:number;reward:string;title:string}>={
  hair_beauty:{target:10,reward:'10 % Rabatt beim nächsten Besuch',title:'Deine Treuekarte'},gastronomy:{target:10,reward:'Ein Gericht oder Extra gratis',title:'Deine Genusskarte'},cafe_bakery:{target:8,reward:'Ein Kaffee gratis',title:'Deine Kaffeekarte'},retail:{target:10,reward:'10 % Rabatt auf deinen nächsten Einkauf',title:'Deine Vorteilskarte'},fitness:{target:10,reward:'Ein Training oder Extra gratis',title:'Deine Fitnesskarte'},automotive:{target:5,reward:'Rabatt auf den nächsten Service',title:'Deine Servicekarte'},hotel:{target:8,reward:'Ein exklusiver Vorteil bei deinem nächsten Aufenthalt',title:'Deine Gästekarte'}
 };
 return defaults[value]||{target:10,reward:'Deine persönliche Belohnung',title:'Deine Treuekarte'};
}
