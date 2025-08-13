import { api } from "~/trpc/react";

export function useDrinks(hasActiveTab = true) {
  const drinksQuery = api.post.getDrinks.useQuery(undefined, { 
    enabled: hasActiveTab,
    refetchOnWindowFocus: false 
  });

  const addDrink = api.post.addDrink.useMutation({
    onSuccess: () => {
      void drinksQuery.refetch();
    },
    onError: (error) => {
      console.error('Add drink error:', error);
      alert('Failed to add drink. Please try again.');
    },
  });

  const updateDrink = api.post.updateDrink.useMutation({
    onSuccess: () => {
      void drinksQuery.refetch();
    },
    onError: (error) => {
      console.error('Update drink error:', error);
      alert('Failed to update drink. Please try again.');
    },
  });

  const deleteDrink = api.post.deleteDrink.useMutation({
    onSuccess: () => {
      void drinksQuery.refetch();
    },
    onError: (error) => {
      console.error('Delete drink error:', error);
      alert('Failed to delete drink. Please try again.');
    },
  });

  return {
    drinksQuery,
    addDrink,
    updateDrink,
    deleteDrink,
    drinks: drinksQuery.data ?? [],
  };
}