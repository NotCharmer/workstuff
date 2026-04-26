"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
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
  );
}
