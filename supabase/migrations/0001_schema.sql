-- Formula 360 · schema inicial
-- Tenant único no MVP, com organization_id em todas as tabelas para evolução multiempresa.

create extension if not exists pgcrypto;
create extension if not exists citext;

create schema if not exists private;
revoke all on schema private from public;

create or replace function private.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table organizations (
  id uuid primary key default gen_random_uuid(),
  name varchar(200) not null,
  locale text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  currency_code char(3) not null default 'BRL',
  created_at timestamptz not null default now()
);

create table permissions (
  id uuid primary key default gen_random_uuid(),
  key text not null unique,
  label text not null,
  permission_group text not null
);

create table roles (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name varchar(80) not null,
  description text not null default '',
  read_scope text not null check (read_scope in ('all', 'team', 'own')),
  write_scope text not null check (write_scope in ('all', 'team', 'own')),
  unique (organization_id, name),
  unique (organization_id, id)
);

create table role_permissions (
  role_id uuid not null references roles(id) on delete cascade,
  permission_id uuid not null references permissions(id),
  primary key (role_id, permission_id)
);

create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  organization_id uuid not null references organizations(id),
  full_name varchar(200) not null,
  email citext not null,
  role_id uuid not null,
  manager_id uuid,
  is_active boolean not null default true,
  avatar_path text,
  locale text not null default 'pt-BR',
  timezone text not null default 'America/Sao_Paulo',
  last_seen_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (organization_id, id),
  unique (organization_id, email),
  foreign key (organization_id, role_id) references roles(organization_id, id),
  foreign key (organization_id, manager_id) references profiles(organization_id, id)
);

create table lead_statuses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name varchar(80) not null,
  sort_order integer not null,
  is_closed boolean not null default false,
  is_converted boolean not null default false,
  allows_conversion boolean not null default false,
  requires_reason boolean not null default false,
  guidance_text text not null default '',
  unique (organization_id, id),
  unique (organization_id, name)
);

create table opportunity_stages (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name varchar(80) not null,
  sort_order integer not null,
  is_closed boolean not null default false,
  is_won boolean not null default false,
  default_probability numeric(5,2) not null check (default_probability between 0 and 100),
  guidance_text text not null default '',
  unique (organization_id, id),
  unique (organization_id, name)
);

create table leads (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_id uuid not null,
  first_name varchar(100) not null default '',
  last_name varchar(100) not null,
  company varchar(200) not null,
  title varchar(150) not null default '',
  email citext not null default '',
  phone varchar(30) not null default '',
  mobile varchar(30) not null default '',
  website text not null default '',
  status_id uuid not null,
  lead_source text not null default '',
  rating text check (rating is null or rating in ('Quente', 'Morno', 'Frio')),
  industry text not null default '',
  annual_revenue numeric(18,2) check (annual_revenue is null or annual_revenue >= 0),
  employee_count integer check (employee_count is null or employee_count >= 0),
  address_street text not null default '',
  address_number text not null default '',
  address_complement text not null default '',
  address_district text not null default '',
  address_city text not null default '',
  address_state text not null default '',
  address_postal_code text not null default '',
  address_country text not null default 'Brasil',
  description text not null default '',
  qualification_notes text not null default '',
  disqualification_reason text not null default '',
  is_converted boolean not null default false,
  converted_at timestamptz,
  converted_account_id uuid,
  converted_contact_id uuid,
  converted_opportunity_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, owner_id) references profiles(organization_id, id),
  foreign key (organization_id, status_id) references lead_statuses(organization_id, id)
);

