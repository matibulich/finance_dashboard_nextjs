import { Roboto, Geist } from "next/font/google";

export const roboto = Roboto({
    subsets: ["latin"],
    weight: ["300", "400", "500", "600", "700"],
});

export const geist = Geist({ subsets: ['latin'], variable: '--font-sans' });