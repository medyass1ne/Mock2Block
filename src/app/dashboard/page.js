import Dashboard from "../../components/Dashboard";
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export default async function DashboardPage() {
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

  return <Dashboard initialUser={initialUser} />;
}
