-- Takara: private receipt storage. Existing bucket settings are preserved.
-- Upload/read access must use verified household authorization; no anonymous policy is added.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('receipts', 'receipts', false, 10485760,
  array['image/jpeg','image/png','image/webp','image/heic','image/heif','application/pdf'])
on conflict (id) do nothing;

select id, name, public, file_size_limit, allowed_mime_types
from storage.buckets where id = 'receipts';
