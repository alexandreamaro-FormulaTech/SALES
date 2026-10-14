-- Formula 360 · RLS, integridade entre tenants e conversão atômica de lead.
-- A service role não deve ser usada no navegador. RPCs SECURITY DEFINER validam tenant e permissão.

create or replace function private.my_org()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id from profiles where id = auth.uid() and is_active
$$;

create or replace function private.has_permission(perm text)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from profiles p
    join role_permissions rp on rp.role_id = p.role_id
    join permissions pe on pe.id = rp.permission_id
    where p.id = auth.uid()
      and p.is_active
      and pe.key = perm
  )
$$;

create or replace function private.owner_in_scope(target uuid, writing boolean)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor profiles;
  scope text;
begin
  select * into actor from profiles where id = auth.uid() and is_active;
  if actor.id is null then
    return false;
  end if;
  select case when writing then r.write_scope else r.read_scope end
    into scope
  from roles r
  where r.id = actor.role_id;
  if scope = 'all' then
    return true;
  elsif scope = 'own' then
    return target = actor.id;
  else
    return target = actor.id or exists (
      select 1 from profiles member
      where member.id = target
        and member.manager_id = actor.id
        and member.organization_id = actor.organization_id
    );
  end if;
end;
$$;

revoke all on function private.my_org() from public;
revoke all on function private.has_permission(text) from public;
revoke all on function private.owner_in_scope(uuid, boolean) from public;
grant execute on function private.my_org() to authenticated;
grant execute on function private.has_permission(text) to authenticated;
grant execute on function private.owner_in_scope(uuid, boolean) to authenticated;

create or replace function private.same_account_contact()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.primary_contact_id is not null and not exists (
    select 1 from contacts
    where id = new.primary_contact_id
      and account_id = new.account_id
      and organization_id = new.organization_id
      and deleted_at is null
  ) then
    raise exception 'O contato principal precisa ser da mesma conta.';
  end if;
  return new;
end;
$$;

create trigger opportunities_same_contact
before insert or update on opportunities
for each row execute function private.same_account_contact();

create or replace function private.contract_same_account()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.opportunity_id is not null and not exists (
    select 1 from opportunities
    where id = new.opportunity_id
      and account_id = new.account_id
      and organization_id = new.organization_id
      and deleted_at is null
  ) then
    raise exception 'O contrato só pode referenciar uma oportunidade da mesma conta.';
  end if;
  if new.signer_contact_id is not null and not exists (
    select 1 from contacts
    where id = new.signer_contact_id
      and account_id = new.account_id
      and organization_id = new.organization_id
      and deleted_at is null
  ) then
    raise exception 'O assinante precisa ser um contato da mesma conta.';
  end if;
  return new;
end;
$$;

create trigger contracts_same_account
before insert or update on contracts
for each row execute function private.contract_same_account();

alter table profiles enable row level security;
alter table roles enable row level security;
alter table role_permissions enable row level security;
alter table permissions enable row level security;
alter table lead_statuses enable row level security;
alter table opportunity_stages enable row level security;
alter table leads enable row level security;
alter table accounts enable row level security;
alter table contacts enable row level security;
alter table opportunities enable row level security;
alter table opportunity_contacts enable row level security;
alter table contracts enable row level security;
alter table activities enable row level security;
alter table record_audit_logs enable row level security;
alter table saved_views enable row level security;
alter table attachments enable row level security;

create policy profiles_read on profiles for select to authenticated
using (organization_id = private.my_org());

create policy catalog_read on permissions for select to authenticated using (true);

create policy roles_read on roles for select to authenticated
using (organization_id = private.my_org());

create policy role_permissions_read on role_permissions for select to authenticated
using (exists (select 1 from roles r where r.id = role_id and r.organization_id = private.my_org()));

create policy statuses_read on lead_statuses for select to authenticated
using (organization_id = private.my_org());

create policy stages_read on opportunity_stages for select to authenticated
using (organization_id = private.my_org());

create policy leads_read on leads for select to authenticated
using (
  deleted_at is null
  and organization_id = private.my_org()
  and private.has_permission('lead.read')
  and private.owner_in_scope(owner_id, false)
);

create policy leads_insert on leads for insert to authenticated
with check (
  organization_id = private.my_org()
  and private.has_permission('lead.create')
  and private.owner_in_scope(owner_id, true)
);

create policy leads_update on leads for update to authenticated
using (
  deleted_at is null
  and organization_id = private.my_org()
  and private.has_permission('lead.update')
  and private.owner_in_scope(owner_id, true)
)
with check (organization_id = private.my_org());

