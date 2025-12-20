import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata = {
  title: "TAKE 2 - Strategic Card Game",
  description: "Master the art of Take 2! A strategic card game with AI opponents, special powers, and achievement system. Play offline, earn badges, compete globally!",
  keywords: "card game, strategy game, take 2, uno, multiplayer, AI, PWA, offline",
  authors: [{ name: "Take 2 Game" }],
  creator: "Take 2 Game",
  publisher: "Take 2 Game",
  formatDetection: {
    telephone: false,
  },
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
    ],
    apple: [
      { url: "/apple-touch-icon.svg", sizes: "180x180", type: "image/svg+xml" },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "TAKE 2",
    startupImage: [
      {
        url: "/apple-touch-icon.png",
        media: "(device-width: 768px) and (device-height: 1024px)",
      },
    ],
  },
  openGraph: {
    title: "TAKE 2 - Strategic Card Game",
    description: "Master strategic card gameplay with AI opponents and earn achievement badges!",
    url: "https://take-2-tau.vercel.app",
    siteName: "TAKE 2",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        alt: "TAKE 2 Card Game",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "TAKE 2 - Strategic Card Game",
    description: "Master strategic card gameplay with AI opponents and earn achievement badges!",
    images: ["/og-image.png"],
  },
  themeColor: "#fbbf24",
  colorScheme: "dark",
  viewport: {
    width: "device-width",
    initialScale: 1,
    maximumScale: 1,
    userScalable: false,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Primary SVG Favicon */}
        <link rel="icon" type="image/svg+xml" href="/favicon.svg" />

        {/* Fallback SVG Favicons */}
        <link rel="icon" type="image/svg+xml" sizes="32x32" href="/favicon.svg" />

        {/* Apple Touch Icon */}
        <link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.svg" />

        {/* PWA Manifest */}
        <link rel="manifest" href="/manifest.json" />

        {/* Safari Pinned Tab */}
        <link rel="mask-icon" href="/safari-pinned-tab.svg" color="#fbbf24" />

        {/* Theme and App */}
        <meta name="theme-color" content="#fbbf24" />
        <meta name="msapplication-TileColor" content="#fbbf24" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="application-name" content="TAKE 2" />

        {/* Microsoft Tiles */}
        <meta name="msapplication-config" content="/browserconfig.xml" />
        <meta name="msapplication-TileImage" content="/mstile-144x144.png" />

        {/* SEO and Social */}
        <meta property="og:title" content="TAKE 2 - Strategic Card Game" />
        <meta property="og:description" content="Master strategic card gameplay with AI opponents and earn achievement badges!" />
        <meta property="og:image" content="/og-image.png" />
        <meta property="og:url" content="https://take-2-tau.vercel.app" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="TAKE 2 - Strategic Card Game" />
        <meta name="twitter:description" content="Master strategic card gameplay with AI opponents and earn achievement badges!" />
        <meta name="twitter:image" content="/og-image.png" />

        {/* Game Specific */}
        <meta name="game" content="TAKE 2 Card Game" />
        <meta name="category" content="Strategy Card Game" />
        <meta name="rating" content="General" />
      </head>
      <body className={inter.className}>{children}</body>
    </html>
  );
}
