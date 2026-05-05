# Gastro Pro — Panel de gestión

## Setup en Supabase

Antes de deployar, ejecutá este SQL en Supabase (SQL Editor):

```sql
create table entregas (
  id uuid primary key default gen_random_uuid(),
  fecha date not null,
  hora text not null default '09:00',
  productos text not null,
  destinatario text not null,
  valor numeric default 0,
  estado text not null default 'entregado',
  created_at timestamptz default now()
);

create table productos (
  id uuid primary key default gen_random_uuid(),
  nombre text not null,
  categoria text not null default 'Otro',
  precio numeric not null,
  precio_nuevo numeric,
  stock integer,
  unidad text default 'unidad',
  created_at timestamptz default now()
);

alter table entregas enable row level security;
alter table productos enable row level security;

create policy "Public read" on entregas for select using (true);
create policy "Public insert" on entregas for insert with check (true);
create policy "Public update" on entregas for update using (true);
create policy "Public delete" on entregas for delete using (true);

create policy "Public read" on productos for select using (true);
create policy "Public insert" on productos for insert with check (true);
create policy "Public update" on productos for update using (true);
create policy "Public delete" on productos for delete using (true);
```

## Variables de entorno

En Vercel, agregar:
- `NEXT_PUBLIC_SUPABASE_URL` = tu Project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` = tu anon key

## Deploy en Vercel

1. Subí esta carpeta a un repo de GitHub
2. Conectá el repo en vercel.com
3. Agregá las variables de entorno
4. Deploy automático
