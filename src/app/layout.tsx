import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { ConfirmProvider } from "@/components/ui/ConfirmDialog";

export const metadata: Metadata = {
  title: "benbadobee",
  description: "my life log",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        <ConfirmProvider>{children}</ConfirmProvider>
      </body>
    </html>
  );
}
