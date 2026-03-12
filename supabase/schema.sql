-- =========================================================================
-- E-Bike Manager – Supabase Schema
-- Ejecutar este SQL en el SQL Editor de tu proyecto Supabase
-- =========================================================================

-- ── Extensiones ──────────────────────────────────────────────────────────
-- uuid-ossp ya viene habilitada por defecto en Supabase

-- ── Tabla: empresa (configuración global) ────────────────────────────────
create table if not exists empresa (
  id         uuid primary key default gen_random_uuid(),
  nombre     text not null default 'E-Bike Manager',
  slogan     text default 'Movilidad eléctrica inteligente',
  moneda     text default 'USD',
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Insertar config por defecto si la tabla está vacía
insert into empresa (nombre, slogan, moneda)
select 'E-Bike Manager', 'Movilidad eléctrica inteligente', 'USD'
where not exists (select 1 from empresa);

-- ── Tabla: perfiles de usuario (vinculada a auth.users) ──────────────────
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  nombre     text not null,
  email      text not null,
  rol        text not null default 'viewer' check (rol in ('admin', 'vendedor', 'viewer')),
  activo     boolean default true,
  created_at timestamptz default now()
);

-- ── Tabla: productos (inventario) ────────────────────────────────────────
create table if not exists productos (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  categoria        text,
  descripcion      text,
  precio           numeric(12,2) not null default 0,
  moneda           text not null default 'USD',
  stock            integer not null default 0,
  umbral_minimo    integer default 0,
  estado           text default 'activo',
  historial_precios jsonb default '[]'::jsonb,
  created_at       timestamptz default now()
);

-- ── Tabla: clientes ──────────────────────────────────────────────────────
create table if not exists clientes (
  id               uuid primary key default gen_random_uuid(),
  nombre           text not null,
  apellido         text,
  telefono         text,
  email            text,
  notas            text,
  ebike_principal  text,
  fecha_registro   date default current_date,
  created_at       timestamptz default now()
);

-- ── Tabla: historial de compras de clientes ──────────────────────────────
create table if not exists historial_compras (
  id          uuid primary key default gen_random_uuid(),
  cliente_id  uuid not null references clientes(id) on delete cascade,
  fecha       date not null,
  producto    text not null,
  precio      numeric(12,2),
  descripcion text,
  created_at  timestamptz default now()
);

-- ── Tabla: ventas ────────────────────────────────────────────────────────
create table if not exists ventas (
  id              uuid primary key default gen_random_uuid(),
  fecha           date not null default current_date,
  cliente_id      uuid references clientes(id) on delete set null,
  cliente_nombre  text,
  total           numeric(12,2) default 0,
  estado          text default 'completada',
  notas           text,
  created_at      timestamptz default now()
);

-- ── Tabla: items de venta ────────────────────────────────────────────────
create table if not exists venta_items (
  id               uuid primary key default gen_random_uuid(),
  venta_id         uuid not null references ventas(id) on delete cascade,
  producto_id      uuid references productos(id) on delete set null,
  producto_nombre  text not null,
  cantidad         integer not null default 1,
  precio_unitario  numeric(12,2) not null,
  subtotal         numeric(12,2) not null,
  moneda           text default 'USD',
  created_at       timestamptz default now()
);

-- ── Tabla: planes de pago ────────────────────────────────────────────────
create table if not exists pagos_plan (
  id              uuid primary key default gen_random_uuid(),
  venta_id        uuid not null references ventas(id) on delete cascade,
  total_cuotas    integer not null,
  monto_por_cuota numeric(12,2) not null,
  moneda          text default 'USD',
  fecha_inicio    date not null,
  created_at      timestamptz default now()
);

create table if not exists pagos_cuota (
  id                uuid primary key default gen_random_uuid(),
  plan_id           uuid not null references pagos_plan(id) on delete cascade,
  numero_cuota      integer not null,
  fecha_vencimiento date not null,
  monto             numeric(12,2) not null,
  pagado            boolean default false,
  fecha_pago        date,
  created_at        timestamptz default now()
);

-- ── Tabla: garantías ─────────────────────────────────────────────────────
create table if not exists garantias (
  id                 uuid primary key default gen_random_uuid(),
  venta_id           uuid references ventas(id) on delete set null,
  cliente_nombre     text not null,
  producto_nombre    text not null,
  fecha_compra       date not null,
  duracion_meses     integer not null,
  fecha_vencimiento  date not null,
  notas              text,
  created_at         timestamptz default now()
);

-- ── Tabla: proveedores ───────────────────────────────────────────────────
create table if not exists proveedores (
  id                  uuid primary key default gen_random_uuid(),
  nombre              text not null,
  pais                text,
  contacto            text,
  email               text,
  telefono            text,
  condiciones_pago    text,
  tiempo_entrega_dias integer,
  notas               text,
  created_at          timestamptz default now()
);

-- ── Tabla: servicio técnico ──────────────────────────────────────────────
create table if not exists servicio_tecnico (
  id                      uuid primary key default gen_random_uuid(),
  cliente_nombre          text not null,
  cliente_telefono        text,
  ebike                   text,
  problema_reportado      text,
  diagnostico             text,
  costo                   numeric(12,2) default 0,
  moneda                  text default 'USD',
  estado                  text default 'pendiente' check (estado in ('pendiente','en_proceso','listo','entregado')),
  fecha_ingreso           date default current_date,
  fecha_estimada_entrega  date,
  notas                   text,
  created_at              timestamptz default now()
);

-- ── Tabla: log de actividad ──────────────────────────────────────────────
create table if not exists activity_log (
  id        uuid primary key default gen_random_uuid(),
  timestamp timestamptz default now(),
  usuario   text,
  email     text,
  accion    text not null,
  modulo    text,
  detalles  text
);

-- ── Row Level Security (RLS) ─────────────────────────────────────────────
-- Habilitar RLS en todas las tablas
alter table empresa          enable row level security;
alter table profiles         enable row level security;
alter table productos        enable row level security;
alter table clientes         enable row level security;
alter table historial_compras enable row level security;
alter table ventas           enable row level security;
alter table venta_items      enable row level security;
alter table pagos_plan       enable row level security;
alter table pagos_cuota      enable row level security;
alter table garantias        enable row level security;
alter table proveedores      enable row level security;
alter table servicio_tecnico enable row level security;
alter table activity_log     enable row level security;

-- Políticas: cualquier usuario autenticado puede leer/escribir
-- (la lógica de roles se maneja en el frontend)
create policy "Authenticated users full access" on empresa
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on profiles
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on productos
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on clientes
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on historial_compras
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on ventas
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on venta_items
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on pagos_plan
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on pagos_cuota
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on garantias
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on proveedores
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on servicio_tecnico
  for all using (auth.role() = 'authenticated');

create policy "Authenticated users full access" on activity_log
  for all using (auth.role() = 'authenticated');

-- ── Trigger: auto-crear perfil cuando se registra un usuario ─────────────
create or replace function handle_new_user()
returns trigger as $$
begin
  insert into profiles (id, nombre, email, rol)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'nombre', split_part(new.email, '@', 1)),
    new.email,
    coalesce(new.raw_user_meta_data->>'rol', 'viewer')
  );
  return new;
end;
$$ language plpgsql security definer;

-- Eliminar trigger si existe y recrear
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();
