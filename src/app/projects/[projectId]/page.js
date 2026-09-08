import { kv } from '@vercel/kv';
import Builder from '../../../components/Builder';
import { notFound } from 'next/navigation';
import { cookies } from "next/headers";
import { verifyToken } from "../../../lib/auth";

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
      const decoded = verifyToken(token);
      if (decoded) {
        initialUser = decoded.username || null;
      }
    }
  } catch (e) {
    console.error("Token verification failed", e);
  }

  return <main><Builder initialData={projectData} projectId={projectId} initialUser={initialUser} /></main>;
}
