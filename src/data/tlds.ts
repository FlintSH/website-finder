import fs from 'fs';
import path from 'path';

// List of high-priority TLDs that should be checked first
const HIGH_PRIORITY_TLDS = [
  'com',
  'net',
  'org',
  'io',
  'co',
  'app',
  'dev',
  'ai',
  'me',
  'info',
  'biz',
  'edu',
  'gov',
  'mil',
  'int',
  'eu',
  'us',
  'uk',
  'ca',
  'au',
  'de',
  'fr',
  'es',
  'it',
  'nl',
  'ru',
  'cn',
  'jp',
  'kr',
  'in',
  'tech',
  'online',
  'store',
  'blog',
  'site',
  'web',
  'xyz',
  'cloud',
];

// Read and parse the IANA TLD list
const tldListPath = path.join(process.cwd(), 'src', 'data', 'tlds.txt');
const tldFileContent = fs.readFileSync(tldListPath, 'utf-8');

// Parse TLDs, excluding comments and empty lines, and convert to lowercase
const allTlds = tldFileContent
  .split('\n')
  .filter(line => line && !line.startsWith('#'))
  .map(tld => tld.toLowerCase());

// Create a Set of high-priority TLDs for efficient lookup
const highPrioritySet = new Set(HIGH_PRIORITY_TLDS);

// Remove high-priority TLDs from the main list to avoid duplicates
const regularTlds = allTlds.filter(tld => !highPrioritySet.has(tld));

// Export the combined list with high-priority TLDs first
export const TLDS = [...HIGH_PRIORITY_TLDS, ...regularTlds];

// Helper function to check if a TLD is high priority
export const isHighPriorityTld = (tld: string): boolean => {
  return highPrioritySet.has(tld.toLowerCase());
}; 