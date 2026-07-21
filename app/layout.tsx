import "./globals.css";
import { cn } from "@/app/(backend)/lib/utils";
import { geist, roboto } from "./(frontend)/ui/fonts";
import { ThemeProvider } from "./(frontend)/ui/theme-provider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning className={cn("font-sans", geist.variable)}>
      <body className={`${roboto.className} antialiased`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>

        <footer className="border-t border-slate-200 py-6 text-center dark:border-slate-800">
          <p className="text-xs text-slate-400 dark:text-slate-500">Dashboard Financiero by Mati Bulich</p>
        </footer>

      </body>
    </html>
  );
}
