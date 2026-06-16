const AppError = require('../../common/errors/AppError');
const { supabase, isConfigured } = require('../../config/supabase');

const ACTIVE_RAG_DOCUMENT_TYPE_CONFLICT_MESSAGE =
  'An active RAG document for this type already exists. Delete it before adding a new one.';

const ensureSupabase = () => {
  if (!isConfigured || !supabase) {
    throw new AppError('Supabase is not configured', 500);
  }

  return supabase;
};

const handleSupabaseError = (error, message, statusCode = 500) => {
  if (error) {
    const errorText = `${error.message || ''} ${error.details || ''} ${error.hint || ''}`;
    if (
      error.code === '23505' &&
      errorText.includes('idx_rag_documents_one_active_per_type')
    ) {
      throw new AppError(ACTIVE_RAG_DOCUMENT_TYPE_CONFLICT_MESSAGE, 409, {
        code: error.code,
        hint: error.hint,
      });
    }

    throw new AppError(message, statusCode, {
      code: error.code,
      hint: error.hint,
    });
  }
};

const createDocument = async (documentPayload) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('rag_documents')
    .insert(documentPayload)
    .select('*')
    .single();

  handleSupabaseError(error, 'Failed to create RAG document');
  return data;
};

const listDocuments = async ({ type } = {}) => {
  const client = ensureSupabase();
  let query = client
    .from('rag_documents')
    .select('*')
    .order('created_at', { ascending: false });

  if (type) {
    query = query.eq('type', type);
  }

  const { data, error } = await query;
  handleSupabaseError(error, 'Failed to list RAG documents');
  return data || [];
};

const findDocumentById = async (id) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('rag_documents')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch RAG document');
  return data;
};

const findActiveDocumentByType = async (type) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('rag_documents')
    .select('*')
    .eq('type', type)
    .eq('is_active', true)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch active RAG document by type');
  return data;
};

const findActiveDocumentByTypeExcludingId = async (type, id) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('rag_documents')
    .select('*')
    .eq('type', type)
    .eq('is_active', true)
    .neq('id', id)
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle();

  handleSupabaseError(
    error,
    'Failed to fetch active RAG document by type',
  );
  return data;
};

const findDocumentWithChunksById = async (id) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('rag_documents')
    .select('*, rag_chunks(*)')
    .eq('id', id)
    .maybeSingle();

  handleSupabaseError(error, 'Failed to fetch RAG document');

  if (data?.rag_chunks) {
    data.rag_chunks.sort((a, b) => a.chunk_index - b.chunk_index);
  }

  return data;
};

const updateDocument = async (id, documentPayload) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('rag_documents')
    .update(documentPayload)
    .eq('id', id)
    .select('*')
    .single();

  handleSupabaseError(error, 'Failed to update RAG document');
  return data;
};

const deleteChunksByDocumentId = async (documentId) => {
  const client = ensureSupabase();
  const { error } = await client
    .from('rag_chunks')
    .delete()
    .eq('rag_document_id', documentId);

  handleSupabaseError(error, 'Failed to delete RAG document chunks');
};

const createChunks = async (chunks) => {
  if (!chunks.length) {
    return [];
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('rag_chunks')
    .insert(chunks)
    .select('*');

  handleSupabaseError(error, 'Failed to create RAG document chunks');
  return data || [];
};

const uploadDocumentFile = async ({ storagePath, buffer, contentType }) => {
  const client = ensureSupabase();
  const { data, error } = await client.storage
    .from('rag-documents')
    .upload(storagePath, buffer, {
      contentType,
      upsert: false,
    });

  handleSupabaseError(error, 'Failed to upload RAG document file');
  return data;
};

const deleteDocumentFile = async (storagePath) => {
  if (!storagePath) {
    return;
  }

  const client = ensureSupabase();
  const { error } = await client.storage
    .from('rag-documents')
    .remove([storagePath]);

  handleSupabaseError(error, 'Failed to delete RAG document file');
};

const findActiveIndexedDocumentsByType = async (type) => {
  const client = ensureSupabase();
  const { data, error } = await client
    .from('rag_documents')
    .select('id, title, created_at')
    .eq('type', type)
    .eq('is_active', true)
    .eq('index_status', 'indexed')
    .order('created_at', { ascending: true });

  handleSupabaseError(error, 'Failed to fetch RAG context documents');
  return data || [];
};

const findChunksByDocumentIds = async (documentIds) => {
  if (!documentIds.length) {
    return [];
  }

  const client = ensureSupabase();
  const { data, error } = await client
    .from('rag_chunks')
    .select('rag_document_id, content, chunk_index, token_count, metadata')
    .in('rag_document_id', documentIds)
    .order('chunk_index', { ascending: true });

  handleSupabaseError(error, 'Failed to fetch RAG context chunks');
  return data || [];
};

module.exports = {
  createDocument,
  listDocuments,
  findDocumentById,
  findActiveDocumentByType,
  findActiveDocumentByTypeExcludingId,
  findDocumentWithChunksById,
  updateDocument,
  deleteChunksByDocumentId,
  createChunks,
  uploadDocumentFile,
  deleteDocumentFile,
  findActiveIndexedDocumentsByType,
  findChunksByDocumentIds,
};
