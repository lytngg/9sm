-- 9SM Platform, stage 3: staff profiles with photos, and a social media manager per client.
-- Run this in the Supabase SQL editor after 002_calendar_requests_posts.sql.

alter table public.profiles add column if not exists full_name text;
alter table public.profiles add column if not exists title text;
alter table public.profiles add column if not exists photo_url text;

-- The staff member who runs this client's accounts.
alter table public.clients add column if not exists smm_id uuid references public.profiles on delete set null;

-- Staff edit their own name, title and photo through this. Nothing else on a
-- profile can be changed from the app, so nobody can alter their own role.
create or replace function public.update_my_profile(p_name text, p_title text, p_photo text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_staff() then
    raise exception 'Only staff have a profile to edit';
  end if;
  if p_photo is not null and p_photo not like 'https://%' then
    raise exception 'Photo must be an https address';
  end if;
  update public.profiles
    set full_name = nullif(trim(coalesce(p_name, '')), ''),
        title = nullif(trim(coalesce(p_title, '')), ''),
        photo_url = coalesce(p_photo, photo_url)
    where id = auth.uid();
end;
$$;

-- What an operator may know about their social media manager: name, title and
-- photo. Not the email address, and nothing about any other member of staff.
create or replace function public.client_smm(p_client uuid)
returns table (full_name text, title text, photo_url text)
language sql stable security definer set search_path = public as $$
  select p.full_name, p.title, p.photo_url
  from public.clients c
  join public.profiles p on p.id = c.smm_id
  where c.id = p_client
    and p.role = 'staff'
    and (public.is_staff() or public.is_member(p_client));
$$;

revoke execute on function public.update_my_profile(text, text, text) from public, anon;
revoke execute on function public.client_smm(uuid) from public, anon;
grant execute on function public.update_my_profile(text, text, text) to authenticated;
grant execute on function public.client_smm(uuid) to authenticated;

-- Photo storage. Anyone can view a photo by its address. Only staff can upload,
-- and only into their own folder. Limited to 2 MB JPEG, PNG or WebP.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('avatars', 'avatars', true, 2097152, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

drop policy if exists avatars_staff_insert on storage.objects;
create policy avatars_staff_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'avatars' and public.is_staff() and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_staff_update on storage.objects;
create policy avatars_staff_update on storage.objects for update to authenticated
  using (bucket_id = 'avatars' and public.is_staff() and (storage.foldername(name))[1] = auth.uid()::text);
drop policy if exists avatars_staff_delete on storage.objects;
create policy avatars_staff_delete on storage.objects for delete to authenticated
  using (bucket_id = 'avatars' and public.is_staff() and (storage.foldername(name))[1] = auth.uid()::text);
