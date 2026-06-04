
import "./globals.css";
import { cn } from "@/app/(backend)/lib/utils";
import { geist, roboto } from "./(frontend)/ui/fonts";


export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={cn("font-sans", geist.variable)}>
      <body className={`${roboto.className} antialiased`}>

        {children}

        <footer>Hecho con ❤️ por mi</footer>

      </body>
    </html>
  );
}