create table accounts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_id uuid not null,
  name varchar(200) not null,
  legal_name varchar(200) not null default '',
  tax_id varchar(20) not null default '',
  type text not null check (type in ('Prospect', 'Cliente', 'Parceiro')),
  industry text not null default '',
  website text not null default '',
  phone varchar(30) not null default '',
  annual_revenue numeric(18,2) check (annual_revenue is null or annual_revenue >= 0),
  employee_count integer check (employee_count is null or employee_count >= 0),
  parent_account_id uuid,
  billing_street text not null default '',
  billing_number text not null default '',
  billing_complement text not null default '',
  billing_district text not null default '',
  billing_city text not null default '',
  billing_state text not null default '',
  billing_postal_code text not null default '',
  billing_country text not null default 'Brasil',
  shipping_street text not null default '',
  shipping_number text not null default '',
  shipping_complement text not null default '',
  shipping_district text not null default '',
  shipping_city text not null default '',
  shipping_state text not null default '',
  shipping_postal_code text not null default '',
  shipping_country text not null default 'Brasil',
  source_lead_id uuid,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, owner_id) references profiles(organization_id, id),
  foreign key (organization_id, parent_account_id) references accounts(organization_id, id),
  foreign key (organization_id, source_lead_id) references leads(organization_id, id)
);

alter table leads
  add constraint leads_converted_account_fk foreign key (organization_id, converted_account_id) references accounts(organization_id, id);

create table contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_id uuid not null,
  account_id uuid not null,
  first_name varchar(100) not null default '',
  last_name varchar(100) not null,
  email citext not null default '',
  phone varchar(30) not null default '',
  mobile varchar(30) not null default '',
  title varchar(150) not null default '',
  department varchar(100) not null default '',
  reports_to_contact_id uuid,
  is_primary boolean not null default false,
  mailing_street text not null default '',
  mailing_number text not null default '',
  mailing_complement text not null default '',
  mailing_district text not null default '',
  mailing_city text not null default '',
  mailing_state text not null default '',
  mailing_postal_code text not null default '',
  mailing_country text not null default 'Brasil',
  lead_source text not null default '',
  email_opt_out boolean not null default false,
  do_not_call boolean not null default false,
  source_lead_id uuid,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, owner_id) references profiles(organization_id, id),
  foreign key (organization_id, account_id) references accounts(organization_id, id),
  foreign key (organization_id, reports_to_contact_id) references contacts(organization_id, id),
  foreign key (organization_id, source_lead_id) references leads(organization_id, id)
);

alter table leads
  add constraint leads_converted_contact_fk foreign key (organization_id, converted_contact_id) references contacts(organization_id, id);

create table opportunities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_id uuid not null,
  name varchar(200) not null,
  account_id uuid not null,
  stage_id uuid not null,
  amount numeric(18,2) check (amount is null or amount >= 0),
  currency_code char(3) not null default 'BRL',
  probability numeric(5,2) not null default 0 check (probability between 0 and 100),
  expected_revenue numeric(18,2) generated always as (
    case when amount is null then null else round(amount * probability / 100, 2) end
  ) stored,
  close_date date not null,
  actual_close_date date,
  type text not null check (type in ('Novo negócio', 'Expansão', 'Renovação')),
  lead_source text not null default '',
  next_step text not null default '',
  description text not null default '',
  loss_reason text not null default '',
  primary_contact_id uuid,
  source_lead_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique (organization_id, id),
  foreign key (organization_id, owner_id) references profiles(organization_id, id),
  foreign key (organization_id, account_id) references accounts(organization_id, id),
  foreign key (organization_id, stage_id) references opportunity_stages(organization_id, id),
  foreign key (organization_id, primary_contact_id) references contacts(organization_id, id),
  foreign key (organization_id, source_lead_id) references leads(organization_id, id)
);

alter table leads
  add constraint leads_converted_opportunity_fk foreign key (organization_id, converted_opportunity_id) references opportunities(organization_id, id);

create table opportunity_contacts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  opportunity_id uuid not null,
  contact_id uuid not null,
  role text not null default '',
  is_primary boolean not null default false,
  unique (opportunity_id, contact_id),
  foreign key (organization_id, opportunity_id) references opportunities(organization_id, id) on delete cascade,
  foreign key (organization_id, contact_id) references contacts(organization_id, id)
);

