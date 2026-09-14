import type { CSSProperties } from 'react';
export type CustomerDesign = { panelOpacity?:number; textColor?:string; headingColor?:string; mutedColor?:string; fontFamily?:'sans'|'serif'|'rounded'; fontStyle?:'normal'|'italic'; fontWeight?:'400'|'600'|'700'; fontSize?:number; headingSize?:number; mode:'color'|'gradient'|'image'; color:string; gradientColor:string; imageUrl:string|null; overlay:number; position:'center'|'top'|'bottom'; size:'cover'|'contain' };
export const defaultCustomerDesign:CustomerDesign={mode:'color',color:'#F5F7FA',gradientColor:'#DBEAFE',imageUrl:null,overlay:0,position:'center',size:'cover'};
export function customerBackground(d:CustomerDesign=defaultCustomerDesign):CSSProperties {
 const a=designAppearance(d);
 const layers=[];
 if(d.overlay>0)layers.push(`linear-gradient(rgba(255,255,255,${d.overlay}),rgba(255,255,255,${d.overlay}))`);
 if(d.mode==='image'&&d.imageUrl)layers.push(`url(${JSON.stringify(d.imageUrl)})`);
 if(d.mode==='gradient')layers.push(`linear-gradient(135deg,${d.color},${d.gradientColor})`);
 return {'--customer-panel':`rgba(255,255,255,${a.panelOpacity})`,'--customer-text':a.textColor,'--customer-heading':a.headingColor,'--customer-muted':a.mutedColor,'--customer-font':{sans:'Arial, Helvetica, sans-serif',serif:'Georgia, serif',rounded:'Trebuchet MS, Arial, sans-serif'}[a.fontFamily],'--customer-style':a.fontStyle,'--customer-weight':a.fontWeight,'--customer-size':`${a.fontSize}px`,'--customer-heading-size':`${a.headingSize}px`,backgroundColor:d.color,backgroundImage:layers.length?layers.join(','):undefined,backgroundPosition:d.position,backgroundSize:d.size,backgroundRepeat:'no-repeat'} as CSSProperties;
}

export function designAppearance(d:CustomerDesign){const image=d.mode==='image';return {panelOpacity:d.panelOpacity??(image?0:1),textColor:d.textColor??(image?'#FFFFFF':'#344054'),headingColor:d.headingColor??(image?'#FFFFFF':'#172B47'),mutedColor:d.mutedColor??(image?'#DBEAFE':'#64748B'),fontFamily:d.fontFamily??'sans',fontStyle:d.fontStyle??'normal',fontWeight:d.fontWeight??'400',fontSize:d.fontSize??14,headingSize:d.headingSize??24};}
