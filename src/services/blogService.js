import api from '../api/client';

export const getBlogs = async () => {
  const { data } = await api.get('/blog');
  return Array.isArray(data) ? data : data?.blogs || [];
};

export const getBlogBySlug = async (slug) => {
  const { data } = await api.get(`/blog/${slug}`);
  return data;
};
