-- 9SM Platform, stage 8: clients add things to the calendar themselves, with a file if they have one.

alter table public.requests drop constraint if exists requests_kind_check;
alter table public.requests add constraint requests_kind_check check (kind in
  ('Casino offer', 'Sports offer', 'Event', 'Birthday or anniversary', 'Product news', 'Other', 'Offer'));
alter table public.requests add column if not exists attachment_path text;

-- Operators may now also add files to their own client's requests folder.
drop policy if exists client_files_operator_brand on storage.objects;
create policy client_files_operator_brand on storage.objects for insert to authenticated
  with check (bucket_id = 'client-files'
              and public.is_member(public.try_uuid((storage.foldername(name))[1]))
              and (storage.foldername(name))[2] in ('brand', 'requests'));
