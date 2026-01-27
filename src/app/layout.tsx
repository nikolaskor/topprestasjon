import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Ditt Topprestasjonsmønster | PRO1000 USN",
  description: "Oppdag når du presterer best, og finn teammedlemmer som utfyller deg perfekt.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body className="antialiased">
        {children}
      </body>
    </html>
  );
}