create policy accounts_read on accounts for select to authenticated
using (deleted_at is null and organization_id = private.my_org() and private.has_permission('account.read') and private.owner_in_scope(owner_id, false));
create policy accounts_insert on accounts for insert to authenticated
with check (organization_id = private.my_org() and private.has_permission('account.create') and private.owner_in_scope(owner_id, true));
create policy accounts_update on accounts for update to authenticated
using (deleted_at is null and organization_id = private.my_org() and private.has_permission('account.update') and private.owner_in_scope(owner_id, true))
with check (organization_id = private.my_org());

create policy contacts_read on contacts for select to authenticated
using (deleted_at is null and organization_id = private.my_org() and private.has_permission('contact.read') and private.owner_in_scope(owner_id, false));
create policy contacts_insert on contacts for insert to authenticated
with check (organization_id = private.my_org() and private.has_permission('contact.create') and private.owner_in_scope(owner_id, true));
create policy contacts_update on contacts for update to authenticated
using (deleted_at is null and organization_id = private.my_org() and private.has_permission('contact.update') and private.owner_in_scope(owner_id, true))
with check (organization_id = private.my_org());

create policy opportunities_read on opportunities for select to authenticated
using (deleted_at is null and organization_id = private.my_org() and private.has_permission('opportunity.read') and private.owner_in_scope(owner_id, false));
create policy opportunities_insert on opportunities for insert to authenticated
with check (organization_id = private.my_org() and private.has_permission('opportunity.create') and private.owner_in_scope(owner_id, true));
create policy opportunities_update on opportunities for update to authenticated
using (deleted_at is null and organization_id = private.my_org() and private.has_permission('opportunity.update') and private.owner_in_scope(owner_id, true))
with check (organization_id = private.my_org());

create policy contracts_read on contracts for select to authenticated
using (deleted_at is null and organization_id = private.my_org() and private.has_permission('contract.read') and private.owner_in_scope(owner_id, false));
create policy contracts_insert on contracts for insert to authenticated
with check (organization_id = private.my_org() and private.has_permission('contract.create') and private.owner_in_scope(owner_id, true));
create policy contracts_update on contracts for update to authenticated
using (deleted_at is null and organization_id = private.my_org() and private.has_permission('contract.update') and private.owner_in_scope(owner_id, true))
with check (organization_id = private.my_org());

create policy activities_read on activities for select to authenticated
using (organization_id = private.my_org());
create policy activities_insert on activities for insert to authenticated
with check (organization_id = private.my_org());

create policy audit_read on record_audit_logs for select to authenticated
using (
  organization_id = private.my_org()
  and (
    private.has_permission('audit.read')
    or actor_id = auth.uid()
  )
);

create policy views_all on saved_views for all to authenticated
using (organization_id = private.my_org() and (user_id = auth.uid() or shared))
with check (organization_id = private.my_org() and user_id = auth.uid());

create policy attachments_read on attachments for select to authenticated
using (organization_id = private.my_org());

