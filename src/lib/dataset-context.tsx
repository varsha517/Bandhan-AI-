import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { supabase } from './supabase';
import { useAuth } from './auth';
import type { UploadedDataset } from './types';

interface DatasetContextValue {
  datasets: UploadedDataset[];
  activeDatasetId: string | null;
  activeDataset: UploadedDataset | null;
  setActiveDatasetId: (id: string | null) => void;
  loading: boolean;
  refreshDatasets: () => Promise<void>;
}

const DatasetContext = createContext<DatasetContextValue | undefined>(undefined);

const STORAGE_KEY = 'bandhanai_active_dataset';

export function DatasetProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [datasets, setDatasets] = useState<UploadedDataset[]>([]);
  const [activeDatasetId, setActiveDatasetIdState] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchDatasets = async (): Promise<UploadedDataset[]> => {
    const { data, error } = await supabase.from('uploaded_datasets').select('*').order('created_at', { ascending: false });
    if (!error && data) {
      const list = data as UploadedDataset[];
      setDatasets(list);
      return list;
    }
    return [];
  };

  const refreshDatasets = async (): Promise<void> => {
    const list = await fetchDatasets();
    setLoading(false);
    // If active dataset no longer exists in list, update active dataset
    if (activeDatasetId && !list.some((d) => d.id === activeDatasetId)) {
      if (list.length > 0) {
        setActiveDatasetId(list[0].id);
      } else {
        setActiveDatasetId(null);
      }
    }
  };

  useEffect(() => {
    if (!user) {
      setDatasets([]);
      setActiveDatasetIdState(null);
      setLoading(false);
      return;
    }

    (async () => {
      const data = await fetchDatasets();

      const stored = localStorage.getItem(STORAGE_KEY);
      const validIds = new Set(data.map((d) => d.id));
      const isValid = stored && validIds.has(stored);

      if (isValid) {
        setActiveDatasetIdState(stored);
      } else if (data.length > 0) {
        const firstId = data[0].id;
        setActiveDatasetIdState(firstId);
        localStorage.setItem(STORAGE_KEY, firstId);
      } else {
        setActiveDatasetIdState(null);
      }

      setLoading(false);
    })();
  }, [user]);

  const setActiveDatasetId = (id: string | null) => {
    setActiveDatasetIdState(id);
    if (id) {
      localStorage.setItem(STORAGE_KEY, id);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  const activeDataset = datasets.find((d) => d.id === activeDatasetId) ?? null;

  return (
    <DatasetContext.Provider
      value={{
        datasets,
        activeDatasetId,
        activeDataset,
        setActiveDatasetId,
        loading,
        refreshDatasets,
      }}
    >
      {children}
    </DatasetContext.Provider>
  );
}

export function useDataset() {
  const ctx = useContext(DatasetContext);
  if (!ctx) throw new Error('useDataset must be used within DatasetProvider');
  return ctx;
}
