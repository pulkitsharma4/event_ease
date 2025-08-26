import Image from "next/image";
import Hero from "@/components/sections/Hero";
import Trending from "@/components/sections/Trending";
import { readSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function Home() {
  const session = await readSession();
  if (session) {
    redirect("/dashboard");
  }
  return (
    <>
      <Hero
        title="Hello there"
        subtitle="Provident cupiditate voluptatem et in…"
        backgroundUrl="https://img.daisyui.com/images/stock/photo-1507358522600-9f71e620c44e.webp"
        size="cozy"
      />
      <div className="mt-12 p-2">
        <Trending limit={6} />
      </div>
    </>
  );
}

