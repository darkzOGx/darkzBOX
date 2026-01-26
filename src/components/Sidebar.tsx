"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { signOut } from "next-auth/react";
import { LayoutDashboard, Mail, Send, Settings, Users, BarChart3, Bot, Zap, ShieldBan, Radio, Globe, LogOut } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation: { name: string; href: string; icon: any; comingSoon?: boolean }[] = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Unibox", href: "/unibox", icon: Mail },
    { name: "Scrape", href: "/scraper", icon: Globe },
    { name: "Campaigns", href: "/campaigns", icon: Send },
    { name: "Sender", href: "/sender", icon: Radio },
    { name: "Leads", href: "/leads", icon: Users },
    { name: "Blocklist", href: "/blocklist", icon: ShieldBan },
    { name: "Reply Guy", href: "/reply-guy", icon: Bot },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Settings", href: "/settings", icon: Settings },
];

export function Sidebar() {
    const pathname = usePathname();
    const router = useRouter();

    const handleLogout = async () => {
        await signOut({ redirect: false });
        router.push("/login");
        router.refresh();
    };


    return (
        <div className="flex h-screen w-64 flex-col fixed left-0 top-0 bg-slate-900 border-r border-white/5">
            {/* Brand */}
            <div className="flex h-16 items-center px-6 border-b border-white/5">
                <Zap className="h-6 w-6 text-blue-400 mr-2" />
                <span className="text-xl font-bold tracking-tight text-white">darkzBOX</span>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1 px-3 py-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;

                    if (item.comingSoon) {
                        return (
                            <div
                                key={item.name}
                                className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-600 cursor-not-allowed"
                            >
                                <item.icon className="mr-3 h-5 w-5 flex-shrink-0 text-slate-600" />
                                {item.name}
                                <span className="ml-auto text-[10px] bg-white/5 text-slate-500 px-1.5 py-0.5 rounded">
                                    SOON
                                </span>
                            </div>
                        );
                    }

                    return (
                        <Link
                            key={item.name}
                            href={item.href}
                            className={cn(
                                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors",
                                isActive
                                    ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "mr-3 h-5 w-5 flex-shrink-0",
                                    isActive ? "text-blue-400" : "text-slate-500 group-hover:text-white"
                                )}
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>

            {/* Logout Button */}
            <div className="border-t border-white/5 p-3">
                <button
                    onClick={handleLogout}
                    className="w-full flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-slate-400 hover:bg-white/5 hover:text-white transition-colors"
                >
                    <LogOut className="mr-3 h-5 w-5 flex-shrink-0" />
                    Sign Out
                </button>
            </div>
        </div>
    );
}
