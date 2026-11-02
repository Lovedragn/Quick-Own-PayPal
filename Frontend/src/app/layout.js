import "./globals.css";

export const metadata = {
  title: "Quick-Own | AI Shopping Agent",
  description:
    "Describe what you need, compare catalogue-backed merchant offers, and approve checkout with PayPal Sandbox.",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
