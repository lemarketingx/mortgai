import { guides } from "../lib/guides";
import { absoluteUrl } from "../lib/seo";

const publicPages = [
  { path: "/", priority: "1.0", changefreq: "weekly" },
  { path: "/refinance-check", priority: "0.8", changefreq: "weekly" },
  { path: "/guides", priority: "0.8", changefreq: "weekly" },
  ...guides.map((guide) => ({ path: guide.path, priority: "0.7", changefreq: "monthly" })),
];

export default function SitemapXml() {
  return null;
}

export async function getServerSideProps({ res }) {
  const lastmod = new Date().toISOString();
  const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${publicPages
  .map(
    (page) => `  <url>
    <loc>${absoluteUrl(page.path)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>`
  )
  .join("\n")}
</urlset>`;

  res.setHeader("Content-Type", "application/xml; charset=utf-8");
  res.write(sitemap);
  res.end();

  return { props: {} };
}
