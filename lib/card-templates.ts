import {defaultCustomerDesign,type CustomerDesign} from './customer-design';
export type CardTemplate={id:string;label:string;industry:string;title:string;subtitle:string;reward:string;target:number;color:string;design:CustomerDesign};
export const CARD_TEMPLATES:CardTemplate[]=[
 {id:'rezix',label:'Rezix Classic',industry:'hair_beauty',title:'Deine Treuekarte',subtitle:'Dein nächstes Wiedersehen lohnt sich.',reward:'10 % Rabatt beim nächsten Besuch',target:10,color:'#2563EB',design:{...defaultCustomerDesign}},
 {id:'coffee',label:'Coffee Club',industry:'cafe_bakery',title:'Deine Kaffeekarte',subtitle:'Guter Kaffee. Gute Gesellschaft.',reward:'Ein Kaffee gratis',target:8,color:'#825B3C',design:{...defaultCustomerDesign,mode:'gradient',color:'#FFF8EC',gradientColor:'#EAD8C0',headingColor:'#503A29',textColor:'#503A29',mutedColor:'#79614A',panelOpacity:0}},
 {id:'beauty',label:'Beauty Moments',industry:'hair_beauty',title:'Deine Beauty-Karte',subtitle:'Ein Moment nur für dich.',reward:'10 % Rabatt auf deine nächste Behandlung',target:6,color:'#A44772',design:{...defaultCustomerDesign,mode:'gradient',color:'#FFF1F6',gradientColor:'#F5DCE7',headingColor:'#672C48',textColor:'#672C48',mutedColor:'#885A70',panelOpacity:0,fontFamily:'serif'}},
 {id:'dining',label:'Genuss Club',industry:'gastronomy',title:'Deine Genusskarte',subtitle:'Gemeinsam genießen. Vorteile sammeln.',reward:'Ein Dessert aufs Haus',target:10,color:'#31715B',design:{...defaultCustomerDesign,mode:'gradient',color:'#EDF8F1',gradientColor:'#D3E7DC',headingColor:'#204D3E',textColor:'#204D3E',mutedColor:'#537365',panelOpacity:0}},
 {id:'fitness',label:'Move Together',industry:'fitness',title:'Deine Fitnesskarte',subtitle:'Jedes Training zählt.',reward:'Ein Training gratis',target:10,color:'#5764BD',design:{...defaultCustomerDesign,mode:'gradient',color:'#EFF0FF',gradientColor:'#DCDFFA',panelOpacity:0}},
 {id:'retail',label:'Lieblingsstücke',industry:'retail',title:'Deine Vorteilskarte',subtitle:'Für alle, die gerne wiederkommen.',reward:'10 % Rabatt auf deinen nächsten Einkauf',target:10,color:'#AD7528',design:{...defaultCustomerDesign,mode:'gradient',color:'#FFFAEC',gradientColor:'#F3E7C6',headingColor:'#5B421C',textColor:'#5B421C',mutedColor:'#77603D',panelOpacity:0}},
];
export const CARD_DRAFT_KEY='rezix-card-draft-v1';
export type CardDraft={templateId:string;name:string;title:string;reward:string;target:number};
export function parseCardDraft(raw:string|null):CardDraft|null{
 try{const d=JSON.parse(raw||'null');if(!d||!CARD_TEMPLATES.some(t=>t.id===d.templateId)||typeof d.name!=='string'||d.name.length>120||typeof d.title!=='string'||!d.title.trim()||d.title.length>80||typeof d.reward!=='string'||!d.reward.trim()||d.reward.length>160||!Number.isInteger(d.target)||d.target<2||d.target>30)return null;return {templateId:d.templateId,name:d.name,title:d.title,reward:d.reward,target:d.target};}catch{return null;}
}
