-- Add project identity fields used to distinguish recurring events.
alter table projects
  add column if not exists event_date date;

alter table projects
  add column if not exists venue text;

create index if not exists idx_projects_event_date
  on projects(event_date);
