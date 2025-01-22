'use client';

import { createContext, useContext, useState, ReactNode, useMemo, useEffect } from 'react';

interface StatusLog {
  timestamp: number;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

type DomainStatus = 
  | 'loading' 
  | 'success' 
  | 'timeout'
  | 'connection_refused'
  | 'dns_error'
  | 'ssl_error'
  | 'invalid_response'
  | 'internal_error';

interface DomainResult {
  domain: string;
  title: string;
  screenshot: string;
  favicon?: string;
  status: DomainStatus;
  timestamp: number;
  logs: StatusLog[];
  responseTime?: number;
  error?: string;
  errorCode?: string;
  isHighPriority: boolean;
}

interface SearchContextType {
  results: DomainResult[];
  filteredResults: DomainResult[];
  filters: {
    onlyScreenshots: boolean;
    onlyLive: boolean;
    onlyErrors: boolean;
  };
  setFilters: (filters: Partial<SearchContextType['filters']>) => void;
  addResult: (result: DomainResult) => void;
  updateResult: (domain: string, updates: Partial<DomainResult>) => void;
  addLog: (domain: string, log: Omit<StatusLog, 'timestamp'>) => void;
  clearResults: () => void;
  recheckDomain: (domain: string) => void;
}

const SearchContext = createContext<SearchContextType | undefined>(undefined);

export function SearchProvider({ children }: { children: ReactNode }) {
  const [results, setResults] = useState<DomainResult[]>([]);
  const [filters, setFilters] = useState({
    onlyScreenshots: false,
    onlyLive: false,
    onlyErrors: false,
  });

  const addResult = (result: DomainResult) => {
    setResults(prev => {
      // Check if domain already exists
      const existingIndex = prev.findIndex(r => r.domain === result.domain);
      if (existingIndex >= 0) {
        // Update existing result while preserving existing fields if not in update
        const newResults = [...prev];
        newResults[existingIndex] = {
          ...newResults[existingIndex],
          ...result,
          logs: [
            ...newResults[existingIndex].logs,
            ...(result.logs || [])
          ]
        };
        return newResults;
      }
      // Add new result
      return [...prev, {
        ...result,
        timestamp: Date.now(),
        logs: [{
          timestamp: Date.now(),
          message: 'Starting domain check...',
          type: 'info'
        }]
      }];
    });
  };

  const updateResult = (domain: string, updates: Partial<DomainResult>) => {
    setResults(prev => {
      const existingIndex = prev.findIndex(r => r.domain === domain);
      if (existingIndex === -1) return prev;

      const newResults = [...prev];
      const existingResult = newResults[existingIndex];
      
      // Preserve existing fields if they're not in the update
      newResults[existingIndex] = {
        ...existingResult,
        ...updates,
        // Don't override these fields unless explicitly provided
        title: updates.title ?? existingResult.title,
        screenshot: updates.screenshot ?? existingResult.screenshot,
        favicon: updates.favicon ?? existingResult.favicon,
        logs: [
          ...existingResult.logs,
          ...(updates.logs || [])
        ]
      };
      return newResults;
    });
  };

  const addLog = (domain: string, log: Omit<StatusLog, 'timestamp'>) => {
    setResults(prev => {
      const existingIndex = prev.findIndex(r => r.domain === domain);
      if (existingIndex === -1) return prev;

      const newResults = [...prev];
      newResults[existingIndex] = {
        ...newResults[existingIndex],
        logs: [
          ...newResults[existingIndex].logs,
          { ...log, timestamp: Date.now() }
        ]
      };
      return newResults;
    });
  };

  const clearResults = () => {
    setResults([]);
  };

  const recheckDomain = async (domain: string) => {
    // Reset the domain status
    updateResult(domain, {
      status: 'loading',
      title: '',
      screenshot: '',
      favicon: '',
      error: undefined,
      errorCode: undefined,
      responseTime: undefined,
      timestamp: Date.now(),
      logs: [{
        timestamp: Date.now(),
        message: 'Restarting domain check...',
        type: 'info'
      }]
    });

    // Trigger the recheck
    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword: domain.split('.')[0], singleDomain: domain }),
      });

      if (!response.ok) {
        throw new Error('Recheck failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const text = new TextDecoder().decode(value);
        const updates = text.split('\n').filter(Boolean).map(line => JSON.parse(line));
        
        updates.forEach(update => {
          if (update.logs) {
            update.logs.forEach((log: StatusLog) => {
              addLog(domain, {
                message: log.message,
                type: log.type
              });
            });
          }
          if (update.status || update.screenshot || update.title || update.favicon) {
            updateResult(domain, update);
          }
        });
      }
    } catch {
      updateResult(domain, {
        status: 'internal_error',
        error: 'Failed to recheck domain',
        errorCode: 'RECHECK_FAILED'
      });
      addLog(domain, {
        message: 'Failed to recheck domain',
        type: 'error'
      });
    }
  };

  // Apply filters to results and sort by status
  const filteredResults = useMemo(() => {
    const filtered = results.filter(result => {
      // Handle Potentially Purchasable filter
      if (filters.onlyScreenshots) {
        return result.status === 'dns_error';
      }
      
      // Handle other filters
      if (filters.onlyLive && result.status !== 'success') return false;
      if (filters.onlyErrors && result.status === 'success') return false;
      return true;
    });

    // Sort results: Live domains first (prioritizing high-priority TLDs), then loading, then errors
    return filtered.sort((a, b) => {
      // First, sort by status
      const statusOrder = {
        success: 0,
        loading: 1,
        timeout: 2,
        connection_refused: 3,
        dns_error: 4,
        ssl_error: 5,
        invalid_response: 6,
        internal_error: 7
      };

      const aOrder = statusOrder[a.status] ?? 999;
      const bOrder = statusOrder[b.status] ?? 999;

      // If statuses are different, sort by status
      if (aOrder !== bOrder) return aOrder - bOrder;

      // If both are successful, prioritize high-priority TLDs
      if (a.status === 'success' && b.status === 'success') {
        // First by priority
        if (a.isHighPriority !== b.isHighPriority) {
          return (a.isHighPriority ? -1 : 1);
        }
        // Then by response time
        if (a.responseTime && b.responseTime) {
          return a.responseTime - b.responseTime;
        }
      }

      // Finally by domain name
      return a.domain.localeCompare(b.domain);
    });
  }, [results, filters]);

  // Check for timeouts
  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const timeoutThreshold = 35000; // 35 seconds

      setResults(prev => {
        let hasUpdates = false;
        const newResults = prev.map(result => {
          if (result.status === 'loading' && (now - result.timestamp) > timeoutThreshold) {
            hasUpdates = true;
            return {
              ...result,
              status: 'timeout' as const,
              error: 'Request timed out after 35 seconds',
              errorCode: 'TIMEOUT',
              logs: [
                ...result.logs,
                {
                  timestamp: now,
                  message: 'Request timed out after 35 seconds',
                  type: 'error' as const
                }
              ]
            };
          }
          return result;
        });
        return hasUpdates ? newResults : prev;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  return (
    <SearchContext.Provider 
      value={{ 
        results, 
        filteredResults,
        filters,
        setFilters: (newFilters) => setFilters(prev => ({ ...prev, ...newFilters })),
        addResult, 
        updateResult,
        addLog,
        clearResults,
        recheckDomain
      }}
    >
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const context = useContext(SearchContext);
  if (context === undefined) {
    throw new Error('useSearch must be used within a SearchProvider');
  }
  return context;
} 