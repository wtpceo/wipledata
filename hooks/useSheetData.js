'use client';

import { useState, useCallback } from 'react';
import { useSmartRefresh } from './useSmartRefresh';

export function useSheetData(type = 'sales') {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await fetch(`/api/sheets?type=${type}`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result = await response.json();

      if (result.error) {
        throw new Error(result.error);
      }

      setData(result);
      setLastUpdated(new Date());
    } catch (err) {
      console.error('Error fetching sheet data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [type]);

  useSmartRefresh(fetchData);

  return {
    data,
    loading,
    error,
    lastUpdated,
    refresh: fetchData
  };
}
