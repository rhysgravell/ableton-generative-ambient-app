import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { THEME_COLOR } from "@/lib/theme-color";

// Self-hosted (Fontsource, latin subset) so builds need no network access.
const newsreader = localFont({
  variable: "--font-newsreader",
  src: [
    { path: "../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-normal.woff2", weight: "200 800", style: "normal" },
    { path: "../../node_modules/@fontsource-variable/newsreader/files/newsreader-latin-wght-italic.woff2", weight: "200 800", style: "italic" },
  ],
});

const instrumentSans = localFont({
  variable: "--font-instrument-sans",
  src: "../../node_modules/@fontsource-variable/instrument-sans/files/instrument-sans-latin-wght-normal.woff2",
  weight: "400 700",
});

const jetbrainsMono = localFont({
  variable: "--font-jetbrains-mono",
  src: "../../node_modules/@fontsource-variable/jetbrains-mono/files/jetbrains-mono-latin-wght-normal.woff2",
  weight: "100 800",
});

export const metadata: Metadata = {
  title: "Buried Landscapes",
  description: "Seven tools for slow music — generate, reshape and read MIDI.",
};

export const viewport: Viewport = {
  themeColor: THEME_COLOR.dark,
};

// Apply the saved theme before first paint so there's no flash.
const themeScript = `try{var t=localStorage.getItem("bl-theme");if(t==="light"||t==="dark"){document.documentElement.dataset.theme=t;var m=document.querySelector('meta[name="theme-color"]');if(m)m.content=${JSON.stringify(THEME_COLOR)}[t]}}catch(e){}`;

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      data-theme="dark"
      suppressHydrationWarning
      className={`${newsreader.variable} ${instrumentSans.variable} ${jetbrainsMono.variable} h-full`}
    >
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
