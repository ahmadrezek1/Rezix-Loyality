-- Rezix v0.4.1 role model: Admin / Manager / Friseur / Kunde
-- Existing salon owners become Manager. Existing Staff become Friseur.

alter table staff_users drop constraint if exists staff_users_role_check;
update staff_users set role='manager' where role='owner';
update staff_users set role='friseur' where role='staff';
alter table staff_users add constraint staff_users_role_check check (role in ('manager','friseur'));

alter table audit_logs drop constraint if exists audit_logs_actor_type_check;
update audit_logs set actor_type='manager' where actor_type='owner';
update audit_logs set actor_type='friseur' where actor_type='staff';
update audit_logs set actor_type='kunde' where actor_type='customer';
alter table audit_logs add constraint audit_logs_actor_type_check check (actor_type in ('admin','manager','friseur','kunde','system'));
