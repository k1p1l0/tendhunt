import Image from "next/image";
import Link from "next/link";
import { getGhostPosts, GhostPost } from "@/lib/ghost";
import { Container } from "./container";
import { SectionHeading } from "./seciton-heading";

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
        </div>
      </div>
    </Link>
  );
}

export async function LatestPosts() {
  const posts = await getGhostPosts();
  const latest = posts.slice(0, 3);

  if (latest.length === 0) return null;

  return (
    <Container className="px-6 py-20 md:py-28">
      <div className="flex items-end justify-between">
        <SectionHeading className="text-left">
          Latest from the blog
        </SectionHeading>
        <Link
          href="/blog"
          className="hidden text-sm font-medium text-brand hover:underline sm:block"
        >
          View all posts &rarr;
        </Link>
      </div>
      <div className="mt-10 grid gap-8 md:grid-cols-2 lg:grid-cols-3">
        {latest.map((post) => (
          <PostCard key={post.id} post={post} />
        ))}
      </div>
      <Link
        href="/blog"
        className="mt-8 block text-center text-sm font-medium text-brand hover:underline sm:hidden"
      >
        View all posts &rarr;
      </Link>
    </Container>
  );
}
