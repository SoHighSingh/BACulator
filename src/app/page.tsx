import Link from "next/link";
import { auth } from "~/server/auth";

export default async function Home() {
  const session = await auth();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-[#2e026d] to-[#15162c] text-white">
      <div className="container flex flex-col items-center justify-center gap-12 px-4 py-16">
        <h1 className="text-5xl font-extrabold tracking-tight sm:text-[5rem]">
          BACulator <span className="text-[hsl(280,100%,70%)]">App</span>
        </h1>
        
        <p className="text-xl text-center max-w-2xl">
          Blood Alcohol Content Calculator - Calculate your BAC and make informed decisions about driving.
        </p>

        <div className="flex flex-col items-center justify-center gap-4">
          <p className="text-center text-2xl text-white">
            {session && <span>Welcome back, {session.user?.name}!</span>}
            {!session && <span>Sign in to save your calculations</span>}
          </p>
          <Link
            href={session ? "/api/auth/signout" : "/api/auth/signin"}
            className="rounded-full bg-white/10 px-10 py-3 font-semibold no-underline transition hover:bg-white/20"
          >
            {session ? "Sign out" : "Sign in with Google"}
          </Link>
        </div>
        
        {/* Add your BAC calculator here later */}
        <div className="text-center">
          <p className="text-lg text-white/80">BAC Calculator coming soon...</p>
        </div>
      </div>
    </main>
  );
}