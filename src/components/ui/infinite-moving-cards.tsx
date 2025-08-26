"use client";

import { cn } from "@/lib/utils";
import React, { useEffect, useState } from "react";

type EventItem = {
    id: string;
    title: string;
    location?: string;
    startsAt: string;      // ISO string
    // Either provide remaining directly, or capacity+bookedSlots
    remaining?: number;
    capacity?: number;
    bookedSlots?: number;
};

export const InfiniteMovingCards = ({
    items,
    direction = "left",
    speed = "fast",
    pauseOnHover = true,
    className,
}: {
    items: EventItem[];
    direction?: "left" | "right";
    speed?: "fast" | "normal" | "slow";
    pauseOnHover?: boolean;
    className?: string;
}) => {
    const containerRef = React.useRef<HTMLDivElement>(null);
    const scrollerRef = React.useRef<HTMLUListElement>(null);

    const [start, setStart] = useState(false);

    useEffect(() => {
        addAnimation();
        // update CSS vars if props change
        getDirection();
        getSpeed();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [direction, speed]);

    function addAnimation() {
        if (containerRef.current && scrollerRef.current) {
            const scrollerContent = Array.from(scrollerRef.current.children);
            // duplicate once for seamless loop
            scrollerContent.forEach((item) => {
                const duplicatedItem = item.cloneNode(true);
                scrollerRef.current!.appendChild(duplicatedItem);
            });
            setStart(true);
        }
    }

    function getDirection() {
        if (!containerRef.current) return;
        containerRef.current.style.setProperty(
            "--animation-direction",
            direction === "left" ? "forwards" : "reverse"
        );
    }

    function getSpeed() {
        if (!containerRef.current) return;
        const dur =
            speed === "fast" ? "20s" : speed === "normal" ? "40s" : "80s";
        containerRef.current.style.setProperty("--animation-duration", dur);
    }

    function formatDateISO(iso: string) {
        const d = new Date(iso);
        return new Intl.DateTimeFormat("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
            hour12: false,
            timeZone: "Asia/Kolkata", // or "UTC" if you prefer UTC display
        }).format(d);
    }

    function spotsLeft(item: EventItem) {
        if (typeof item.remaining === "number") return Math.max(0, item.remaining);
        const cap = Number(item.capacity ?? 0);
        const booked = Number(item.bookedSlots ?? 0);
        return Math.max(0, cap - booked);
    }

    return (
        <div
            ref={containerRef}
            className={cn(
                "scroller relative z-20 max-w-7xl overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_12%,black_88%,transparent)]",
                className
            )}
        >
            <ul
                ref={scrollerRef}
                className={cn(
                    "flex w-max min-w-full shrink-0 flex-nowrap gap-4 py-4",
                    start && "animate-scroll",
                    pauseOnHover && "hover:[animation-play-state:paused]"
                )}
            >
                {items.map((item) => (
                    <li
                        key={item.id}
                        className="relative w-[350px] max-w-full shrink-0 rounded-2xl border border-zinc-200 bg-[linear-gradient(180deg,#fafafa,#f5f5f5)] px-6 py-5 md:w-[420px] dark:border-zinc-700 dark:bg-[linear-gradient(180deg,#27272a,#18181b)]"
                    >
                        <h3 className="text-base font-semibold text-foreground line-clamp-2">
                            {item.title}
                        </h3>

                        <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                            {item.location && <p>{item.location}</p>}
                            <p>{formatDateISO(item.startsAt)}</p>
                            <p>
                                <span className="font-medium text-foreground">
                                    {spotsLeft(item)}
                                </span>{" "}
                                spots left
                            </p>
                        </div>
                    </li>
                ))}
            </ul>
        </div>
    );
};
