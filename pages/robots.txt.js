import { SITE_URL } from "../lib/seo";

export default function RobotsTxt() {
  return null;
}

export async function getServerSideProps({ res }) {
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.write(`User-agent: *
Allow: /
Disallow: /admin
Disallow: /api/admin

Sitemap: ${SITE_URL}/sitemap.xml
`);
  res.end();

  return { props: {} };
}
