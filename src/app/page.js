import Builder from "../components/Builder";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";
import { Suspense } from "react";

export default async function Home() {
  let initialUser = null;
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      initialUser = decoded.username || null;
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
