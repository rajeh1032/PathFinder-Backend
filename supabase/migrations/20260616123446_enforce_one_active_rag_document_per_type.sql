do $$
declare
  duplicate_record record;
begin
  select
    type,
    count(*) as active_count,
    array_agg(id order by created_at) as document_ids
  into duplicate_record
  from public.rag_documents
  where is_active = true
    and type is not null
  group by type
  having count(*) > 1
  limit 1;

  if found then
    raise exception
      'Cannot create unique active RAG document index: type "%" has % active documents (%). Delete or deactivate duplicates before applying this migration.',
      duplicate_record.type,
      duplicate_record.active_count,
      duplicate_record.document_ids;
  end if;
end $$;

create unique index if not exists idx_rag_documents_one_active_per_type
on public.rag_documents(type)
where is_active = true;
