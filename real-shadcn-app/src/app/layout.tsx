import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "MayDay // Fraud Cockpit (TigerGraph + Gemini 3.8 Flash)",
  description: "Agentic Graph Intelligence with OpenUI and shadcn/ui",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" data-theme="dark" style={{ colorScheme: "dark" }}>
      <body className="dark bg-background text-foreground antialiased" data-theme="dark">
        {children}
      </body>
    </html>
  );
}
