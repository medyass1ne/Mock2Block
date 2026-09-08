import Builder from "../components/Builder";
import { cookies } from "next/headers";
import { verifyToken } from "../lib/auth";
import { Suspense } from "react";

export default async function Home() {
  let initialUser = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (token) {
      const decoded = verifyToken(token);
      if (decoded) {
        initialUser = decoded.username || null;
      }
    }
  } catch (e) {
    console.error("Token verification failed", e);
  }

  return (
    <main>
      <Suspense fallback={<div className="min-h-screen bg-[#050505] flex items-center justify-center text-white">Loading Editor...</div>}>
        <Builder initialUser={initialUser} />
      </Suspense>
    </main>
  );
}
