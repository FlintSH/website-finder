'use client';

import { useState, useCallback, useRef, useEffect, FormEvent } from 'react';
import { useSearch } from '@/context/SearchContext';

export default function SearchForm() {
  const [keyword, setKeyword] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingWord, setIsLoadingWord] = useState(false);
  const { addResult, clearResults } = useSearch();
  const abortControllerRef = useRef<AbortController | null>(null);

  const cancelCurrentSearch = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsSearching(false);
    setKeyword('');
  }, []);

  const handleSubmit = useCallback(async (e?: FormEvent | null, forcedKeyword?: string) => {
    if (e) e.preventDefault();
    const searchTerm = forcedKeyword || keyword;
    if (!searchTerm.trim()) return;

    cancelCurrentSearch();

    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSearching(true);
    clearResults();

    try {
      const response = await fetch('/api/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ keyword: searchTerm.trim() }),
        signal: controller.signal
      });

      if (!response.ok) {
        throw new Error('Search failed');
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error('No reader available');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        if (controller.signal.aborted) {
          reader.cancel();
          break;
        }

        const text = new TextDecoder().decode(value);
        const lines = text.split('\n').filter(Boolean);
        
        for (const line of lines) {
          try {
            if (controller.signal.aborted) break;
            
            const result = JSON.parse(line);
            addResult(result);
          } catch (parseError) {
            console.error('Failed to parse result:', parseError);
            continue;
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Search aborted');
      } else {
        console.error('Search error:', error);
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsSearching(false);
        abortControllerRef.current = null;
      }
    }
  }, [keyword, cancelCurrentSearch, clearResults, addResult]);

  const getRandomWord = useCallback(async () => {
    setIsLoadingWord(true);
    try {
      // Cancel any existing search
      cancelCurrentSearch();
      clearResults();

      const controller = new AbortController();
      const response = await fetch('/api/random-word', {
        signal: controller.signal
      });
      const { word } = await response.json();
      setKeyword(word);
      handleSubmit(null, word);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('Random word fetch aborted');
      } else {
        console.error('Failed to get random word:', error);
      }
    } finally {
      setIsLoadingWord(false);
    }
  }, [cancelCurrentSearch, clearResults, handleSubmit, setKeyword]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit(e);
    }
  }, [handleSubmit]);

  useEffect(() => {
    return () => {
      cancelCurrentSearch();
    };
  }, [cancelCurrentSearch]);

  return (
    <div className="space-y-4">
      <form onSubmit={handleSubmit} className="relative">
        <div className="relative">
          <input
            type="text"
            id="keyword"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            className="w-full px-4 py-3 pr-24 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
            placeholder="Enter a keyword..."
            disabled={isSearching}
            onKeyDown={handleKeyDown}
          />
          <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-2">
            {isSearching && (
              <button
                type="button"
                onClick={cancelCurrentSearch}
                className="p-2 text-red-400 hover:text-red-600 dark:hover:text-red-300 transition-colors"
                title="Cancel search"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
            <button
              type="submit"
              disabled={isSearching || !keyword.trim()}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSearching ? (
                <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              ) : (
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </form>
      <button
        onClick={getRandomWord}
        disabled={isSearching || isLoadingWord}
        className="w-full px-4 py-2 text-sm bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoadingWord ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Loading...
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Surprise Me!
          </>
        )}
      </button>
    </div>
  );
} 