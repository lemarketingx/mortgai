import { useEffect } from "react";
import { blogPosts, blogPostsBySlug } from "../../lib/blogPosts";
import BlogPostPage from "../../components/BlogPostPage";
import { trackEvent } from "../../lib/analytics";

export default function BlogPost({ post, relatedPosts }) {
  useEffect(() => {
    trackEvent("blog_post_view", { slug: post.slug, category: post.category }, { source: "blog" });
  }, [post.slug, post.category]);

  return <BlogPostPage post={post} relatedPosts={relatedPosts} />;
}

export async function getStaticPaths() {
  return {
    paths: blogPosts.map((p) => ({ params: { slug: p.slug } })),
    fallback: false,
  };
}

export async function getStaticProps({ params }) {
  const post = blogPostsBySlug[params.slug];
  if (!post) return { notFound: true };

  const relatedPosts = (post.relatedPosts || [])
    .map((slug) => blogPostsBySlug[slug])
    .filter(Boolean)
    .map(({ slug, h1, category, readingTime }) => ({ slug, h1, category, readingTime }));

  return {
    props: {
      post: {
        slug: post.slug,
        title: post.title,
        h1: post.h1,
        excerpt: post.excerpt,
        description: post.description,
        keywords: post.keywords,
        publishDate: post.publishDate,
        category: post.category,
        readingTime: post.readingTime,
        intro: post.intro,
        sections: post.sections,
        faqs: post.faqs,
      },
      relatedPosts,
    },
  };
}
