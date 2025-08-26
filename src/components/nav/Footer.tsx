import Link from "next/link";
import { siteConfig } from "@/config/site";

export default function Footer() {
  const { ownerName, github, linkedin } = siteConfig.footer;

  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-6 text-sm text-muted-foreground flex flex-col items-center gap-2 sm:flex-row sm:justify-between">
        <p>© {new Date().getFullYear()} {ownerName}. All rights reserved.</p>
        <nav className="flex items-center gap-4">
          <Link href={github} target="_blank" rel="noopener noreferrer" className="hover:underline">GitHub</Link>
          <Link href={linkedin} target="_blank" rel="noopener noreferrer" className="hover:underline">LinkedIn</Link>
        </nav>
      </div>
    </footer>
  );
}
