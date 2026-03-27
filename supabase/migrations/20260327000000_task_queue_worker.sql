-- TaskQueue Worker Infrastructure
-- Adds result_json column, updated_at trigger, polling index, and dequeue RPC

-- 1. Add result_json column (separate from payload_json for clean input/output separation)
alter table public.task_queue add column if not exists result_json jsonb;

-- 2. Add updated_at trigger (missing from original table creation)
create trigger set_task_queue_updated_at
  before update on public.task_queue
  for each row execute function public.set_updated_at();

-- 3. Partial index for the polling query
create index idx_task_queue_polling
  on public.task_queue (status, next_retry_at, created_at)
  where status in ('pending', 'failed_retry');

-- 4. Retry RPC — atomically increment retry_count and update status/error/next_retry_at
create or replace function public.retry_task(
  task_id uuid,
  error_text text,
  next_retry timestamptz
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.task_queue
  set status = 'failed_retry',
      retry_count = retry_count + 1,
      error_log = error_text,
      next_retry_at = next_retry,
      updated_at = now()
  where id = task_id;
end;
$$;

-- 5. Dequeue RPC — atomically claim tasks for processing
-- Uses FOR UPDATE SKIP LOCKED to prevent double-processing across concurrent workers
create or replace function public.dequeue_task(batch_size int default 1)
returns setof public.task_queue
language plpgsql
security definer
set search_path = ''
as $$
begin
  return query
  update public.task_queue
  set status = 'processing', updated_at = now()
  where id in (
    select id from public.task_queue
    where dead_lettered_at is null
      and (status = 'pending'
        or (status = 'failed_retry'
            and next_retry_at <= now()
            and retry_count < max_retries))
    order by created_at
    limit batch_size
    for update skip locked
  )
  returning *;
end;
$$;
