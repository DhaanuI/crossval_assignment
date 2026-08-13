const parsePagination = (query = {}) => {
  const page = Math.max(parseInt(query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(query.limit, 10) || 10, 1), 50);
  return { page, limit, skip: (page - 1) * limit };
};

const paginateItems = (items, query = {}) => {
  const { page, limit } = parsePagination(query);
  const total = items.length;
  const pages = Math.max(Math.ceil(total / limit), 1);
  const currentPage = Math.min(page, pages);

  return {
    items: items.slice((currentPage - 1) * limit, currentPage * limit),
    pagination: {
      page: currentPage,
      limit,
      total,
      pages,
      hasNext: currentPage < pages,
      hasPrev: currentPage > 1,
    },
  };
};

module.exports = {
  parsePagination,
  paginateItems,
};
