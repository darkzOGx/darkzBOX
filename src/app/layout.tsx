import type { Metadata } from "next";
import { LayoutWrapper } from "@/components/LayoutWrapper";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
    title: "darkzBOX",
    description: "High volume cold email platform",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body className={`${inter.className} bg-slate-950 text-white antialiased`} suppressHydrationWarning>
                <LayoutWrapper>{children}</LayoutWrapper>
            </body>
        </html>
    );
}
