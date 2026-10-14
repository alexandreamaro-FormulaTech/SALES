# Formula 360

CRM comercial B2B para o Grupo Horizonte. Cobre lead, conta, contato, oportunidade, contrato e usuário, com papéis, funil, conversão atômica e auditoria.

A operação de demonstração já vem carregada. A senha de todos os acessos é `horizonte`.

| Pessoa | Email | Papel |
| --- | --- | --- |
| Helena Duarte | helena.duarte@formula360.local | Administradora |
| Carlos Menezes | carlos.menezes@formula360.local | Gestor comercial |
| Bianca Alves | bianca.alves@formula360.local | Vendedora |
| Diego Farias | diego.farias@formula360.local | Vendedor |
| Rita Colombo | rita.colombo@formula360.local | Auditoria |

## Como rodar

```bash
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000). Os dados ficam em `data/db.json`, criado na primeira execução. Em Usuários, a administradora pode restaurar a demonstração.

```bash
npm test
npm run build
```

## O que esta versão faz

- Listas com busca, filtros, ordenação, paginação no servidor, visões salvas e exportação CSV conforme a permissão.
- Ficha com caminho de status, relacionados, atividades e histórico.
- Conversão de lead qualificado em conta, contato e oportunidade opcional, com alerta de email, domínio e CNPJ, sem mesclar sozinha. Repetir a conversão devolve os mesmos registros.
- Quadro de oportunidades e regras de fechamento: perda pede motivo, ganho pede valor e data, e a etapa redefine a probabilidade.
- Contrato só referencia oportunidade e assinante da mesma conta.
- Papéis: administrador, gestor (equipe), vendedor (escreve o próprio e lê o compartilhado) e auditoria (somente leitura).
- Exclusão lógica, com bloqueio quando há relacionamento crítico.

## Produção com Supabase

O aplicativo roda sem projeto Supabase para a demonstração. O schema de produção está em `supabase/migrations`: tabelas, chaves compostas por organização, RLS e a função `convert_lead`. Autenticação, convite e arquivos de contrato passam a usar Auth e Storage privado, com URL assinada. A chave `service_role` não entra no navegador.

Premissas desta fase: operação B2B, moeda BRL, idioma pt-BR e uma organização, com o modelo pronto para mais de uma empresa.
