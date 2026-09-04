create table if not exists spp_target (
  kelas text primary key,
  target numeric not null default 0
);

insert into spp_target (kelas, target) values
  ('KELAS 1', 70000),
  ('KELAS 2', 60000),
  ('KELAS 3', 60000),
  ('KELAS 4', 60000),
  ('KELAS 5', 60000),
  ('KELAS 6', 60000)
on conflict (kelas) do nothing;