create table contracts (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  owner_id uuid not null,
  contract_number varchar(40) not null,
  account_id uuid not null,
  opportunity_id uuid,
  signer_contact_id uuid,
  name varchar(200) not null,
  status text not null check (status in ('Rascunho', 'Em aprovação', 'Enviado', 'Assinado', 'Ativo', 'Expirado', 'Cancelado')),
  start_date date,
  end_date date,
  term_months integer check (term_months is null or term_months > 0),
  amount numeric(18,2) check (amount is null or amount >= 0),
  currency_code char(3) not null default 'BRL',
  signed_at timestamptz,
  activated_at timestamptz,
  renewal_notice_days integer not null default 30 check (renewal_notice_days >= 0),
  document_path text,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  created_by uuid,
  updated_by uuid,
  deleted_at timestamptz,
  unique (organization_id, contract_number),
  unique (organization_id, id),
  check (end_date is null or start_date is null or end_date >= start_date),
  foreign key (organization_id, owner_id) references profiles(organization_id, id),
  foreign key (organization_id, account_id) references accounts(organization_id, id),
  foreign key (organization_id, opportunity_id) references opportunities(organization_id, id),
  foreign key (organization_id, signer_contact_id) references contacts(organization_id, id)
);

create table activities (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  object_type text not null check (object_type in ('lead', 'account', 'contact', 'opportunity', 'contract')),
  record_id uuid not null,
  type text not null check (type in ('Tarefa', 'Chamada', 'Reunião', 'Nota')),
  subject text not null,
  body text not null default '',
  due_at date,
  created_at timestamptz not null default now(),
  created_by uuid
);

create table record_audit_logs (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  actor_id uuid,
  action text not null,
  object_type text not null,
  record_id uuid not null,
  changes jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);

create table saved_views (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  user_id uuid not null,
  object_type text not null,
  name varchar(120) not null,
  shared boolean not null default false,
  filters jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  foreign key (organization_id, user_id) references profiles(organization_id, id)
);

create table saved_view_columns (
  id uuid primary key default gen_random_uuid(),
  saved_view_id uuid not null references saved_views(id) on delete cascade,
  field_key text not null,
  sort_order integer not null,
  unique (saved_view_id, field_key)
);

create table attachments (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  object_type text not null,
  record_id uuid not null,
  storage_path text not null,
  file_name text not null,
  created_by uuid,
  created_at timestamptz not null default now()
);

create index leads_org_owner_idx on leads (organization_id, owner_id) where deleted_at is null;
create index leads_org_status_idx on leads (organization_id, status_id) where deleted_at is null;
create index leads_org_created_idx on leads (organization_id, created_at desc) where deleted_at is null;
create index leads_email_idx on leads (organization_id, email) where deleted_at is null and email <> '';
create index accounts_org_owner_idx on accounts (organization_id, owner_id) where deleted_at is null;
create index accounts_tax_idx on accounts (organization_id, tax_id) where deleted_at is null and tax_id <> '';
create index accounts_parent_idx on accounts (organization_id, parent_account_id) where deleted_at is null;
create index contacts_org_account_idx on contacts (organization_id, account_id) where deleted_at is null;
create index contacts_email_idx on contacts (organization_id, email) where deleted_at is null and email <> '';
create index opportunities_org_stage_idx on opportunities (organization_id, stage_id) where deleted_at is null;
create index opportunities_org_account_idx on opportunities (organization_id, account_id) where deleted_at is null;
create index opportunities_close_idx on opportunities (organization_id, close_date) where deleted_at is null;
create index contracts_org_account_idx on contracts (organization_id, account_id) where deleted_at is null;
create index contracts_end_idx on contracts (organization_id, end_date) where deleted_at is null;
create index activities_record_idx on activities (organization_id, object_type, record_id);
create index audit_record_idx on record_audit_logs (organization_id, object_type, record_id, created_at desc);

create trigger leads_updated before update on leads for each row execute function private.set_updated_at();
create trigger accounts_updated before update on accounts for each row execute function private.set_updated_at();
create trigger contacts_updated before update on contacts for each row execute function private.set_updated_at();
create trigger opportunities_updated before update on opportunities for each row execute function private.set_updated_at();
create trigger contracts_updated before update on contracts for each row execute function private.set_updated_at();
create trigger profiles_updated before update on profiles for each row execute function private.set_updated_at();
