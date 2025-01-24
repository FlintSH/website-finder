import { NextRequest } from 'next/server';
import puppeteer, { Browser } from 'puppeteer';
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

const TIMEOUT = 35000;

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

const browserPool: Browser[] = [];
const MAX_POOL_SIZE = 3;
const MAX_CONCURRENT_PAGES = 20;

async function getBrowser() {
  let browser = browserPool.pop();
  
  if (!browser) {
    if (browserPool.length < MAX_POOL_SIZE) {
      browser = await puppeteer.launch({
        headless: true,
        args: ['--no-sandbox', '--disable-setuid-sandbox'],
      });
    } else {
      await new Promise(resolve => setTimeout(resolve, 1000));
      return getBrowser();
    }
  }
  
  return browser;
}

async function releaseBrowser(browser: Browser) {
  if (browserPool.length < MAX_POOL_SIZE) {
    browserPool.push(browser);
  } else {
    await browser.close();
  }
}

export async function POST(request: NextRequest) {
  const { keyword, singleDomain } = await request.json();
  
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();
  
  const browser = await getBrowser();
  let isAborted = false;

  request.signal.addEventListener('abort', async () => {
    console.log('Client disconnected, cleaning up...');
    isAborted = true;
    await writer.close().catch(() => {});
    await releaseBrowser(browser);
  });

  let activeTasks = 0;
  let currentTldIndex = 0;

  const sendUpdate = async (update: DomainUpdate) => {
    if (isAborted) {
      throw new Error('CLIENT_DISCONNECTED');
    }

    try {
      // Split large updates into multiple chunks if they contain screenshot data
      if (update.screenshot) {
        // First send the status update without the screenshot
        const statusUpdate = {
          ...update,
          screenshot: undefined,
          logs: [{
            timestamp: Date.now(),
            message: 'Processing screenshot...',
            type: 'info' as const
          }]
        };
        await writer.write(
          new TextEncoder().encode(
            JSON.stringify(statusUpdate) + '\n'
          )
        );

        // Then send the screenshot in a separate update
        const screenshotUpdate = {
          domain: update.domain,
          screenshot: update.screenshot,
          type: 'screenshot'
        };
        await writer.write(
          new TextEncoder().encode(
            JSON.stringify(screenshotUpdate) + '\n'
          )
        );
      } else {
        await writer.write(
          new TextEncoder().encode(
            JSON.stringify(update) + '\n'
          )
        );
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes('ResponseAborted')) {
        console.log('Client disconnected, stopping search');
        isAborted = true;
        await writer.close().catch(() => {});
        await releaseBrowser(browser);
        throw new Error('CLIENT_DISCONNECTED');
      }
      console.error('Error sending update:', error);
    }
  };

  const processNextDomain = async () => {
    if (isAborted || (currentTldIndex >= TLDS.length && !singleDomain)) return;

    const domain = singleDomain || `${keyword}.${TLDS[currentTldIndex++]}`;
    const startTime = Date.now();
    activeTasks++;

    let page;
    try {
      if (isAborted) return;
      
      page = await browser.newPage();
      await page.setViewport({ width: 1280, height: 720 });
      
      await sendUpdate({
        domain,
        status: 'loading',
        title: '',
        screenshot: '',
        isHighPriority: isHighPriorityTld(domain.split('.').pop() || ''),
        logs: [{
          timestamp: Date.now(),
          message: 'Starting domain check...',
          type: 'info'
        }]
      });

      if (isAborted) {
        await page.close();
        return;
      }

      try {
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

        if (isAborted) {
          await page.close();
          return;
        }

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

        const title = await page.title();
        await sendUpdate({
          domain,
          logs: [{
            timestamp: Date.now(),
            message: `Retrieved page title: "${title}"`,
            type: 'info'
          }]
        });

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

          const maxSize = 500000;
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
            isHighPriority: isHighPriorityTld(domain.split('.').pop() || ''),
            logs: [{
              timestamp: Date.now(),
              message: 'Failed to capture screenshot (size limit exceeded)',
              type: 'error'
            }]
          });
          return;
        }

        await sendUpdate({
          domain,
          status: 'success',
          title,
          screenshot: `data:image/jpeg;base64,${screenshot}`,
          responseTime: Date.now() - startTime,
          isHighPriority: isHighPriorityTld(domain.split('.').pop() || ''),
          logs: [{
            timestamp: Date.now(),
            message: 'Domain check completed successfully',
            type: 'success'
          }]
        });
      } catch (error) {
        if (isAborted) {
          await page?.close();
          return;
        }

        const errorDetails = getErrorDetails(error instanceof Error ? error : new Error('Unknown error'));
        await sendUpdate({
          domain,
          status: errorDetails.status,
          title: '',
          screenshot: '',
          responseTime: Date.now() - startTime,
          error: errorDetails.message,
          errorCode: errorDetails.code,
          isHighPriority: isHighPriorityTld(domain.split('.').pop() || ''),
          logs: [{
            timestamp: Date.now(),
            message: errorDetails.message,
            type: 'error'
          }]
        }).catch(() => {});
      }

      if (!isAborted) {
        await page?.close();
        await sendUpdate({
          domain,
          logs: [{
            timestamp: Date.now(),
            message: 'Closed browser page',
            type: 'info'
          }]
        }).catch(() => {});
      }
    } catch (error: unknown) {
      await page?.close();
      if (error instanceof Error && error.message === 'CLIENT_DISCONNECTED') {
        console.log(`Stopping search for ${domain} due to client disconnect`);
        return;
      }
      if (!isAborted) {
        console.error(`Error processing ${domain}:`, error);
        await sendUpdate({
          domain,
          status: 'internal_error',
          error: 'Internal processing error',
          errorCode: 'INTERNAL_ERROR',
          isHighPriority: isHighPriorityTld(domain.split('.').pop() || ''),
          logs: [{
            timestamp: Date.now(),
            message: 'Internal processing error occurred',
            type: 'error'
          }]
        }).catch(() => {});
      }
    }

    activeTasks--;
    if (!isAborted && activeTasks < MAX_CONCURRENT_PAGES && !singleDomain) {
      processNextDomain().catch(console.error);
    }
  };

  if (singleDomain) {
    await processNextDomain();
  } else {
    for (let i = 0; i < MAX_CONCURRENT_PAGES && !isAborted; i++) {
      processNextDomain().catch(console.error);
    }
  }

  const checkCompletion = () => {
    if (isAborted || (activeTasks === 0 && (currentTldIndex >= TLDS.length || singleDomain))) {
      writer.close().catch(() => {});
      releaseBrowser(browser);
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