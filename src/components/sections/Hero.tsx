import Link from "next/link";
import { Button } from "@/components/ui/button";

type HeroProps = {
  title: string;
  subtitle: string;
  backgroundUrl: string;
  ctaLabel?: string;
  ctaHref?: string;
  size?: "compact" | "cozy" | "normal" | "full"; // NEW
};

export default function Hero({
  title,
  subtitle,
  backgroundUrl,
  ctaLabel = "Get Started",
  ctaHref = "#",
  size = "normal", // NEW
}: HeroProps) {
  const heights: Record<NonNullable<HeroProps["size"]>, string> = {
    compact: "min-h-[45vh] md:min-h-[55vh]",
    cozy:    "min-h-[55vh] md:min-h-[70vh]", 
    normal: "min-h-[70vh] md:min-h-screen",
    full: "min-h-screen",
  };

  return (
    <section className={`relative ${heights[size]} overflow-hidden select-none`} aria-label="Hero">
      <div
        className="absolute inset-0 bg-cover bg-center select-none"
        style={{ backgroundImage: `url(${backgroundUrl})` }}
        aria-hidden="true"
      />
      <div className="absolute inset-0 bg-black/40" aria-hidden="true" />
      <div className={`relative z-10 mx-auto flex ${heights[size]} max-w-2xl items-center justify-center px-4 text-center`}>
        <div className="text-white">
          <h1 className="mb-5 text-4xl font-bold tracking-tight md:text-5xl">{title}</h1>
          <p className="mb-6 text-base/7 md:text-lg/8 opacity-90">{subtitle}</p>
          <Button asChild size="lg">
            <Link href={ctaHref}>{ctaLabel}</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}