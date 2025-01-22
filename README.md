# Domain Search

A Next.js application that searches for domains across multiple TLDs and provides information about their availability and content.

## Features

- Search domains across multiple TLDs simultaneously
- Real-time streaming of search results
- Capture screenshots of live domains
- Extract page titles
- Modern UI with dark mode support
- Responsive design

## Prerequisites

- Node.js 18+ and npm
- Chrome/Chromium (for Puppeteer)

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd domain-search
```

2. Install dependencies:
```bash
npm install
```

## Development

Run the development server:

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

## Usage

1. Enter a keyword in the search box
2. Click "Search Domains" to start the search
3. Results will appear in real-time as domains are checked
4. Each result shows:
   - Domain name
   - Page title (if available)
   - Screenshot (if the domain is live)
   - Status (loading/success/error)

## Technical Details

- Built with Next.js 14
- Uses Tailwind CSS for styling
- Implements server-sent events for real-time updates
- Uses Puppeteer for web scraping and screenshots
- Concurrent domain checking with rate limiting

## License

MIT
