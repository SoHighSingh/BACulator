import { api } from "~/trpc/react";

export function useTab() {
  const utils = api.useUtils();
  const currentTabQuery = api.post.getCurrentTab.useQuery(undefined, { 
    refetchOnWindowFocus: false 
  });

  const startTab = api.post.startTab.useMutation({
    onSuccess: () => { 
      void currentTabQuery.refetch();
      void utils.post.getDrinks.invalidate();
    },
    onError: (error) => {
      console.error('Start tab error:', error);
      alert('Failed to start drinking session. Please try again.');
    },
  });

  const stopTab = api.post.stopTab.useMutation({
    onSuccess: () => {
      void currentTabQuery.refetch();
      void utils.post.getDrinks.invalidate();
    },
    onError: (error) => {
      console.error('Stop tab error:', error);
      alert('Failed to stop drinking session. Please try again.');
    },
  });

  return {
    currentTabQuery,
    startTab,
    stopTab,
    currentTab: currentTabQuery.data,
    hasActiveTab: !!currentTabQuery.data,
  };
}