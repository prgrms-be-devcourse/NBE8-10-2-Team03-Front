export const formatDateTime = (value?: string | null) => {
  if (!value) return "";
  return value.replace(/(\d{2}:\d{2}:\d{2})\.\d+/, "$1");
};
