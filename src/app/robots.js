export default function robots() {
  const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'https://mock2block.vercel.app';

  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
      },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
  };
}
