import localFont from "next/font/local";
import "./globals.css";
import SmoothScroll from "@/components/SmoothScroll";

const calSans = localFont({
  src: "./fonts/CalSansVF.woff2",
  variable: "--font-calsans",
  display: "swap",
  weight: "400 700",
});

export const metadata = {
  title: "Quick-Own | AI Shopping Agent",
  description:
    "Describe what you need, compare catalogue-backed merchant offers, and approve checkout with PayPal Sandbox.",
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-black.svg", type: "image/svg+xml" },
    ],
    shortcut: "/favicon.ico",
    apple: "/icon-black.svg",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={calSans.variable} suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500;1,600&family=Newsreader:ital,opsz,wght@0,6..72,400;0,6..72,500;1,6..72,400;1,6..72,500&family=PT+Serif:ital,wght@0,400;0,700;1,400;1,700&family=Schibsted+Grotesk:wght@400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className={calSans.className} suppressHydrationWarning>
        <SmoothScroll>{children}</SmoothScroll>
      </body>
    </html>
  );
}
