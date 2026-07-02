import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Head from "next/head";
import { trackEvent } from "../lib/analytics";
import { OG_IMAGE_URL, absoluteUrl, articleSchema, breadcrumbSchema, canonicalUrl, faqSchema, stringifyJsonLd } from "../lib/seo";
import BrandLogo from "./BrandLogo";

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

function CategoryBadge({ category }) {
  const cls = CATEGORY_CLASSES[category] || "bg-slate-100 text-slate-600";
  return (
    <span className={`inline-block text-xs font-bold px-3 py-1 rounded-full tracking-wide ${cls}`}>
      {category}
    </span>
  );
}

function MidCta({ slug, category }) {
  function handleClick() {
    trackEvent("blog_cta_click", { slug, category }, { source: "blog" });
  }
  return (
    <div className="my-10 rounded-2xl bg-gradient-to-l from-violet-600 to-indigo-700 p-6 md:p-8 text-white text-right">
      <p className="text-sm font-semibold uppercase tracking-widest opacity-80 mb-2">כלי חינמי</p>
      <h3 className="text-xl md:text-2xl font-black mb-2">רוצים לבדוק זכאות למשכנתא?</h3>
      <p className="text-sm md:text-base opacity-90 mb-5 leading-7">
        מחשבון Finzo מנתח את הנתונים שלכם ומחזיר אומדן סיכוי אישור, החזר חודשי ומסגרת אפשרית — תוך דקה.
      </p>
      <Link
        href="/#eligibility-check"
        onClick={handleClick}
        className="inline-block bg-white text-indigo-700 font-black px-6 py-3 rounded-xl hover:bg-indigo-50 transition-colors text-sm"
      >
        בדיקת זכאות חינם ←
      </Link>
    </div>
  );
}

function LeadForm({ slug, category }) {
  const [form, setForm] = useState({ name: "", phone: "", city: "" });
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [error, setError] = useState("");

  function handleChange(e) {
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setStatus("loading");
    setError("");
    trackEvent("blog_lead_submit_started", { slug, category }, { source: "blog" });

    try {
      const res = await fetch("/api/lead", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lead: {
            name: form.name,
            phone: form.phone,
            city: form.city,
            source: "blog",
            landingPage: `/blog/${slug}`,
          },
        }),
      });
      const data = await res.json();
      if (data.ok || data.success) {
        setStatus("success");
        trackEvent("blog_lead_submit_success", { slug, category }, { source: "blog" });
      } else {
        setStatus("error");
        setError("אירעה שגיאה. נסו שוב.");
      }
    } catch {
      setStatus("error");
      setError("אירעה שגיאה. נסו שוב.");
    }
  }

  if (status === "success") {
    return (
      <div className="text-center py-8">
        <div className="text-4xl mb-3">✓</div>
        <p className="text-xl font-bold text-mort-ink mb-1">קיבלנו את פרטיכם!</p>
        <p className="text-mort-muted">יועץ ייצור איתכם קשר בקרוב.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-bold text-mort-text mb-1">שם מלא</label>
          <input
            name="name"
            value={form.name}
            onChange={handleChange}
            required
            placeholder="ישראל ישראלי"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-mort-text mb-1">טלפון</label>
          <input
            name="phone"
            value={form.phone}
            onChange={handleChange}
            required
            placeholder="05X-XXXXXXX"
            type="tel"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          />
        </div>
        <div>
          <label className="block text-sm font-bold text-mort-text mb-1">עיר</label>
          <input
            name="city"
            value={form.city}
            onChange={handleChange}
            placeholder="תל אביב"
            className="w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 bg-white"
          />
        </div>
      </div>
      {error && <p className="text-red-600 text-sm">{error}</p>}
      <button
        type="submit"
        disabled={status === "loading"}
        className="w-full md:w-auto bg-violet-600 hover:bg-violet-700 disabled:opacity-60 text-white font-black px-8 py-3 rounded-xl transition-colors text-sm"
      >
        {status === "loading" ? "שולח..." : "לקבלת ייעוץ ראשוני חינם"}
      </button>
      <p className="text-xs text-mort-muted">הפרטים ישמשו ליצירת קשר בלבד. לא שיווק, לא ספאם.</p>
    </form>
  );
}

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-slate-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-5 py-4 text-right bg-white hover:bg-surface-low transition-colors"
      >
        <span className="font-bold text-mort-ink text-sm md:text-base leading-6">{q}</span>
        <span className={`text-violet-600 text-xl font-light transition-transform ${open ? "rotate-45" : ""}`}>+</span>
      </button>
      {open && (
        <div className="px-5 pb-4 text-mort-text text-sm leading-7 bg-surface-low border-t border-slate-100">
          {a}
        </div>
      )}
    </div>
  );
}

