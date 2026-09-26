-- RLS regression tests for tenant isolation.
-- These tests are transaction-scoped and are rolled back by pgTAP/Supabase.
--
-- They deliberately test the authorization boundary with synthetic UUIDs;
-- no real user accounts or production rows are required.

begin;

select plan(10);

-- Structural checks: the security boundary must exist.
select has_table('public', 'shops', 'shops table exists');
select has_table('public', 'employees', 'employees table exists');
select has_column('public', 'employees', 'user_id', 'employees.user_id exists');
select has_index('public', 'employees', 'employees_user_id_idx', 'employee auth binding is indexed');

select results_eq(
  $$select count(*)::int
    from pg_class
    where oid = 'public.shops'::regclass
      and relrowsecurity$$,
  $$values (1)$$,
  'RLS is enabled on shops'
);

select results_eq(
  $$select count(*)::int
    from pg_class
    where oid = 'public.employees'::regclass
      and relrowsecurity$$,
  $$values (1)$$,
  'RLS is enabled on employees'
);

-- Synthetic tenant identities.
select set_config('request.jwt.claim.role', 'authenticated', true);
select set_config('request.jwt.claim.sub', '11111111-1111-1111-1111-111111111111', true);

insert into public.shops (id, owner_id, name, shop_code)
values
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'RLS Shop A', 'RLS-A'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '22222222-2222-2222-2222-222222222222', 'RLS Shop B', 'RLS-B');

insert into public.employees (id, shop_id, user_id, email, name, role)
values
  ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
   '33333333-3333-3333-3333-333333333333', 'rls-employee@example.test', 'RLS Employee', 'employee');

-- Switch from the setup owner (postgres) into the API role so RLS is actually evaluated.
set local role authenticated;

-- Owner sees only the owned shop.
select results_eq(
  $$select count(*)::int from public.shops$$,
  $$values (1)$$,
  'owner cannot see another tenant shop'
);

-- Employee linked through employees.user_id sees its shop.
select set_config('request.jwt.claim.sub', '33333333-3333-3333-3333-333333333333', true);

select results_eq(
  $$select count(*)::int
    from public.shops
    where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'$$,
  $$values (1)$$,
  'employee auth binding grants access to its shop'
);

-- Employee must not be able to create/modify team membership.
select throws_ok(
  $$insert into public.employees
      (id, shop_id, user_id, email, name, role)
    values
      ('dddddddd-dddd-dddd-dddd-dddddddddddd',
       'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
       '44444444-4444-4444-4444-444444444444',
       'attacker@example.test',
       'Attacker',
       'admin')$$,
  '42501',
  'employee cannot insert another employee'
);

-- Employee cannot update an existing employee's role.
select results_eq(
  $sql$update public.employees
    set role = 'admin'
    where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc'
    returning id$sql$,
  $expected$select null::uuid where false$expected$,
  'employee cannot change employee role'
);

-- Anonymous access must be denied at the grant boundary.
set local role anon;

select throws_ok(
  $$select count(*) from public.employees$$,
  '42501',
  'anon cannot read employees'
);

select * from finish();

rollback;
