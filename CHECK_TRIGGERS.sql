
-- Bu sorguyu Supabase SQL Editor'de çalıştırarak tetikleyicileri (triggers) kontrol edin
select event_object_schema as table_schema,
       event_object_table as table_name,
       trigger_schema,
       trigger_name,
       action_statement
from information_schema.triggers
where event_object_table = 'users'
and event_object_schema = 'auth';
