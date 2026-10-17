"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS = [
    { label: "Category", href: "/dashboard/categories" },
    { label: "Subcategory", href: "/dashboard/subcategories" }
];

export default function CategoryTabs() {
    const pathname = usePathname();

    return (
        <div className="mb-5 flex gap-2 border-b border-border">
            {TABS.map((tab) => {
                const isActive = pathname.startsWith(tab.href);

                return (
                    <Link
                        key={tab.href}
                        href={tab.href}
                        className={`-mb-px border-b-2 px-4 py-2.5 text-sm font-semibold transition ${
                            isActive
                                ? "border-primary text-primary"
                                : "border-transparent text-text-muted hover:text-text"
                        }`}
                    >
                        {tab.label}
                    </Link>
                );
            })}
        </div>
    );
}
