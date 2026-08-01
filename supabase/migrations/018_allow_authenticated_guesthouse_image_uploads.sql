drop policy if exists "owners_select_own_guesthouse_images"
on storage.objects;

drop policy if exists "owners_upload_own_guesthouse_images"
on storage.objects;

drop policy if exists "owners_delete_own_guesthouse_images"
on storage.objects;

create policy "owners_select_own_guesthouse_images"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'guesthouse-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "owners_upload_own_guesthouse_images"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'guesthouse-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);

create policy "owners_delete_own_guesthouse_images"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'guesthouse-images'
  and (storage.foldername(name))[1] = auth.uid()::text
);
