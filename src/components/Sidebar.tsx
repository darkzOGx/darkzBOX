"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Mail, Send, Settings, Users, BarChart3, Bot, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Campaigns", href: "/campaigns", icon: Send },
    { name: "Unibox", href: "/unibox", icon: Mail },
    { name: "Leads", href: "/leads", icon: Users },
    { name: "Analytics", href: "/analytics", icon: BarChart3 },
    { name: "Reply Guy", href: "/reply-guy", icon: Bot },
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

            {/* User */}
            <div className="p-4 border-t border-gray-800">
                <div className="flex items-center gap-3">
                    <div className="h-9 w-9 rounded-full bg-gradient-to-tr from-blue-500 to-purple-500" />
                    <div className="flex flex-col">
                        <span className="text-sm font-medium text-white">Demo User</span>
                        <span className="text-xs text-gray-500">Workspace A</span>
                    </div>
                </div>
            </div>
        </div>
    );
}
