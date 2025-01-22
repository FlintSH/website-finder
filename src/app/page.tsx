import SearchForm from '@/components/SearchForm';
import ResultsDisplay from '@/components/ResultsDisplay';
import Image from 'next/image';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-none py-16 sm:py-24 bg-gradient-to-b from-gray-900 to-gray-800">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative">
          <a
            href="https://github.com/FlintSH/website-finder"
            target="_blank"
            rel="noopener noreferrer"
            className="absolute top-0 right-4 text-gray-500 hover:text-gray-300 transition-colors duration-200"
            aria-label="View source on GitHub"
          >
            <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
              <path fillRule="evenodd" clipRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" />
            </svg>
          </a>
          <h1 className="text-5xl sm:text-6xl font-bold mb-3 bg-clip-text text-transparent bg-gradient-to-r from-blue-100 to-blue-50">
            website finder
          </h1>
          <a 
            href="https://fl1nt.dev" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors duration-200 inline-flex items-center group mb-4"
          >
            by
            <Image 
              src="https://github.com/FlintSH.png" 
              alt="FlintSH" 
              width={16}
              height={16}
              className="rounded-full mx-1.5 border border-gray-700"
            />
            FlintSH
            <svg 
              className="w-3 h-3 ml-1 opacity-70 transform transition-transform duration-200 group-hover:translate-x-0.5" 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
          <p className="text-lg sm:text-xl text-gray-400 max-w-2xl mx-auto mb-3">
            finds websites across any keyword, could also help you find a domain. google sucks at finding niche sites so i made this
          </p>

          <div className="mt-8 sm:mt-12 max-w-xl mx-auto">
            <SearchForm />
          </div>
        </div>
      </div>

      <div className="flex-grow bg-gray-900">
        <div className="max-w-[1800px] mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <ResultsDisplay />
        </div>
      </div>
    </div>
  );
}
