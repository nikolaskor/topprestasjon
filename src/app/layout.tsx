import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Topprestasjonsmønster | PRO1000 - Universitetet i Sørøst-Norge",
  description: "Oppdag når du presterer best, og forstå hvordan gruppens styrker utfyller hverandre. En øvelse i selvrefleksjon for PRO1000 ved USN.",
  keywords: ["USN", "PRO1000", "topprestasjon", "teamarbeid", "studentoppgave"],
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="no">
      <body className="antialiased touch-manipulation">
        {children}
      </body>
    </html>
  );
}
