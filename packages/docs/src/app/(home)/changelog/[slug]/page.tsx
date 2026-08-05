import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { InlineTOC } from 'fumadocs-ui/components/inline-toc';
import { getMDXComponents } from '@/mdx-components';
import { changelogSource, formatChangelogDate } from '@/lib/source';

export default async function ChangelogEntryPage(
  props: PageProps<'/changelog/[slug]'>
) {
  const { slug } = await props.params;
  const page = changelogSource.getPage([slug]);
  if (!page) notFound();

  const MDX = page.data.body;

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <article className="mx-auto w-full max-w-3xl">
        <Link
          href="/changelog"
          className="text-sm text-fd-muted-foreground hover:text-fd-foreground"
        >
          ← Changelog
        </Link>
        <h1 className="mt-4 text-3xl font-bold tracking-tight">
          {page.data.title}
        </h1>
        {page.data.description ? (
          <p className="mt-2 text-fd-muted-foreground">
            {page.data.description}
          </p>
        ) : null}
        <div className="mt-4 flex flex-wrap items-center gap-2 border-b border-fd-border pb-6 text-xs text-fd-muted-foreground">
          <span className="rounded-full border border-fd-border bg-fd-muted/50 px-2 py-0.5 font-medium">
            {page.data.version ?? slug}
          </span>
          <time dateTime={new Date(page.data.date).toISOString()}>
            {formatChangelogDate(page.data.date)}
          </time>
        </div>
        {page.data.toc.length > 0 ? (
          <InlineTOC items={page.data.toc} defaultOpen className="mt-8" />
        ) : null}
        <div className="prose mt-8">
          <MDX components={getMDXComponents()} />
        </div>
      </article>
    </main>
  );
}

export function generateStaticParams() {
  return changelogSource.getPages().map((page) => ({
    slug: page.slugs[0],
  }));
}

export const dynamicParams = false;

export async function generateMetadata(
  props: PageProps<'/changelog/[slug]'>
): Promise<Metadata> {
  const { slug } = await props.params;
  const page = changelogSource.getPage([slug]);
  if (!page) notFound();

  const image = `/og/changelog/${slug}.webp`;

  return {
    title: page.data.title,
    description: page.data.description,
    openGraph: {
      type: 'article',
      title: page.data.title,
      description: page.data.description,
      publishedTime: new Date(page.data.date).toISOString(),
      images: image,
    },
    twitter: {
      card: 'summary_large_image',
      title: page.data.title,
      description: page.data.description,
      images: image,
    },
  };
}
