'use client';

import { useEffect, useState } from 'react';
import { formatDistanceToNow } from 'date-fns';

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
}

interface Props {
  result: DomainResult;
  onClose: () => void;
}

export default function DomainDetails({ result, onClose }: Props) {
  const [timeLeft, setTimeLeft] = useState<string | null>(null);

  useEffect(() => {
    if (result.status !== 'loading') return;

    const updateTimeLeft = () => {
      const now = Date.now();
      const elapsed = now - result.timestamp;
      const remaining = 35000 - elapsed;

      if (remaining <= 0) {
        setTimeLeft(null);
        return;
      }

      setTimeLeft(`${Math.ceil(remaining / 1000)}s`);
    };

    updateTimeLeft();
    const interval = setInterval(updateTimeLeft, 1000);
    return () => clearInterval(interval);
  }, [result.status, result.timestamp]);

  const getLogIcon = (type: StatusLog['type']) => {
    switch (type) {
      case 'success':
        return (
          <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-4 h-4 text-yellow-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const getStatusColor = (status: DomainStatus) => {
    switch (status) {
      case 'success': return 'text-green-500';
      case 'timeout': return 'text-orange-500';
      case 'connection_refused': return 'text-red-500';
      case 'dns_error': return 'text-purple-500';
      case 'ssl_error': return 'text-yellow-500';
      case 'invalid_response': return 'text-pink-500';
      case 'internal_error': return 'text-red-700';
      default: return 'text-blue-500';
    }
  };

  const getStatusText = (status: DomainStatus) => {
    switch (status) {
      case 'success': return 'Live';
      case 'timeout': return 'Timed Out';
      case 'connection_refused': return 'Connection Refused';
      case 'dns_error': return 'DNS Error';
      case 'ssl_error': return 'SSL Error';
      case 'invalid_response': return 'Invalid Response';
      case 'internal_error': return 'Internal Error';
      default: return 'Checking...';
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b dark:border-gray-700 flex justify-between items-center">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
            {result.domain}
          </h2>
          <button
            onClick={onClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-auto p-4 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">Status</div>
              <div className={`font-medium mt-1 ${getStatusColor(result.status)}`}>
                {result.status === 'loading' ? (
                  <div className="flex items-center space-x-2">
                    <span>Checking</span>
                    {timeLeft && (
                      <span className="text-sm text-gray-500">
                        (Timeout in {timeLeft})
                      </span>
                    )}
                  </div>
                ) : (
                  getStatusText(result.status)
                )}
              </div>
            </div>
            <div className="bg-gray-50 dark:bg-gray-900 p-3 rounded-lg">
              <div className="text-sm text-gray-500 dark:text-gray-400">Response Time</div>
              <div className="font-medium mt-1">
                {result.responseTime ? `${result.responseTime}ms` : 'N/A'}
              </div>
            </div>
          </div>

          {result.error && (
            <div className="bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 p-3 rounded-lg">
              {result.error}
              {result.errorCode && (
                <span className="text-sm text-red-500 dark:text-red-400 block mt-1">
                  Error Code: {result.errorCode}
                </span>
              )}
            </div>
          )}

          <div>
            <h3 className="text-lg font-medium text-gray-900 dark:text-white mb-3">Activity Log</h3>
            <div className="space-y-2">
              {result.logs.map((log, index) => (
                <div
                  key={index}
                  className="flex items-start space-x-3 text-sm"
                >
                  <div className="flex-shrink-0 mt-0.5">
                    {getLogIcon(log.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-gray-900 dark:text-white">
                      {log.message}
                    </p>
                    <p className="text-gray-500 dark:text-gray-400">
                      {formatDistanceToNow(log.timestamp, { addSuffix: true })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="p-4 border-t dark:border-gray-700">
          <button
            onClick={onClose}
            className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
} 