import type { CSSProperties } from 'react';
export type CustomerDesign = { mode:'color'|'gradient'|'image'; color:string; gradientColor:string; imageUrl:string|null; overlay:number; position:'center'|'top'|'bottom'; size:'cover'|'contain' };
export const defaultCustomerDesign:CustomerDesign={mode:'color',color:'#F5F7FA',gradientColor:'#DBEAFE',imageUrl:null,overlay:0,position:'center',size:'cover'};
export function customerBackground(d:CustomerDesign=defaultCustomerDesign):CSSProperties {
 const layers=[];
 if(d.overlay>0)layers.push(`linear-gradient(rgba(255,255,255,${d.overlay}),rgba(255,255,255,${d.overlay}))`);
 if(d.mode==='image'&&d.imageUrl)layers.push(`url(${JSON.stringify(d.imageUrl)})`);
 if(d.mode==='gradient')layers.push(`linear-gradient(135deg,${d.color},${d.gradientColor})`);
 return {backgroundColor:d.color,backgroundImage:layers.length?layers.join(','):undefined,backgroundPosition:d.position,backgroundSize:d.size,backgroundRepeat:'no-repeat'};
}
