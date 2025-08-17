import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Web3Provider } from "@/components/providers/web3-provider";
import { QueryProvider } from "@/components/providers/query-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "Hacka-Fi | Blockchain Hackathon Platform",
  description:
    "Discover and participate in blockchain hackathons with automated prize distribution",
  keywords: ["hackathon", "blockchain", "Kaia", "Web3", "decentralized"],
  authors: [{ name: "Hacka-Fi Team" }],
  openGraph: {
    title: "Hacka-Fi | Blockchain Hackathon Platform",
    description:
      "Discover and participate in blockchain hackathons with automated prize distribution",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased`}>
        <QueryProvider>
          <Web3Provider>{children}</Web3Provider>
        </QueryProvider>
      </body>
    </html>
  );
}
