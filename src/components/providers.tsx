"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { SessionProvider } from "next-auth/react";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <NextThemesProvider
        attribute="class"
        defaultTheme="light"
        enableSystem
        disableTransitionOnChange
      >
        {children}
        <Toaster
          position="top-center"
          dir="rtl"
          toastOptions={{
            className:
              "!rounded-xl !border !border-border !bg-popover !text-popover-foreground !shadow-card",
          }}
        />
      </NextThemesProvider>
    </SessionProvider>
  );
}
