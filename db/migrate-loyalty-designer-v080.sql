alter table businesses add column if not exists card_title text not null default 'Deine Treuekarte';
alter table businesses add column if not exists card_subtitle text not null default 'Deine digitale Treuekarte';
alter table businesses add column if not exists primary_color text not null default '#2563EB';
alter table businesses add column if not exists stamp_shape text not null default 'circle';
update businesses set card_title=coalesce(nullif(card_title,''),'Deine Treuekarte'),card_subtitle=coalesce(nullif(card_subtitle,''),'Deine digitale Treuekarte'),primary_color=coalesce(nullif(primary_color,''),'#2563EB'),stamp_shape=case when stamp_shape in ('circle','rounded','square') then stamp_shape else 'circle' end;
