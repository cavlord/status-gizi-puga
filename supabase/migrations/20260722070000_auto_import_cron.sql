-- Enable pg_cron and pg_net extensions
create extension if not exists pg_cron;
create extension if not exists pg_net;

-- Schedule daily auto-import at 07:00 AM UTC
select cron.schedule(
  'auto-import-daily-0700',
  '0 7 * * *',
  $$
  select net.http_post(
    url    := current_setting('app.supabase_url') || '/functions/v1/auto-import-scheduler',
    headers := '{"Content-Type":"application/json","Authorization":"Bearer ' || current_setting('app.service_role_key') || '"}'::jsonb,
    body   := '{}'::jsonb
  ) as request_id;
  $$
);
