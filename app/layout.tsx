import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "NIO | Indicadores SAC",
  description: "Dashboard de indicadores de atendimento da NIO",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen radial-glow font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
