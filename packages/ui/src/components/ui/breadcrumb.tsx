// packages/ui/src/components/ui/breadcrumb.tsx
// Reusable breadcrumb navigation component

import * as React from "react";
import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export interface BreadcrumbItem {
    label: string;
    href?: string;
}

export interface BreadcrumbsProps extends React.HTMLAttributes<HTMLElement> {
    items: BreadcrumbItem[];
    separator?: React.ReactNode;
}

function Breadcrumbs({
    items,
    separator = <ChevronRight className="h-4 w-4" />,
    className,
    ...props
}: BreadcrumbsProps) {
    return (
        <nav
            aria-label="Breadcrumb"
            className={cn("flex items-center text-sm", className)}
            {...props}
        >
            <ol className="flex items-center gap-1">
                {items.map((item, index) => {
                    const isLast = index === items.length - 1;
                    return (
                        <li key={index} className="flex items-center gap-1">
                            {index > 0 && (
                                <span className="text-muted-foreground mx-1">
                                    {separator}
                                </span>
                            )}
                            {isLast || !item.href ? (
                                <span className={cn(
                                    "font-medium",
                                    isLast ? "text-foreground" : "text-muted-foreground"
                                )}>
                                    {item.label}
                                </span>
                            ) : (
                                <Link
                                    href={item.href}
                                    className="text-muted-foreground hover:text-foreground transition-colors"
                                >
                                    {item.label}
                                </Link>
                            )}
                        </li>
                    );
                })}
            </ol>
        </nav>
    );
}

export { Breadcrumbs };