-- Conversão atômica. Repetir a chamada devolve os mesmos IDs.
create or replace function public.convert_lead(
  p_lead_id uuid,
  p_account_mode text,
  p_account_id uuid,
  p_account_name text,
  p_tax_id text,
  p_contact_mode text,
  p_contact_id uuid,
  p_create_opportunity boolean,
  p_opportunity_name text,
  p_owner_id uuid,
  p_acknowledge_duplicates boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor profiles;
  lead leads;
  target_status lead_statuses;
  account_id uuid;
  contact_id uuid;
  opportunity_id uuid;
  stage opportunity_stages;
  stamp timestamptz := now();
begin
  select * into actor from profiles where id = auth.uid() and is_active;
  if actor.id is null then
    raise exception 'Sessão inválida.';
  end if;

  select * into lead from leads where id = p_lead_id and organization_id = actor.organization_id and deleted_at is null for update;
  if lead.id is null then
    raise exception 'Lead não encontrado.';
  end if;
  if not private.has_permission('lead.read') or not private.owner_in_scope(lead.owner_id, false) then
    raise exception 'Sem permissão para consultar este lead.';
  end if;
  if lead.is_converted then
    return jsonb_build_object(
      'accountId', lead.converted_account_id,
      'contactId', lead.converted_contact_id,
      'opportunityId', lead.converted_opportunity_id,
      'idempotent', true
    );
  end if;
  if not private.has_permission('lead.convert') or not private.owner_in_scope(lead.owner_id, true) then
    raise exception 'Sem permissão para converter este lead.';
  end if;

  select * into target_status from lead_statuses where id = lead.status_id;
  if not target_status.allows_conversion then
    raise exception 'Converta apenas leads qualificados.';
  end if;
  if lead.company = '' or lead.last_name = '' or (lead.email = '' and lead.phone = '' and lead.mobile = '') then
    raise exception 'Empresa, sobrenome e um contato identificável são obrigatórios.';
  end if;

  if p_account_mode = 'link' then
    select id into account_id from accounts
    where id = p_account_id and organization_id = actor.organization_id and deleted_at is null;
    if account_id is null then
      raise exception 'Conta não encontrada nesta organização.';
    end if;
  else
    insert into accounts (
      organization_id, owner_id, name, tax_id, type, industry, website, phone,
      annual_revenue, employee_count, billing_street, billing_city, billing_state, source_lead_id, description, created_by, updated_by
    ) values (
      actor.organization_id, coalesce(p_owner_id, lead.owner_id), coalesce(nullif(p_account_name, ''), lead.company),
      regexp_replace(coalesce(p_tax_id, ''), '\D', '', 'g'), 'Prospect', lead.industry, lead.website, lead.phone,
      lead.annual_revenue, lead.employee_count, lead.address_street, lead.address_city, lead.address_state, lead.id, lead.description, actor.id, actor.id
    ) returning id into account_id;
  end if;

  if p_contact_mode = 'link' then
    select id into contact_id from contacts
    where id = p_contact_id and organization_id = actor.organization_id and account_id = account_id and deleted_at is null;
    if contact_id is null then
      raise exception 'O contato precisa pertencer à conta selecionada.';
    end if;
  else
    insert into contacts (
      organization_id, owner_id, account_id, first_name, last_name, email, phone, mobile, title,
      is_primary, mailing_street, mailing_city, lead_source, source_lead_id, description, created_by, updated_by
    ) values (
      actor.organization_id, coalesce(p_owner_id, lead.owner_id), account_id, lead.first_name, lead.last_name,
      lead.email, lead.phone, lead.mobile, lead.title, true, lead.address_street, lead.address_city,
      lead.lead_source, lead.id, lead.qualification_notes, actor.id, actor.id
    ) returning id into contact_id;
  end if;

  if p_create_opportunity then
    select * into stage from opportunity_stages
    where organization_id = actor.organization_id and is_closed = false
    order by sort_order
    limit 1;
    insert into opportunities (
      organization_id, owner_id, name, account_id, stage_id, probability, close_date, type,
      lead_source, description, primary_contact_id, source_lead_id, created_by, updated_by
    ) values (
      actor.organization_id, coalesce(p_owner_id, lead.owner_id),
      coalesce(nullif(p_opportunity_name, ''), lead.company || ' — novo negócio'),
      account_id, stage.id, stage.default_probability, current_date + 30, 'Novo negócio',
      lead.lead_source, lead.qualification_notes, contact_id, lead.id, actor.id, actor.id
    ) returning id into opportunity_id;
    insert into opportunity_contacts (organization_id, opportunity_id, contact_id, role, is_primary)
    values (actor.organization_id, opportunity_id, contact_id, 'Decisor', true);
  end if;

  update leads set
    status_id = (select id from lead_statuses where organization_id = actor.organization_id and is_converted),
    is_converted = true,
    converted_at = stamp,
    converted_account_id = account_id,
    converted_contact_id = contact_id,
    converted_opportunity_id = opportunity_id,
    updated_by = actor.id
  where id = lead.id;

  insert into record_audit_logs (organization_id, actor_id, action, object_type, record_id, changes)
  values (
    actor.organization_id, actor.id, 'convert', 'lead', lead.id,
    jsonb_build_array(jsonb_build_object('field', 'conversao', 'before', null, 'after', jsonb_build_object('accountId', account_id, 'contactId', contact_id, 'opportunityId', opportunity_id)))
  );

  return jsonb_build_object('accountId', account_id, 'contactId', contact_id, 'opportunityId', opportunity_id, 'idempotent', false);
end;
$$;

revoke all on function public.convert_lead(uuid, text, uuid, text, text, text, uuid, boolean, text, uuid, boolean) from public;
grant execute on function public.convert_lead(uuid, text, uuid, text, text, text, uuid, boolean, text, uuid, boolean) to authenticated;

-- Bucket privado para documentos de contrato. URLs apenas assinadas.
insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;
