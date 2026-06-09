const buildPaginationMeta = ({ page = 1, limit = 10, totalItems = 0 } = {}) => {
  const safePage = Math.max(1, Number(page) || 1);
  const safeLimit = Math.max(1, Number(limit) || 10);
  const totalPages = Math.max(1, Math.ceil(totalItems / safeLimit));

  return {
    page: safePage,
    limit: safeLimit,
    totalItems,
    totalPages,
    hasNextPage: safePage < totalPages,
    hasPreviousPage: safePage > 1,
    nextPage: safePage < totalPages ? safePage + 1 : null,
    previousPage: safePage > 1 ? safePage - 1 : null,
  };
};

const getPaginationParams = (query = {}) => {
  const page = Number(query.page) || 1;
  const limit = Number(query.limit) || 10;

  return { page, limit };
};

const paginateData = (items, query = {}, totalItems = items.length) => {
  const { page, limit } = getPaginationParams(query);
  const startIndex = (page - 1) * limit;
  const endIndex = startIndex + limit;
  const paginatedItems = Array.isArray(items)
    ? items.slice(startIndex, endIndex)
    : [];

  return {
    data: paginatedItems,
    pagination: buildPaginationMeta({ page, limit, totalItems }),
  };
};

module.exports = {
  buildPaginationMeta,
  getPaginationParams,
  paginateData,
};
