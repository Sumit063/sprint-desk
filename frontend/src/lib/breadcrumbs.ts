const isBrowser = typeof window !== "undefined";

export const setIssueBreadcrumb = (issueId: string, ticketId?: string | null) => {
  if (!isBrowser || !ticketId) return;
  window.sessionStorage.setItem(`issue-ticket:${issueId}`, ticketId);
  window.dispatchEvent(new Event("issue-ticket-updated"));
};

export const getIssueBreadcrumb = (issueId: string, fallback?: string) => {
  if (!isBrowser) return fallback ?? issueId;
  return window.sessionStorage.getItem(`issue-ticket:${issueId}`) ?? fallback ?? issueId;
};

export const setKbBreadcrumb = (articleId: string, kbId?: string | null) => {
  if (!isBrowser || !kbId) return;
  window.sessionStorage.setItem(`kb-id:${articleId}`, kbId);
  window.dispatchEvent(new Event("kb-article-updated"));
};

export const getKbBreadcrumb = (articleId: string, fallback = "Article") => {
  if (!isBrowser) return fallback;
  return window.sessionStorage.getItem(`kb-id:${articleId}`) ?? fallback;
};
