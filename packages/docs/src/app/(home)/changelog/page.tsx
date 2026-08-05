import Link from 'next/link';
import type { Metadata } from 'next';
import { formatChangelogDate, getChangelogEntries } from '@/lib/source';

export const metadata: Metadata = {
  title: 'Changelog',
  description: 'Release notes for AIOStreams.',
};

export default function ChangelogIndex() {
  const entries = getChangelogEntries();

  return (
    <main className="flex flex-1 flex-col px-6 py-16">
      <div className="mx-auto w-full max-w-3xl">
        <h1 className="text-3xl font-bold tracking-tight">Changelog</h1>
        <p className="mt-2 text-fd-muted-foreground">
          Major releases, new features and breaking changes. Every change, down
          to the commit, is in{' '}
          <Link
            href="https://github.com/Viren070/AIOStreams/blob/main/CHANGELOG.md"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-fd-foreground"
          >
            CHANGELOG.md
          </Link>
          .
        </p>

        <div className="mt-10 flex flex-col gap-3">
          {entries.length === 0 ? (
            <p className="text-sm text-fd-muted-foreground">
              Nothing here yet — check back after the next release.
            </p>
          ) : (
            entries.map((entry) => (
              <Link
                key={entry.url}
                href={entry.url}
                className="group flex flex-col gap-2 rounded-xl border border-fd-border bg-fd-card p-5 transition-all hover:border-fd-primary/30 hover:bg-fd-muted"
              >
                <div className="flex flex-wrap items-center gap-2 text-xs text-fd-muted-foreground">
                  <span className="rounded-full border border-fd-border bg-fd-muted/50 px-2 py-0.5 font-medium">
                    {entry.data.version ?? entry.slugs.at(-1)}
                  </span>
                  <time dateTime={new Date(entry.data.date).toISOString()}>
                    {formatChangelogDate(entry.data.date)}
                  </time>
                  {entry.data.draft ? (
                    <span className="rounded-full border border-fd-border px-2 py-0.5 font-medium">
                      Draft
                    </span>
                  ) : null}
                </div>
                <p className="font-semibold">{entry.data.title}</p>
                {entry.data.description ? (
                  <p className="text-sm text-fd-muted-foreground">
                    {entry.data.description}
                  </p>
                ) : null}
              </Link>
            ))
          )}
        </div>
      </div>
    </main>
  );
}
