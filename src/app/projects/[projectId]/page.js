import { kv } from '@vercel/kv';
import Builder from '../../../components/Builder';
import { notFound } from 'next/navigation';
import { cookies } from "next/headers";
import jwt from "jsonwebtoken";

export default async function ProjectPage({ params }) {
  const { projectId } = await params;
  
  const projectData = await kv.get(`project:${projectId}`);
  
  if (!projectData) {
    notFound();
  }

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

  return <Builder initialData={projectData} projectId={projectId} initialUser={initialUser} />;
}
