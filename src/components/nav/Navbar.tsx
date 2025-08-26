import Image from "next/image";
import Link from "next/link";
import { siteConfig } from "@/config/site";
import { Button } from "@/components/ui/button";
import { readSession } from "@/lib/auth/session";
import LogoutButton from "@/components/auth/LogoutButton";

export default async function Navbar() {
  const session = await readSession();
  const isLoggedIn = !!session;

  return (
    <header className="sticky top-0 z-50 border-b border-red-100 bg-white/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 select-none">
      <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4">
        <Link href="/" className="flex items-center gap-2" aria-label="EventEase home">
          <Image
            src="/logo.svg"
            alt="EventEase logo"
            width={120}
            height={32}
            priority
            className="h-8 w-auto"
          />
          <span className="sr-only">EventEase</span>
        </Link>

        {isLoggedIn ? (
          <nav className="flex items-center gap-2">
            <LogoutButton />
          </nav>
        ) : (
          <nav className="flex items-center gap-2">
            <Button asChild variant="ghost" className="text-red-600 hover:bg-red-50">
              <Link href={siteConfig.routes.login}>Log in</Link>
            </Button>
            <Button asChild className="bg-red-500 hover:bg-red-500/90">
              <Link href={siteConfig.routes.register}>Sign up</Link>
            </Button>
          </nav>
        )}
      </div>
    </header>
  );
}
