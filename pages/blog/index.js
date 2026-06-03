import { useState } from "react";
import Head from "next/head";
import Link from "next/link";
import { blogPosts } from "../../lib/blogPosts";
import { OG_IMAGE, SITE_NAME, breadcrumbSchema, canonicalUrl, stringifyJsonLd } from "../../lib/seo";
import { trackEvent } from "../../lib/analytics";

const CATEGORY_CLASSES = {
  זכאות: "bg-emerald-100 text-emerald-700",
  "הון עצמי": "bg-violet-100 text-violet-700",
  מחזור: "bg-blue-100 text-blue-700",
  ריביות: "bg-amber-100 text-amber-700",
  מדריך: "bg-teal-100 text-teal-700",
  גישור: "bg-orange-100 text-orange-700",
  ייעוץ: "bg-indigo-100 text-indigo-700",
  מסלולים: "bg-cyan-100 text-cyan-700",
  טכנולוגיה: "bg-rose-100 text-rose-700",
  "יחס החזר": "bg-purple-100 text-purple-700",
};

const PILL_ACTIVE = "bg-violet-600 text-white border-violet-600";
const PILL_IDLE = "bg-white text-mort-muted border-slate-200 hover:border-violet-300 hover:text-violet-700";

function CategoryBadge({ category }) {
  const cls = CATEGORY_CLASSES[category] || "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full ${cls}`}>
      {category}
    </span>
  );
}

function ArticleCard({ post }) {
  function handleClick() {
    trackEvent("blog_post_view", { slug: post.slug, category: post.category }, { source: "blog_index" });
  }
  return (
    <Link
      href={`/blog/${post.slug}`}
      onClick={handleClick}
      className="group flex flex-col bg-white border border-slate-200 rounded-2xl overflow-hidden hover:border-violet-300 hover:shadow-soft transition-all"
    >
      {/* Color accent bar */}
      <div className="h-1 w-full bg-gradient-to-l from-violet-500 to-indigo-500" />
      <div className="p-5 flex flex-col flex-1">
        <div className="flex items-center justify-between mb-3">
          <CategoryBadge category={post.category} />
          <span className="text-xs text-mort-muted">{post.readingTime} דקות</span>
        </div>
        <h2 className="text-mort-ink font-black text-base leading-7 mb-2 group-hover:text-violet-700 transition-colors flex-1">
          {post.h1}
        </h2>
        <p className="text-mort-muted text-sm leading-6 line-clamp-2 mb-4">
          {post.excerpt}
        </p>
        <div className="flex items-center justify-between mt-auto">
          <span className="text-violet-600 text-sm font-bold group-hover:underline">קריאה ←</span>
          <span className="text-xs text-slate-400">
            {new Date(post.publishDate).toLocaleDateString("he-IL", { month: "short", year: "numeric" })}
          </span>
        </div>
      </div>
    </Link>
  );
}

