import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { SearchProvider } from "@/context/SearchContext";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "website finder",
  description: "finds websites across any keyword, could also help you find a domain",
  icons: {
    icon: "/cat.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`dark ${inter.variable}`}>
      <body className="bg-gray-900 text-gray-100 font-sans">
        <SearchProvider>
          {children}
        </SearchProvider>
      </body>
    </html>
  );
}
