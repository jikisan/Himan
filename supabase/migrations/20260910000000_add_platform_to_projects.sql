alter table profile_projects
  add column platform text[] not null default '{}';