export default function BlogPostPage({ post, relatedPosts }) {
  const postPath = `/blog/${post.slug}`;
  const [scrollProgress, setScrollProgress] = useState(0);
  const shareUrl = absoluteUrl(postPath);
  const tableOfContents = useMemo(
    () => post.sections.map((section, idx) => ({ id: `section-${idx + 1}`, heading: section.heading })),
    [post.sections]
  );

  useEffect(() => {
    const onScroll = () => {
      const doc = document.documentElement;
      const total = doc.scrollHeight - doc.clientHeight;
      const progress = total <= 0 ? 0 : Math.min(100, Math.max(0, (doc.scrollTop / total) * 100));
      setScrollProgress(progress);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const schemaFaqs = post.faqs.map((f) => [f.q, f.a]);

  return (
    <>
      <Head>
        <title>{post.title}</title>
        <meta name="description" content={post.description} />
        <meta name="keywords" content={post.keywords.join(", ")} />
        <link rel="canonical" href={canonicalUrl(postPath)} />
        <meta property="og:type" content="article" />
        <meta property="og:title" content={post.title} />
        <meta property="og:description" content={post.description} />
        <meta property="og:url" content={absoluteUrl(postPath)} />
        <meta property="og:image" content={OG_IMAGE_URL} />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content={post.title} />
        <meta name="twitter:description" content={post.description} />
        <meta name="twitter:image" content={OG_IMAGE_URL} />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: stringifyJsonLd(articleSchema({ title: post.title, description: post.description, path: postPath, publishDate: post.publishDate })),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: stringifyJsonLd(faqSchema(schemaFaqs)) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: stringifyJsonLd(
              breadcrumbSchema([
                { name: "דף הבית", path: "/" },
                { name: "בלוג משכנתאות", path: "/blog" },
                { name: post.h1, path: postPath },
              ])
            ),
          }}
        />
      </Head>

      {/* ── Mobile sticky CTA ── */}
      <div className="fixed top-0 inset-x-0 z-50 h-1 bg-slate-200">
        <div className="h-full bg-violet-600 transition-all" style={{ width: `${scrollProgress}%` }} />
      </div>

      <div className="fixed bottom-0 inset-x-0 z-50 md:hidden bg-white border-t border-slate-200 px-4 py-3 flex gap-3">
        <Link
          href="/#eligibility-check"
          onClick={() => trackEvent("blog_cta_click", { slug: post.slug, category: post.category, location: "mobile_sticky" }, { source: "blog" })}
          className="flex-1 bg-violet-600 text-white text-sm font-black py-3 rounded-xl text-center"
        >
          בדיקת זכאות חינם
        </Link>
        <Link
          href="/refinance-check"
          onClick={() => trackEvent("blog_cta_click", { slug: post.slug, category: post.category, location: "mobile_sticky_refinance" }, { source: "blog" })}
          className="flex-1 bg-surface-mid text-mort-ink text-sm font-bold py-3 rounded-xl text-center"
        >
          מחזור משכנתא
        </Link>
      </div>

      <main className="pb-28 md:pb-10" dir="rtl">
        {/* ── Header ── */}
        <header className="border-b border-white/10 bg-mort-ink px-4 py-4">
          <div className="mx-auto flex max-w-3xl items-center">
            <Link href="/" className="inline-flex items-center">
              <BrandLogo mode="dark" size="sm" withTagline={false} />
            </Link>
          </div>
        </header>

        {/* ── Article header ── */}
        <div className="bg-gradient-to-b from-mort-ink to-slate-800 text-white pt-8 pb-12 px-4">
          <div className="max-w-3xl mx-auto">
            <nav className="text-xs text-slate-400 mb-6 flex gap-2 items-center flex-wrap">
              <Link href="/" className="hover:text-white transition-colors">דף הבית</Link>
              <span>/</span>
              <Link href="/blog" className="hover:text-white transition-colors">בלוג משכנתאות</Link>
              <span>/</span>
              <span className="text-slate-300 truncate max-w-xs">{post.h1}</span>
            </nav>
            <CategoryBadge category={post.category} />
            <h1 className="text-2xl md:text-4xl font-black mt-4 mb-4 leading-tight">{post.h1}</h1>
            <p className="text-slate-300 text-sm md:text-base leading-7 mb-5">{post.excerpt}</p>
            <div className="flex gap-4 text-xs text-slate-400 flex-wrap">
              <span>⏱ {post.readingTime} דקות קריאה</span>
              <span>📅 {new Date(post.publishDate).toLocaleDateString("he-IL", { year: "numeric", month: "long", day: "numeric" })}</span>
              <span>✍️ צוות Finzo</span>
            </div>
          </div>
        </div>

        {/* ── Article body ── */}
        <div className="max-w-3xl mx-auto px-4 pt-10">
          <section className="mb-8 p-4 bg-surface-low rounded-2xl border border-surface-high">
            <h2 className="text-sm font-black text-mort-ink mb-3">על מה נדבר במאמר?</h2>
            <ul className="space-y-2">
              {tableOfContents.map((item) => (
                <li key={item.id}>
                  <a href={`#${item.id}`} className="text-sm text-violet-700 hover:underline font-semibold">
                    {item.heading}
                  </a>
                </li>
              ))}
            </ul>
          </section>

          {/* Intro */}
          <p className="text-mort-text text-base md:text-lg leading-8 mb-10 font-medium">{post.intro}</p>

          {/* Sections — inject mid CTA after 2nd section */}
          {post.sections.map((section, idx) => (
            <div key={section.heading}>
              <section id={`section-${idx + 1}`} className="mb-8 scroll-mt-20">
                <h2 className="text-xl md:text-2xl font-black text-mort-ink mb-4 border-r-4 border-violet-500 pr-4">
                  {section.heading}
                </h2>
                {section.body.map((para, pi) => (
                  <p key={pi} className="text-mort-text leading-8 mb-4 text-sm md:text-base">
                    {para}
                  </p>
                ))}
              </section>
              {idx === 1 && <MidCta slug={post.slug} category={post.category} />}
            </div>
          ))}

          {/* Internal links strip */}
          <div className="my-8 p-5 bg-surface-low rounded-2xl border border-surface-high">
            <p className="text-xs font-black text-mort-muted uppercase tracking-widest mb-3">קראו גם</p>
            <div className="flex flex-wrap gap-2">
              <Link href="/guides" className="text-sm text-violet-700 hover:underline font-semibold">מדריכי משכנתא ←</Link>
              <Link href="/refinance-check" className="text-sm text-violet-700 hover:underline font-semibold">בדיקת מחזור ←</Link>
              <Link href="/#eligibility-check" className="text-sm text-violet-700 hover:underline font-semibold">מחשבון זכאות ←</Link>
            </div>
          </div>

          <section className="mb-10 p-5 bg-white rounded-2xl border border-slate-200">
            <h2 className="text-lg font-black text-mort-ink mb-3">שיתוף המאמר</h2>
            <div className="flex flex-wrap gap-2">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`${post.h1} - ${shareUrl}`)}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm bg-emerald-50 text-emerald-700 px-4 py-2 rounded-full font-bold"
              >
                WhatsApp
              </a>
              <a
                href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`}
                target="_blank"
                rel="noreferrer"
                className="text-sm bg-blue-50 text-blue-700 px-4 py-2 rounded-full font-bold"
              >
                Facebook
              </a>
              <a
                href={`mailto:?subject=${encodeURIComponent(post.h1)}&body=${encodeURIComponent(shareUrl)}`}
                className="text-sm bg-slate-100 text-slate-700 px-4 py-2 rounded-full font-bold"
              >
                Email
              </a>
            </div>
          </section>

          {/* FAQ */}
          <section className="mb-12">
            <h2 className="text-xl md:text-2xl font-black text-mort-ink mb-6">שאלות נפוצות</h2>
            <div className="space-y-3">
              {post.faqs.map((faq) => (
                <FaqItem key={faq.q} q={faq.q} a={faq.a} />
              ))}
            </div>
          </section>

          {/* Related posts */}
          {relatedPosts.length > 0 && (
            <section className="mb-12">
              <h2 className="text-xl md:text-2xl font-black text-mort-ink mb-6">מאמרים קשורים</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {relatedPosts.map((rel) => (
                  <Link
                    key={rel.slug}
                    href={`/blog/${rel.slug}`}
                    className="block p-4 border border-slate-200 rounded-2xl hover:border-violet-300 hover:shadow-soft transition-all bg-white group"
                  >
                    <CategoryBadge category={rel.category} />
                    <p className="text-mort-ink font-bold text-sm mt-2 leading-6 group-hover:text-violet-700 transition-colors">
                      {rel.h1}
                    </p>
                    <p className="text-mort-muted text-xs mt-1">{rel.readingTime} דקות קריאה</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          {/* Recommended tools */}
          <section className="mb-10">
            <p className="text-xs font-black text-mort-muted uppercase tracking-widest mb-4">כלים פיננסיים שכדאי להכיר</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <a
                href="https://riseup-friends.link/cmr?icrc=xEP7t-Ok6&utm_source=mortgai"
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                onClick={() => trackEvent("blog_cta_click", { slug: post.slug, tool: "riseup", location: "affiliate" }, { source: "blog" })}
                className="flex gap-4 items-start p-5 bg-white border border-slate-200 rounded-2xl hover:border-emerald-300 hover:shadow-soft transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0 text-lg">💰</div>
                <div>
                  <p className="font-black text-mort-ink text-sm group-hover:text-emerald-700 transition-colors">RiseUp — ניהול תקציב חכם</p>
                  <p className="text-mort-muted text-xs leading-5 mt-1">
                    עוקבים אחרי ההוצאות, מבינים לאן הכסף הולך ומתכוננים נכון לפני לקיחת משכנתא.
                  </p>
                  <span className="inline-block mt-2 text-xs font-bold text-emerald-600">להתנסות חינם ←</span>
                </div>
              </a>

              <a
                href="https://www.ezcount.co.il/sr/uref/285f6523-b921-43af-b404-c11f83226847?utm_campaign=recommendation&utm_medium=referral&utm_source=mortgai"
                target="_blank"
                rel="nofollow sponsored noopener noreferrer"
                onClick={() => trackEvent("blog_cta_click", { slug: post.slug, tool: "ezcount", location: "affiliate" }, { source: "blog" })}
                className="flex gap-4 items-start p-5 bg-white border border-slate-200 rounded-2xl hover:border-blue-300 hover:shadow-soft transition-all group"
              >
                <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center shrink-0 text-lg">🧾</div>
                <div>
                  <p className="font-black text-mort-ink text-sm group-hover:text-blue-700 transition-colors">EZcount — חשבוניות לעצמאים</p>
                  <p className="text-mort-muted text-xs leading-5 mt-1">
                    מנהלים עסק עצמאי? דוחות מסודרים דרך EZcount עוזרים להציג הכנסה יציבה לבנק.
                  </p>
                  <span className="inline-block mt-2 text-xs font-bold text-blue-600">להתנסות חינם ←</span>
                </div>
              </a>
            </div>
          </section>

          {/* Lead form CTA */}
          <section className="mb-10 bg-white border border-slate-200 rounded-2xl p-6 md:p-8 shadow-soft">
            <div className="mb-6">
              <p className="text-xs font-black text-violet-600 uppercase tracking-widest mb-2">ייעוץ ראשוני חינמי</p>
              <h2 className="text-xl md:text-2xl font-black text-mort-ink mb-2">רוצים לבדוק זכאות למשכנתא?</h2>
              <p className="text-mort-muted text-sm leading-7">
                השאירו פרטים ויועץ מטעמנו יחזור אליכם עם בדיקה ראשונית — ללא עלות וללא התחייבות.
              </p>
            </div>
            <LeadForm slug={post.slug} category={post.category} />
          </section>

          {/* Disclaimer */}
          <p className="text-xs text-mort-muted border-t border-slate-100 pt-4 leading-6">
            המידע במאמר זה הוא כללי בלבד ואינו מהווה ייעוץ פיננסי, אישור בנקאי או התחייבות למתן הלוואה.
            כל החלטה פיננסית מחייבת בחינה אישית מול גורם מוסמך.
          </p>
        </div>
      </main>
    </>
  );
}
