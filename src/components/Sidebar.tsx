"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Mail, Send, Settings, Users, BarChart3, Bot, Zap, ShieldBan, Radio, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Unibox", href: "/unibox", icon: Mail },
    { name: "Scrape", href: "#", icon: Globe, comingSoon: true },
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

    return (
        <div className="flex h-screen w-64 flex-col fixed left-0 top-0 bg-[#0f172a] text-white border-r border-gray-800">
            {/* Brand */}
            <div className="flex h-16 items-center px-6 border-b border-gray-800">
                <Zap className="h-6 w-6 text-blue-500 mr-2" />
                <span className="text-xl font-bold tracking-tight">darkzBOX</span>
            </div>

            {/* Nav */}
            <nav className="flex-1 space-y-1 px-3 py-4">
                {navigation.map((item) => {
                    const isActive = pathname === item.href;

                    if (item.comingSoon) {
                        return (
                            <div
                                key={item.name}
                                className="group flex items-center px-3 py-2.5 text-sm font-medium rounded-lg text-gray-500 cursor-not-allowed"
                            >
                                <item.icon className="mr-3 h-5 w-5 flex-shrink-0 text-gray-500" />
                                {item.name}
                                <span className="ml-auto text-[10px] bg-gray-700 text-gray-400 px-1.5 py-0.5 rounded">
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
                                    ? "bg-blue-600 text-white shadow-lg shadow-blue-900/20"
                                    : "text-gray-400 hover:bg-gray-800 hover:text-white"
                            )}
                        >
                            <item.icon
                                className={cn(
                                    "mr-3 h-5 w-5 flex-shrink-0",
                                    isActive ? "text-white" : "text-gray-400 group-hover:text-white"
                                )}
                            />
                            {item.name}
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
