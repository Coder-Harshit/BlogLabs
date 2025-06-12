export const isMobile = (): boolean => {
  if (typeof window === 'undefined') return false; // SSR check
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};