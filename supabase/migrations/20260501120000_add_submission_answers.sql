-- Persist recipient context-question answers with each submission.
--
-- The public recipient flow authenticates through the x-request-token header;
-- workspace users authenticate through normal Supabase auth + membership RLS.

create table if not exists public.submission_answers (
  id uuid primary key default gen_random_uuid(),
  submission_id uuid not null references public.submissions(id) on delete cascade,
  request_id uuid not null references public.photo_brief_requests(id) on delete cascade,
  workspace_id uuid not null references public.business_workspaces(id) on delete cascade,
  question_id uuid null references public.context_questions(id) on delete set null,
  prompt text not null,
  answer text not null,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists submission_answers_submission_idx
  on public.submission_answers(submission_id, order_index);

create index if not exists submission_answers_request_idx
  on public.submission_answers(request_id);

alter table public.submission_answers enable row level security;

-- Workspace members can read/write answers for their workspace.
drop policy if exists "Workspace members can read submission answers" on public.submission_answers;
create policy "Workspace members can read submission answers"
  on public.submission_answers
  for select
  using (public.is_workspace_member(workspace_id));

drop policy if exists "Workspace members can manage submission answers" on public.submission_answers;
create policy "Workspace members can manage submission answers"
  on public.submission_answers
  for all
  using (public.is_workspace_member(workspace_id))
  with check (public.is_workspace_member(workspace_id));

-- Token-scoped public recipient flow can read/insert/update/delete only answers
-- attached to the request resolved from x-request-token. Delete is needed so a
-- retried final submit can replace the answer set idempotently.
drop policy if exists "Request token can read submission answers" on public.submission_answers;
create policy "Request token can read submission answers"
  on public.submission_answers
  for select
  using (request_id = public.request_id_for_token());

drop policy if exists "Request token can insert submission answers" on public.submission_answers;
create policy "Request token can insert submission answers"
  on public.submission_answers
  for insert
  with check (request_id = public.request_id_for_token());

drop policy if exists "Request token can update submission answers" on public.submission_answers;
create policy "Request token can update submission answers"
  on public.submission_answers
  for update
  using (request_id = public.request_id_for_token())
  with check (request_id = public.request_id_for_token());

drop policy if exists "Request token can delete submission answers" on public.submission_answers;
create policy "Request token can delete submission answers"
  on public.submission_answers
  for delete
  using (request_id = public.request_id_for_token());
