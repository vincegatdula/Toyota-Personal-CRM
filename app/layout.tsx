import type { Metadata } from "next";
import { Toaster } from "sonner";
import { APP_NAME, APP_SUBTITLE } from "@/lib/constants";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: `${APP_NAME} · ${APP_SUBTITLE}`,
    template: `%s · ${APP_NAME}`,
  },
  description:
    "Personal Toyota CRM for tracking prospects, financing, reservations, vehicle releases, and lost sales.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {children}
        <Toaster position="top-right" richColors closeButton />
      </body>
    </html>
  );
}
