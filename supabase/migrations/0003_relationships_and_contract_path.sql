-- Vínculo N:N de contatos da oportunidade fica visível e gravável pelo app.
-- O catálogo de status do contrato segue a mesma ideia do funil: ordem e orientação
-- configuráveis, sem alterar os nomes já usados nos contratos existentes.

create table if not exists contract_statuses (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references organizations(id),
  name varchar(80) not null,
  sort_order integer not null,
  is_closed boolean not null default false,
  is_signed boolean not null default false,
  is_active boolean not null default false,
  guidance_text text not null default '',
  unique (organization_id, id),
  unique (organization_id, name)
);

insert into contract_statuses (organization_id, name, sort_order, is_closed, is_signed, is_active, guidance_text)
select organization.id, status.name, status.sort_order, status.is_closed, status.is_signed, status.is_active, status.guidance_text
from organizations organization
cross join (
  values
    ('Rascunho', 1, false, false, false, 'Minuta interna. Revise conta, valor e vigência antes de enviar.'),
    ('Em aprovação', 2, false, false, false, 'Aguardando aprovação interna.'),
    ('Enviado', 3, false, false, false, 'Documento enviado ao cliente.'),
    ('Assinado', 4, false, true, false, 'Contrato assinado. A ativação formaliza a vigência.'),
    ('Ativo', 5, false, true, true, 'Contrato em vigência.'),
    ('Expirado', 6, true, false, false, 'Vigência encerrada.'),
    ('Cancelado', 7, true, false, false, 'Contrato cancelado. O histórico permanece.')
) as status(name, sort_order, is_closed, is_signed, is_active, guidance_text)
on conflict (organization_id, name) do nothing;

alter table contract_statuses enable row level security;

create policy contract_statuses_read on contract_statuses for select to authenticated
using (organization_id = private.my_org());

create policy contract_statuses_update on contract_statuses for update to authenticated
using (organization_id = private.my_org() and private.has_permission('settings.manage'))
with check (organization_id = private.my_org());

create policy statuses_update on lead_statuses for update to authenticated
using (organization_id = private.my_org() and private.has_permission('settings.manage'))
with check (organization_id = private.my_org());

create policy stages_update on opportunity_stages for update to authenticated
using (organization_id = private.my_org() and private.has_permission('settings.manage'))
with check (organization_id = private.my_org());

create policy opportunity_contacts_read on opportunity_contacts for select to authenticated
using (
  organization_id = private.my_org()
  and exists (
    select 1 from opportunities opportunity
    where opportunity.id = opportunity_contacts.opportunity_id
      and opportunity.deleted_at is null
      and private.has_permission('opportunity.read')
      and private.owner_in_scope(opportunity.owner_id, false)
  )
);

create policy opportunity_contacts_insert on opportunity_contacts for insert to authenticated
with check (
  organization_id = private.my_org()
  and exists (
    select 1 from opportunities opportunity
    where opportunity.id = opportunity_id
      and opportunity.organization_id = private.my_org()
      and opportunity.deleted_at is null
      and private.owner_in_scope(opportunity.owner_id, true)
      and (
        private.has_permission('opportunity.create')
        or private.has_permission('opportunity.update')
      )
  )
  and exists (
    select 1 from contacts contact
    where contact.id = contact_id
      and contact.organization_id = private.my_org()
      and contact.deleted_at is null
  )
);

create policy opportunity_contacts_update on opportunity_contacts for update to authenticated
using (
  organization_id = private.my_org()
  and exists (
    select 1 from opportunities opportunity
    where opportunity.id = opportunity_id
      and opportunity.deleted_at is null
      and private.has_permission('opportunity.update')
      and private.owner_in_scope(opportunity.owner_id, true)
  )
)
with check (organization_id = private.my_org());

create policy opportunity_contacts_delete on opportunity_contacts for delete to authenticated
using (
  organization_id = private.my_org()
  and exists (
    select 1 from opportunities opportunity
    where opportunity.id = opportunity_id
      and opportunity.deleted_at is null
      and private.has_permission('opportunity.update')
      and private.owner_in_scope(opportunity.owner_id, true)
  )
);

create index if not exists opportunity_contacts_contact_idx on opportunity_contacts (contact_id);

grant select, update on contract_statuses to authenticated;
grant select, insert, update, delete on opportunity_contacts to authenticated;
