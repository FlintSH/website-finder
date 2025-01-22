import { NextRequest } from 'next/server';
import puppeteer from 'puppeteer';
import { TLDS, isHighPriorityTld } from '@/data/tlds';

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

interface DomainUpdate {
  domain: string;
  status?: DomainStatus;
  title?: string;
  screenshot?: string;
  responseTime?: number;
  error?: string;
  errorCode?: string;
  logs?: StatusLog[];
  isHighPriority?: boolean;
}

const TIMEOUT = 35000; // 35 seconds timeout

function getErrorDetails(error: Error): { status: DomainStatus; message: string; code: string } {
  const errorMessage = error.message.toLowerCase();
  
  if (error.message === 'Timeout') {
    return {
      status: 'timeout',
      message: 'Request timed out after 35 seconds',
      code: 'TIMEOUT'
    };
  }
  
  if (errorMessage.includes('net::err_connection_refused')) {
    return {
      status: 'connection_refused',
      message: 'Connection refused by the server',
      code: 'CONNECTION_REFUSED'
    };
  }
  
  if (errorMessage.includes('net::err_name_not_resolved')) {
    return {
      status: 'dns_error',
      message: 'Domain name could not be resolved',
      code: 'DNS_ERROR'
    };
  }
  
  if (errorMessage.includes('net::err_cert_') || errorMessage.includes('ssl')) {
    return {
      status: 'ssl_error',
      message: 'SSL/TLS certificate error',
      code: 'SSL_ERROR'
    };
  }
  
  if (errorMessage.includes('net::err_invalid_response')) {
    return {
      status: 'invalid_response',
      message: 'Server returned an invalid response',
      code: 'INVALID_RESPONSE'
    };
  }
  
  return {
    status: 'internal_error',
    message: 'Failed to connect to domain',
    code: 'UNKNOWN_ERROR'
  };
}

export async function POST(request: NextRequest) {
  const { keyword, singleDomain } = await request.json();
  
  // Create a stream to send results back to the client
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  // Start the browser
  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  // Process domains in parallel with a concurrency limit
  const concurrencyLimit = 5;
  let activeTasks = 0;
  let currentTldIndex = 0;

  const sendUpdate = async (update: DomainUpdate) => {
    await writer.write(
      new TextEncoder().encode(
        JSON.stringify(update) + '\n'
      )
    );
  };

  const processNextDomain = async () => {
    if (currentTldIndex >= TLDS.length && !singleDomain) return;

    const domain = singleDomain || `${keyword}.${TLDS[currentTldIndex++]}`;
    const startTime = Date.now();
    activeTasks++;

    const isHighPriority = isHighPriorityTld(domain.split('.').pop() || '');

    try {
      const page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      
      // Send initial status
      await sendUpdate({
        domain,
        status: 'loading',
        title: '',
        screenshot: '',
        isHighPriority,
        logs: [{
          timestamp: Date.now(),
          message: 'Starting domain check...',
          type: 'info'
        }]
      });

      try {
        // Create a promise that rejects after timeout
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Timeout')), TIMEOUT);
        });

        await sendUpdate({
          domain,
          logs: [{
            timestamp: Date.now(),
            message: 'Attempting to connect to domain...',
            type: 'info'
          }]
        });

        // Race between the page load and timeout
        await Promise.race([
          page.goto(`https://${domain}`, {
            waitUntil: 'networkidle0',
          }),
          timeoutPromise
        ]);

        await sendUpdate({
          domain,
          logs: [{
            timestamp: Date.now(),
            message: 'Successfully connected to domain',
            type: 'success'
          }]
        });

        // Get the page title
        const title = await page.title();
        await sendUpdate({
          domain,
          logs: [{
            timestamp: Date.now(),
            message: `Retrieved page title: "${title}"`,
            type: 'info'
          }]
        });

        // Take a screenshot
        await sendUpdate({
          domain,
          logs: [{
            timestamp: Date.now(),
            message: 'Taking screenshot...',
            type: 'info'
          }]
        });

        let screenshot;
        try {
          screenshot = await page.screenshot({
            encoding: 'base64',
            type: 'jpeg',
            quality: 30,
            clip: {
              x: 0,
              y: 0,
              width: 1280,
              height: 720
            }
          });

          const maxSize = 500000; // ~500KB
          if (screenshot.length > maxSize) {
            throw new Error('Screenshot too large');
          }
        } catch {
          await sendUpdate({
            domain,
            status: 'invalid_response',
            title,
            screenshot: '',
            responseTime: Date.now() - startTime,
            error: 'Site is live but screenshot failed',
            errorCode: 'SCREENSHOT_FAILED',
            isHighPriority,
            logs: [{
              timestamp: Date.now(),
              message: 'Failed to capture screenshot (size limit exceeded)',
              type: 'error'
            }]
          });
          return;
        }

        // Only mark as success if we got both connection and screenshot
        await sendUpdate({
          domain,
          status: 'success',
          title,
          screenshot: `data:image/jpeg;base64,${screenshot}`,
          responseTime: Date.now() - startTime,
          isHighPriority,
          logs: [{
            timestamp: Date.now(),
            message: 'Domain check completed successfully',
            type: 'success'
          }]
        });
      } catch (error) {
        // Get detailed error information
        const errorDetails = getErrorDetails(error instanceof Error ? error : new Error('Unknown error'));

        await sendUpdate({
          domain,
          status: errorDetails.status,
          title: '',
          screenshot: '',
          responseTime: Date.now() - startTime,
          error: errorDetails.message,
          errorCode: errorDetails.code,
          isHighPriority,
          logs: [{
            timestamp: Date.now(),
            message: errorDetails.message,
            type: 'error'
          }]
        });
      }

      await page.close();
      await sendUpdate({
        domain,
        logs: [{
          timestamp: Date.now(),
          message: 'Closed browser page',
          type: 'info'
        }]
      });
    } catch (error) {
      console.error(`Error processing ${domain}:`, error);
      await sendUpdate({
        domain,
        status: 'internal_error',
        error: 'Internal processing error',
        errorCode: 'INTERNAL_ERROR',
        isHighPriority,
        logs: [{
          timestamp: Date.now(),
          message: 'Internal processing error occurred',
          type: 'error'
        }]
      });
    }

    activeTasks--;
    if (activeTasks < concurrencyLimit && !singleDomain) {
      processNextDomain();
    }
  };

  // Start initial batch of tasks
  if (singleDomain) {
    await processNextDomain();
  } else {
    for (let i = 0; i < concurrencyLimit; i++) {
      processNextDomain();
    }
  }

  // Wait for all tasks to complete
  const checkCompletion = () => {
    if (activeTasks === 0 && (currentTldIndex >= TLDS.length || singleDomain)) {
      writer.close();
      browser.close();
    } else {
      setTimeout(checkCompletion, 1000);
    }
  };

  checkCompletion();

  return new Response(stream.readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
} 