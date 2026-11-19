-- Bilingual campaigns: Arabic stays in title/summary/story; English goes in *_en (falls back to Arabic when empty).
alter table public.dw_campaigns add column if not exists title_en text, add column if not exists summary_en text, add column if not exists story_en text;
alter table public.dwt_campaigns add column if not exists title_en text, add column if not exists summary_en text, add column if not exists story_en text;
