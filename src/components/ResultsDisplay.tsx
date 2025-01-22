'use client';

import { useState, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useSearch } from '@/context/SearchContext';
import DomainDetails from './DomainDetails';
import Image from 'next/image';

interface DomainResult {
  domain: string;
  status: string;
  screenshot?: string;
  title?: string;
  responseTime?: number;
  error?: string;
  errorCode?: string;
  isHighPriority?: boolean;
}

export default function ResultsDisplay() {
  const { filteredResults, filters, setFilters, results, recheckDomain } = useSearch();
  const [selectedDomain, setSelectedDomain] = useState<string | null>(null);

  // Calculate the number of columns based on window width
  const [columnCount, setColumnCount] = useState(5); // Default to max columns

  useEffect(() => {
    const getColumnCount = () => {
      const width = window.innerWidth;
      if (width >= 2560) return 5; // 2xl
      if (width >= 1920) return 4; // xl
      if (width >= 1280) return 3; // lg
      if (width >= 768) return 2; // sm
      return 1; // mobile
    };

    const updateColumnCount = () => {
      setColumnCount(getColumnCount());
    };

    // Initial calculation
    updateColumnCount();

    // Update on resize
    window.addEventListener('resize', updateColumnCount);
    return () => window.removeEventListener('resize', updateColumnCount);
  }, []);

  // Calculate rows needed based on items and columns
  const rowCount = Math.ceil(filteredResults.length / columnCount);

  // Create virtualizer for rows
  const rowVirtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: useCallback(() => document.documentElement, []),
    estimateSize: () => 400,
    overscan: 5,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'text-green-500';
      case 'timeout': return 'text-orange-500';
      case 'connection_refused': return 'text-red-500';
      case 'dns_error': return 'text-blue-500';
      case 'ssl_error': return 'text-yellow-500';
      case 'invalid_response': return 'text-pink-500';
      case 'internal_error': return 'text-red-700';
      default: return 'text-blue-500';
    }
  };

  const getStatusBgColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-50 dark:bg-green-900/20';
      case 'timeout': return 'bg-orange-50 dark:bg-orange-900/20';
      case 'connection_refused': return 'bg-red-50 dark:bg-red-900/20';
      case 'dns_error': return 'bg-blue-50 dark:bg-blue-900/20';
      case 'ssl_error': return 'bg-yellow-50 dark:bg-yellow-900/20';
      case 'invalid_response': return 'bg-pink-50 dark:bg-pink-900/20';
      case 'internal_error': return 'bg-red-100 dark:bg-red-900/40';
      default: return 'bg-blue-50 dark:bg-blue-900/20';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'success': return 'Live';
      case 'timeout': return 'Timed Out';
      case 'connection_refused': return 'Connection Refused';
      case 'dns_error': return 'Potentially Available';
      case 'ssl_error': return 'SSL Error';
      case 'invalid_response': return 'Invalid Response';
      case 'internal_error': return 'Internal Error';
      default: return 'Checking...';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'timeout':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'connection_refused':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
          </svg>
        );
      case 'dns_error':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
      case 'ssl_error':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
        );
      case 'loading':
        return (
          <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const selectedResult = selectedDomain 
    ? results.find(r => r.domain === selectedDomain)
    : null;

  // Update the image rendering to use next/image
  const renderScreenshot = (result: DomainResult) => {
    if (result.status === 'loading') {
      return <div className="absolute inset-0 animate-pulse bg-gray-200 dark:bg-gray-600" />;
    }
    
    if (result.screenshot) {
      return (
        <div className="relative w-full h-full">
          <Image
            src={result.screenshot}
            alt={`Screenshot of ${result.domain}`}
            fill
            className="object-contain bg-white dark:bg-gray-900"
            unoptimized // Since we're using data URLs
            priority={false}
          />
        </div>
      );
    }
    
    return (
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-gray-400 dark:text-gray-500">No screenshot available</span>
      </div>
    );
  };

  return (
    <div className="mt-8 space-y-6 max-w-[1800px] mx-auto px-6">
      <div className="bg-gradient-to-r from-gray-800 to-gray-700 p-5 rounded-xl shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-medium text-white">Filter Domains</h3>
          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => setFilters({ onlyLive: !filters.onlyLive })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                filters.onlyLive
                  ? 'bg-green-500 text-white shadow-md'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              🌐 Live Sites
            </button>
            <button
              onClick={() => setFilters({ onlyErrors: !filters.onlyErrors })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                filters.onlyErrors
                  ? 'bg-red-500 text-white shadow-md'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              ⚠️ Errors & Timeouts
            </button>
            <button
              onClick={() => setFilters({ 
                onlyScreenshots: !filters.onlyScreenshots,
                onlyLive: false,
                onlyErrors: false
              })}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                filters.onlyScreenshots
                  ? 'bg-blue-500 text-white shadow-md'
                  : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
              }`}
            >
              🛍️ Potentially Purchasable
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-semibold text-gray-900 dark:text-white">Results</h2>
        <div className="flex items-center space-x-4">
          <span className="text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredResults.length} of {results.length} domains
          </span>
          <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
            <span className="text-green-500">
              Live: {results.filter(r => r.status === 'success').length}
            </span>
            <span className="text-blue-500">
              Checking: {results.filter(r => r.status === 'loading').length}
            </span>
            <span className="text-red-500">
              Failed: {results.filter(r => r.status !== 'success' && r.status !== 'loading').length}
            </span>
          </div>
        </div>
      </div>

      {filteredResults.length === 0 ? (
        <p className="text-gray-500 dark:text-gray-400 text-center py-8">
          {results.length === 0 ? 'No results yet. Start a search to see domains.' : 'No domains match the selected filters.'}
        </p>
      ) : (
        <div
          style={{
            height: `${rowVirtualizer.getTotalSize()}px`,
            position: 'relative',
          }}
        >
          {rowVirtualizer.getVirtualItems().map((virtualRow) => {
            const rowStartIndex = virtualRow.index * columnCount;
            const rowItems = filteredResults.slice(rowStartIndex, rowStartIndex + columnCount);

            return (
              <div
                key={virtualRow.index}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualRow.start}px)`,
                }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4"
              >
                {rowItems.map((result, index) => (
                  <div
                    key={result.domain + index}
                    className="bg-white dark:bg-gray-800 rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow"
                  >
                    <div className={`px-4 py-2 ${getStatusBgColor(result.status)} flex items-center justify-between`}>
                      <div className="flex items-center space-x-2">
                        <span className={getStatusColor(result.status)}>
                          {getStatusIcon(result.status)}
                        </span>
                        <span className={`text-sm font-medium ${getStatusColor(result.status)}`}>
                          {getStatusText(result.status)}
                        </span>
                      </div>
                      {result.status !== 'success' && result.status !== 'loading' && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            recheckDomain(result.domain);
                          }}
                          className="text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Recheck
                        </button>
                      )}
                    </div>

                    <div
                      className="relative aspect-video bg-gray-100 dark:bg-gray-700 cursor-pointer"
                      onClick={() => setSelectedDomain(result.domain)}
                    >
                      {renderScreenshot(result)}
                    </div>

                    <div className="p-4 space-y-2">
                      <div className="flex items-center justify-between">
                        <h3 className="font-medium text-gray-900 dark:text-white truncate flex-1 flex items-center">
                          {result.domain}
                          {result.isHighPriority && (
                            <span className="ml-2 px-1.5 py-0.5 text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300 rounded">
                              Common TLD
                            </span>
                          )}
                        </h3>
                        {result.responseTime && (
                          <span className="text-sm text-gray-500 dark:text-gray-400 ml-2">
                            {result.responseTime}ms
                          </span>
                        )}
                      </div>

                      {result.title && (
                        <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                          {result.title}
                        </p>
                      )}

                      {result.error && result.status !== 'success' && (
                        <p className={`text-sm ${getStatusColor(result.status)}`}>
                          {result.error}
                        </p>
                      )}

                      <div className="pt-2 flex items-center justify-between">
                        {result.status === 'success' ? (
                          <>
                            <a
                              href={`https://${result.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Visit Website
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                              </svg>
                            </a>
                            <a
                              href={`https://porkbun.com/checkout/search?q=${result.domain}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-purple-500 hover:text-purple-400 dark:text-purple-400 dark:hover:text-purple-300"
                              onClick={(e) => e.stopPropagation()}
                            >
                              Check on Porkbun
                              <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                              </svg>
                            </a>
                          </>
                        ) : (
                          <a
                            href={`https://porkbun.com/checkout/search?q=${result.domain}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center text-sm text-purple-500 hover:text-purple-400 dark:text-purple-400 dark:hover:text-purple-300"
                            onClick={(e) => e.stopPropagation()}
                          >
                            {result.status === 'dns_error' ? 'Check Availability' : 'Check on Porkbun'}
                            <svg className="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                            </svg>
                          </a>
                        )}
                      </div>

                      {result.status === 'dns_error' && (
                        <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                          DNS lookup failed, domain might be available for purchase
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}

      {selectedResult && (
        <DomainDetails
          result={selectedResult}
          onClose={() => setSelectedDomain(null)}
        />
      )}
    </div>
  );
} 