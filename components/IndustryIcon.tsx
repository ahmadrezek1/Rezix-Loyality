import {Scissors,Utensils,Coffee,ShoppingBag,Dumbbell,Stethoscope,Car,Hotel,Briefcase,GraduationCap,PawPrint,PartyPopper,Building2} from 'lucide-react';
const icons:any={hair_beauty:Scissors,gastronomy:Utensils,cafe_bakery:Coffee,retail:ShoppingBag,fitness:Dumbbell,health:Stethoscope,automotive:Car,hotel:Hotel,services:Briefcase,education:GraduationCap,pets:PawPrint,leisure:PartyPopper,other:Building2};
export default function IndustryIcon({industry,size=20}:{industry:string;size?:number}){const Icon=icons[industry]||Building2;return <Icon size={size}/>}
