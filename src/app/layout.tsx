import type { Metadata } from "next";
import { Sidebar } from "@/components/Sidebar";
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
            <body className={`${inter.className} bg-gray-50 text-slate-900 antialiased`} suppressHydrationWarning>
                <div className="flex min-h-screen">
                    <Sidebar />
                    <main className="flex-1 pl-64 transition-all duration-300">
                        {children}
                    </main>
                </div>
            </body>
        </html>
    );
}
