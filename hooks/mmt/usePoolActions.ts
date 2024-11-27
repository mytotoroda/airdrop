// hooks/mmt/usePoolActions.ts
interface UsePoolActionsProps {
  fetchPools: () => Promise<void>;
  setError: (error: string | null) => void;
}

export function usePoolActions({ fetchPools, setError }: UsePoolActionsProps) {
  const togglePoolStatus = async (poolId: number, currentEnabled: boolean) => {
    try {
      const response = await fetch(`/api/mmt/pools/toggle/${poolId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          enabled: !currentEnabled,
          network: process.env.NEXT_PUBLIC_NETWORK 
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to update pool status');
      }

      await fetchPools();
      
    } catch (error) {
      console.error('Error toggling pool status:', error);
      setError(error instanceof Error ? error.message : 'Failed to toggle pool status');
    }
  };

  const handleRefresh = () => {
    fetchPools();
  };

  return {
    togglePoolStatus,
    handleRefresh
  };
}