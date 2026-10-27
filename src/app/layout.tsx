import type { Metadata } from "next";
import "@fontsource-variable/bricolage-grotesque";
import "@fontsource-variable/instrument-sans";
import "./globals.css";
import { ConfirmProvider } from "@/components/ConfirmDialog";

export const metadata: Metadata = {
  title: "Budget",
  description: "Track spending by category, month by month.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full">
        {/* Background mascot. Lives in /public/gholdengo.png. Tweak size, position,
            tilt and fade in the .mascot rule in globals.css. */}
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative, no optimization needed */}
        <img src="/gholdengo.png" alt="" aria-hidden="true" className="mascot" />
        {/* eslint-disable-next-line @next/next/no-img-element -- decorative */}
        <img src="/gimmighoul.png" alt="" aria-hidden="true" className="mascot mascot-left" />
        <ConfirmProvider>{children}</ConfirmProvider>
      </body>
    </html>
  );
}
