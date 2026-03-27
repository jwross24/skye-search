-- CV Upload Storage Bucket
-- Private bucket for CV files (PDF/DOCX), encrypted at rest by Supabase Storage

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'cv-uploads',
  'cv-uploads',
  false,
  10485760, -- 10MB
  array['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
);

-- RLS: users can only access their own folder ({user_id}/*)
create policy "Users can upload own CVs"
  on storage.objects for insert
  with check (
    bucket_id = 'cv-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can read own CVs"
  on storage.objects for select
  using (
    bucket_id = 'cv-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "Users can delete own CVs"
  on storage.objects for delete
  using (
    bucket_id = 'cv-uploads'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