export default function BlogIndexPage() {
  const categories = ["הכל", ...new Set(blogPosts.map((p) => p.category))];
  const [active, setActive] = useState("הכל");
  const [query, setQuery] = useState("");

  const filteredByCategory = active === "הכל" ? blogPosts : blogPosts.filter((p) => p.category === active);
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = filteredByCategory.filter((p) => {
    if (!normalizedQuery) return true;
    const haystack = [p.h1, p.excerpt, p.category, ...(p.keywords || [])].join(" ").toLowerCase();
    return haystack.includes(normalizedQuery);
  });

  return (
    <>
      <Head>
        <title>בלוג משכנתאות | ידע, מדריכים וכלים | Finzo</title>
        <meta
          name="description"
          content="מאמרים מקצועיים על משכנתאות בישראל: זכאות, הון עצמי, יחס החזר, מחזור משכנתא, ריביות ועוד. כל מה שצריך לדעת לפני שלוקחים משכנתא."
        />
        <link rel="canonical" href={canonicalUrl("/blog")} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content={SITE_NAME} />
        <meta property="og:title" content="בלוג משכנתאות | Finzo" />
        <meta property="og:description" content="מדריכי משכנתאות, מחזור משכנתא, זכאות, הון עצמי, ריביות וטיפים מקצועיים לקבלת החלטות פיננסיות חכמות." />
        <meta property="og:url" content={canonicalUrl("/blog")} />
        <meta property="og:image" content={OG_IMAGE} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:image:alt" content="Finzo — בלוג משכנתאות" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="בלוג משכנתאות | Finzo" />
        <meta name="twitter:description" content="מדריכי משכנתאות, מחזור משכנתא, זכאות, הון עצמי, ריביות וטיפים מקצועיים לקבלת החלטות פיננסיות חכמות." />
        <meta name="twitter:image" content={OG_IMAGE} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: stringifyJsonLd(
              breadcrumbSchema([
                { name: "דף הבית", path: "/" },
                { name: "בלוג משכנתאות", path: "/blog" },
              ])
            ),
          }}
        />
      </Head>

      <main dir="rtl">
        {/* ── Hero ── */}
        <div className="bg-gradient-to-b from-mort-ink to-slate-800 text-white pt-12 pb-16 px-4">
          <div className="max-w-4xl mx-auto text-center">
            <p className="text-xs font-black text-violet-400 uppercase tracking-widest mb-4">Finzo · בלוג</p>
            <h1 className="text-3xl md:text-5xl font-black mb-4 leading-tight">
              ידע שעובד בשבילכם
            </h1>
            <p className="text-slate-300 text-base md:text-lg leading-8 max-w-2xl mx-auto">
              מאמרים מקצועיים על משכנתאות בישראל — זכאות, ריביות, מחזור, הון עצמי ועוד.
              כתובים בשפה פשוטה, מבוססים על נתונים אמיתיים.
            </p>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-4 py-10">
          <div className="mb-6">
            <label htmlFor="blog-search" className="block text-sm font-bold text-mort-ink mb-2">
              חיפוש בתוך הבלוג
            </label>
            <input
              id="blog-search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="לדוגמה: הון עצמי, אישור עקרוני, יחס החזר..."
              className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
            />
          </div>

          {/* ── Category filter ── */}
          <div className="flex gap-2 flex-wrap mb-8">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setActive(cat)}
                className={`text-sm font-bold px-4 py-2 rounded-full border transition-colors ${active === cat ? PILL_ACTIVE : PILL_IDLE}`}
              >
                {cat}
              </button>
            ))}
          </div>

          {/* ── Article grid ── */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filtered.map((post) => (
              <ArticleCard key={post.slug} post={post} />
            ))}
          </div>

          {filtered.length === 0 && (
            <p className="text-center text-mort-muted py-16">לא נמצאו מאמרים שתואמים לחיפוש או לקטגוריה.</p>
          )}

          {/* ── Bottom CTA ── */}
          <div className="mt-14 rounded-2xl bg-gradient-to-l from-violet-600 to-indigo-700 p-8 text-white text-center">
            <h2 className="text-2xl font-black mb-2">מוכנים לבדוק זכאות?</h2>
            <p className="text-slate-200 mb-6 text-sm leading-7">
              השתמשו במחשבון Finzo וקבלו אומדן מהיר של סיכוי האישור, ההחזר החודשי והמסגרת האפשרית.
            </p>
            <Link
              href="/#eligibility-check"
              onClick={() => trackEvent("blog_cta_click", { location: "blog_index_bottom" }, { source: "blog" })}
              className="inline-block bg-white text-indigo-700 font-black px-8 py-3 rounded-xl hover:bg-indigo-50 transition-colors text-sm"
            >
              בדיקת זכאות חינם ←
            </Link>
          </div>

          {/* ── Internal links ── */}
          <div className="mt-8 flex gap-4 flex-wrap justify-center text-sm">
            <Link href="/guides" className="text-violet-700 hover:underline font-semibold">מדריכי משכנתא</Link>
            <span className="text-slate-300">·</span>
            <Link href="/refinance-check" className="text-violet-700 hover:underline font-semibold">בדיקת מחזור משכנתא</Link>
            <span className="text-slate-300">·</span>
            <Link href="/" className="text-violet-700 hover:underline font-semibold">מחשבון זכאות</Link>
          </div>
        </div>
      </main>
    </>
  );
}
