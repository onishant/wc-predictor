import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Image from "next/image";
import "maplibre-gl/dist/maplibre-gl.css";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import { AuthGuard } from "@/components/auth/auth-guard";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "World Cup Predictor",
  description: "Predict matches, track points, and climb the leaderboard.",
};

/* Inline script to set data-theme before first paint — avoids flash */
const themeScript = `
(function(){
  try{
    var t=localStorage.getItem('wc-theme');
    if(t==='light'||t==='dark'){
      document.documentElement.dataset.theme=t;
    }else if(window.matchMedia('(prefers-color-scheme:light)').matches){
      document.documentElement.dataset.theme='light';
    }
  }catch(e){}
})();
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full flex flex-col">
        {/* Global hero image background */}
        <div className="pointer-events-none fixed inset-0 z-0">
          <Image
            src="/images/wc-heroes.png"
            alt=""
            fill
            className="object-cover object-center opacity-[0.13]"
            sizes="100vw"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-background via-background/70 to-background" />
        </div>
        <div className="relative z-10">
          <ThemeProvider><AuthGuard>{children}</AuthGuard></ThemeProvider>
        </div>
      </body>
    </html>
  );
}
