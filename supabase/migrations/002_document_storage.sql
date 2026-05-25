-- Create private storage bucket for package documents (50 MB per file)
insert into storage.buckets (id, name, public, file_size_limit)
values ('package-documents', 'package-documents', false, 52428800)
on conflict (id) do nothing;

-- RLS: upload — first path segment must be the authenticated user's uid
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Users can upload own documents'
  ) then
    execute $p$
      create policy "Users can upload own documents"
      on storage.objects for insert
      with check (
        bucket_id = 'package-documents'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
    $p$;
  end if;
end $$;

-- RLS: read — same ownership check
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Users can read own documents'
  ) then
    execute $p$
      create policy "Users can read own documents"
      on storage.objects for select
      using (
        bucket_id = 'package-documents'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
    $p$;
  end if;
end $$;

-- RLS: delete — same ownership check
do $$ begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
    and policyname = 'Users can delete own documents'
  ) then
    execute $p$
      create policy "Users can delete own documents"
      on storage.objects for delete
      using (
        bucket_id = 'package-documents'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
    $p$;
  end if;
end $$;

-- Add storage_path to documents table (nullable for legacy rows with no file)
alter table public.documents
  add column if not exists storage_path text default '';
