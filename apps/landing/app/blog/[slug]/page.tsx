import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getGhostPostBySlug, getGhostPosts } from "@/lib/ghost";
import { Container } from "@/components/container";
import config from "@/config";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  const posts = await getGhostPosts();
  return posts.map((post) => ({ slug: post.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = await getGhostPostBySlug(slug);

  if (!post) {
    return { title: "Post Not Found" };
  }

  const title = post.meta_title || post.title;
  const description = post.meta_description || post.excerpt;
  const image = post.og_image || post.feature_image;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: "article",
      publishedTime: post.published_at,
      modifiedTime: post.updated_at,
      authors: post.authors.map((a) => a.name),
      tags: post.tags.map((t) => t.name),
      url: `${config.websiteUrl}/blog/${post.slug}`,
      images: image ? [{ url: image }] : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: image ? [image] : undefined,
    },
  };
}

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = await getGhostPostBySlug(slug);

  if (!post) {
    notFound();
  }

  const primaryAuthor = post.authors[0];

  return (
    <Container className="px-6 py-20 md:py-32">
      <article className="mx-auto max-w-3xl">
        {/* Header */}
        <header className="flex flex-col gap-4">
          {post.tags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag.id}
                  className="rounded-full border border-gray-300 px-3 py-1 text-xs font-medium text-gray-600 dark:border-neutral-700 dark:text-neutral-400"
                >
                  {tag.name}
                </span>
              ))}
            </div>
          )}

          <h1 className="text-3xl font-medium tracking-tight text-black md:text-4xl lg:text-5xl dark:text-white">
            {post.title}
          </h1>

          <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-neutral-400">
            {primaryAuthor?.profile_image && (
              <Image
                src={primaryAuthor.profile_image}
                alt={primaryAuthor.name}
                width={36}
                height={36}
                className="rounded-full"
              />
            )}
            <div className="flex flex-col">
              {primaryAuthor && (
                <span className="font-medium text-black dark:text-white">
                  {primaryAuthor.name}
                </span>
              )}
              <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-neutral-500">
                <time dateTime={post.published_at}>
                  {formatDate(post.published_at)}
                </time>
                {post.reading_time > 0 && (
                  <>
                    <span>&middot;</span>
                    <span>{post.reading_time} min read</span>
                  </>
                )}
              </div>
            </div>
          </div>
        </header>

        {/* Feature image */}
        {post.feature_image && (
          <div className="relative mt-8 aspect-[2/1] overflow-hidden rounded-xl border border-gray-300 dark:border-neutral-800">
            <Image
              src={post.feature_image}
              alt={post.feature_image_alt || post.title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 768px"
              priority
            />
          </div>
        )}

        {/* Content */}
        <div
          className="gh-content prose prose-neutral mt-12 max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: post.html ?? "" }}
        />

        {/* Back link */}
        <div className="mt-16 border-t border-gray-300 pt-8 dark:border-neutral-800">
          <Link
            href="/blog"
            className="text-sm font-medium text-brand hover:underline"
          >
            &larr; Back to all posts
          </Link>
        </div>
      </article>
    </Container>
  );
}
