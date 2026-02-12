import { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { getGhostPosts, GhostPost } from "@/lib/ghost";
import { getSEOTags } from "@/lib/seo";
import { Container } from "@/components/container";
import { Badge } from "@/components/badge";
import { Heading } from "@/components/heading";
import { SubHeading } from "@/components/subheading";
import { DivideX } from "@/components/divide";

export const metadata: Metadata = getSEOTags({
  title: "Blog",
  description:
    "Insights on UK procurement intelligence, government contracts, and tender strategies.",
  canonicalUrlRelative: "/blog",
});

function formatDate(dateString: string) {
  return new Date(dateString).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function PostCard({ post }: { post: GhostPost }) {
  return (
    <Link href={`/blog/${post.slug}`} className="group flex flex-col gap-4">
      {post.feature_image && (
        <div className="relative aspect-[16/10] overflow-hidden rounded-lg border border-gray-300 dark:border-neutral-800">
          <Image
            src={post.feature_image}
            alt={post.feature_image_alt || post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="(max-width: 768px) 100vw, 33vw"
          />
        </div>
      )}
      <div className="flex flex-col gap-2">
        {post.tags.length > 0 && (
          <span className="text-xs font-medium uppercase tracking-wider text-brand">
            {post.tags[0].name}
          </span>
        )}
        <h3 className="text-lg font-medium text-black group-hover:text-brand dark:text-white">
          {post.title}
        </h3>
        <p className="line-clamp-2 text-sm text-gray-600 dark:text-neutral-400">
          {post.excerpt}
        </p>
        <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-neutral-500">
          {post.authors[0] && <span>{post.authors[0].name}</span>}
          <span>&middot;</span>
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
    </Link>
  );
}

function PostRow({ post }: { post: GhostPost }) {
  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group flex items-start gap-6 py-6"
    >
      {post.feature_image && (
        <div className="relative hidden h-24 w-36 shrink-0 overflow-hidden rounded-lg border border-gray-300 sm:block dark:border-neutral-800">
          <Image
            src={post.feature_image}
            alt={post.feature_image_alt || post.title}
            fill
            className="object-cover transition-transform duration-300 group-hover:scale-105"
            sizes="144px"
          />
        </div>
      )}
      <div className="flex flex-col gap-1">
        {post.tags.length > 0 && (
          <span className="text-xs font-medium uppercase tracking-wider text-brand">
            {post.tags[0].name}
          </span>
        )}
        <h3 className="text-base font-medium text-black group-hover:text-brand dark:text-white">
          {post.title}
        </h3>
        <p className="line-clamp-2 text-sm text-gray-600 dark:text-neutral-400">
          {post.excerpt}
        </p>
        <div className="mt-1 flex items-center gap-2 text-xs text-gray-600 dark:text-neutral-500">
          {post.authors[0] && <span>{post.authors[0].name}</span>}
          <span>&middot;</span>
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
    </Link>
  );
}

export default async function BlogPage() {
  const posts = await getGhostPosts();
  const gridPosts = posts.slice(0, 3);
  const rowPosts = posts.slice(3);

  return (
    <Container className="px-6 py-20 md:py-32">
      <div className="mx-auto flex max-w-2xl flex-col items-center gap-4">
        <Badge text="Blog" />
        <Heading>Procurement Insights</Heading>
        <SubHeading>
          Expert analysis on UK government contracts, tender strategies, and
          procurement intelligence.
        </SubHeading>
      </div>

      {posts.length === 0 && (
        <p className="mt-16 text-center text-gray-600 dark:text-neutral-400">
          No posts published yet. Check back soon.
        </p>
      )}

      {gridPosts.length > 0 && (
        <div className="mt-16 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {gridPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      )}

      {rowPosts.length > 0 && (
        <div className="mt-12">
          <DivideX />
          {rowPosts.map((post) => (
            <div key={post.id}>
              <PostRow post={post} />
              <DivideX />
            </div>
          ))}
        </div>
      )}
    </Container>
  );
}
