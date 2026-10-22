'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  ChevronRight,
  Clock,
  Folder,
  Globe,
  Scale,
  Search,
  Shield,
  Target,
  Users,
  Wallet,
  X,
  type LucideIcon,
} from 'lucide-react';
import Header from '../components/Header';
import {
  collections,
  findArticle,
  findCollection,
  searchArticles,
  type Block,
  type Collection,
  type CollectionIcon,
  type SearchHit,
} from './content';

const ICONS: Record<CollectionIcon, LucideIcon> = {
  globe: Globe,
  wallet: Wallet,
  shield: Shield,
  folder: Folder,
  target: Target,
  clock: Clock,
  users: Users,
  scale: Scale,
};

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <>
      {parts.map((part, index) =>
        part.startsWith('**') && part.endsWith('**') ? (
          <strong key={index} className="font-semibold text-white">
            {part.slice(2, -2)}
          </strong>
        ) : (
          <React.Fragment key={index}>{part}</React.Fragment>
        )
      )}
    </>
  );
}

function ArticleBody({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5 text-[15px] leading-7 text-[#c7c7c7]">
      {blocks.map((block, index) => {
        if (block.type === 'p') {
          return (
            <p key={index}>
              <RichText text={block.text} />
            </p>
          );
        }

        if (block.type === 'h3') {
          return (
            <h3 key={index} className="pt-2 text-lg font-semibold text-white">
              {block.text}
            </h3>
          );
        }

        if (block.type === 'ul') {
          return (
            <ul key={index} className="space-y-3">
              {block.items.map((item) => (
                <li key={item} className="flex items-start gap-3">
                  <span className="mt-2.5 h-1.5 w-1.5 flex-shrink-0 rounded-full bg-[#0FF1CE]" />
                  <span>
                    <RichText text={item} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }

        if (block.type === 'steps') {
          return (
            <ol key={index} className="space-y-5">
              {block.items.map((item, stepIndex) => (
                <li key={item.title} className="flex items-start gap-4">
                  <span className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-[#0FF1CE]/15 text-sm font-semibold text-[#0FF1CE]">
                    {stepIndex + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-white">{item.title}</h3>
                    <p className="mt-1">
                      <RichText text={item.text} />
                    </p>
                  </div>
                </li>
              ))}
            </ol>
          );
        }

        if (block.type === 'callout') {
          const tone =
            block.tone === 'danger'
              ? 'border-red-400/30 bg-red-400/10'
              : block.tone === 'warning'
                ? 'border-yellow-400/30 bg-yellow-400/10'
                : 'border-[#0FF1CE]/25 bg-[#0FF1CE]/10';
          const titleTone =
            block.tone === 'danger' ? 'text-red-300' : block.tone === 'warning' ? 'text-yellow-300' : 'text-[#0FF1CE]';
          return (
            <div key={index} className={`rounded-xl border px-4 py-4 ${tone}`}>
              {block.title && <p className={`mb-1 font-semibold ${titleTone}`}>{block.title}</p>}
              <p>
                <RichText text={block.text} />
              </p>
            </div>
          );
        }

        if (block.type === 'quote') {
          return (
            <blockquote key={index} className="border-l-2 border-[#0FF1CE]/40 pl-4 text-[#d5d5d5] italic">
              {block.text}
            </blockquote>
          );
        }

        return (
          <div key={index} className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full text-left text-sm">
              <thead className="bg-white/[0.03] text-gray-400">
                <tr>
                  {block.headers.map((header) => (
                    <th key={header} className="px-4 py-3 font-medium">
                      {header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {block.rows.map((row) => (
                  <tr key={row[0]} className="border-t border-white/10 align-top">
                    {row.map((cell, cellIndex) => (
                      <td
                        key={`${row[0]}-${cellIndex}`}
                        className={`px-4 py-3 ${
                          cell.includes('✓')
                            ? 'text-[#0FF1CE]'
                            : cell.includes('✗')
                              ? 'text-red-400'
                              : cellIndex === 0
                                ? 'font-medium text-white'
                                : 'text-[#c7c7c7]'
                        }`}
                      >
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
      })}
    </div>
  );
}

function AuthorMark() {
  return (
    <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#0FF1CE] text-[11px] font-bold text-black">
      S
    </span>
  );
}

function CollectionCard({ collection }: { collection: Collection }) {
  const Icon = ICONS[collection.icon];
  return (
    <Link
      href={`/How-Shockwave-Operates/${collection.slug}`}
      className="group flex flex-col rounded-xl border border-[#2a2a2a] bg-[#141414] p-5 transition-colors hover:border-[#3a3a3a] hover:bg-[#171717]"
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#1c2736] text-[#c5d4e8]">
        <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} />
      </span>
      <h2 className="mt-4 text-[15px] font-semibold text-white">{collection.title}</h2>
      <p className="mt-1 text-sm leading-snug text-[#a3a3a3]">{collection.description}</p>
      <p className="mt-auto flex items-center gap-2 pt-4 text-xs text-[#8d8d8d]">
        <AuthorMark />
        <span>
          By Shockwave <span className="px-1 text-[#5c5c5c]">·</span> {collection.articles.length}{' '}
          {collection.articles.length === 1 ? 'article' : 'articles'}
        </span>
      </p>
    </Link>
  );
}

function ArticleLink({
  href,
  title,
  description,
  onClick,
}: {
  href: string;
  title: string;
  description?: string;
  onClick?: () => void;
}) {
  return (
    <Link
      href={href}
      onClick={onClick}
      className="group flex items-start justify-between gap-4 py-4"
    >
      <span>
        <span className="block font-medium text-white transition-colors group-hover:text-[#0FF1CE]">{title}</span>
        {description && <span className="mt-1 block text-sm leading-snug text-[#8d8d8d]">{description}</span>}
      </span>
      <ChevronRight className="mt-1 h-4 w-4 flex-shrink-0 text-[#6b6b6b] transition-colors group-hover:text-[#0FF1CE]" />
    </Link>
  );
}

export default function HelpCenter({ slug = [] }: { slug?: string[] }) {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [collectionSlug, articleSlug, ...rest] = slug;
  const collection = collectionSlug ? findCollection(collectionSlug) : undefined;
  const article = collection && articleSlug ? findArticle(collection, articleSlug) : undefined;
  const missing = rest.length > 0 || Boolean(collectionSlug && !collection) || Boolean(articleSlug && !article);
  const searching = query.trim().length > 0;
  const results = useMemo(() => searchArticles(query), [query]);
  const isHome = !collectionSlug && !articleSlug && !missing;

  useEffect(() => {
    window.scrollTo(0, 0);
    setQuery('');
  }, [collectionSlug, articleSlug]);

  const goToHit = (hit: SearchHit) => {
    setQuery('');
    router.push(`/How-Shockwave-Operates/${hit.collection.slug}/${hit.article.slug}`);
  };

  return (
    <div className="min-h-screen bg-[#0b0b0b] text-white">
      <Header />

      <main className="mx-auto max-w-[860px] px-4 pb-24 pt-28 md:pt-32">
        {isHome && !searching && (
          <header className="mb-8 text-center">
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-[2.5rem]">How Shockwave Operates</h1>
            <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-[#9a9a9a] md:text-base">
              No secrets. No fine print. Just real trading, real payouts, and a model you can trust.
            </p>
          </header>
        )}

        <form
          role="search"
          className={`relative ${isHome && !searching ? 'mx-auto mb-10 max-w-[640px]' : 'mb-8'}`}
          onSubmit={(event) => {
            event.preventDefault();
            if (results[0]) goToHit(results[0]);
          }}
        >
          <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-[#8d8d8d]" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Escape') setQuery('');
            }}
            type="text"
            placeholder="Search for articles..."
            aria-label="Search for articles"
            className="h-12 w-full rounded-xl border border-transparent bg-[#2a2a2a] pl-11 pr-11 text-sm text-white placeholder:text-[#8d8d8d] outline-none transition-colors focus:border-[#0FF1CE]/40"
          />
          {searching && (
            <button
              type="button"
              onClick={() => setQuery('')}
              aria-label="Clear search"
              className="absolute right-3 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-[#8d8d8d] hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </form>

        {searching ? (
          <section aria-live="polite">
            <p className="mb-3 text-sm text-[#8d8d8d]">
              {results.length} {results.length === 1 ? 'article' : 'articles'}
            </p>
            {results.length > 0 ? (
              <div className="divide-y divide-white/10 border-y border-white/10">
                {results.map((hit) => (
                  <ArticleLink
                    key={`${hit.collection.slug}/${hit.article.slug}`}
                    href={`/How-Shockwave-Operates/${hit.collection.slug}/${hit.article.slug}`}
                    title={hit.article.title}
                    description={hit.collection.title}
                    onClick={() => setQuery('')}
                  />
                ))}
              </div>
            ) : (
              <div className="rounded-xl border border-[#2a2a2a] bg-[#141414] px-5 py-10 text-center">
                <p className="text-white">No articles for “{query.trim()}”.</p>
                <p className="mt-2 text-sm text-[#8d8d8d]">Try a rule, a program name, or a word like payout or drawdown.</p>
              </div>
            )}
          </section>
        ) : missing ? (
          <section className="py-16 text-center">
            <h1 className="text-2xl font-semibold text-white">We couldn&apos;t find that page</h1>
            <p className="mt-2 text-sm text-[#9a9a9a]">That collection or article isn&apos;t in the help center.</p>
            <Link
              href="/How-Shockwave-Operates"
              className="mt-6 inline-flex text-sm font-medium text-[#0FF1CE] hover:underline"
            >
              Back to all collections
            </Link>
          </section>
        ) : article && collection ? (
          <article>
            <nav className="mb-6 flex flex-wrap items-center gap-2 text-sm text-[#8d8d8d]">
              <Link href="/How-Shockwave-Operates" className="hover:text-white">
                All collections
              </Link>
              <ChevronRight className="h-3.5 w-3.5" />
              <Link href={`/How-Shockwave-Operates/${collection.slug}`} className="hover:text-white">
                {collection.title}
              </Link>
            </nav>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{article.title}</h1>
            <p className="mt-4 flex items-center gap-2 text-sm text-[#8d8d8d]">
              <AuthorMark />
              Written by Shockwave
            </p>
            <div className="mt-8">
              <ArticleBody blocks={article.blocks} />
            </div>

            {collection.articles.length > 1 && (
              <aside className="mt-14 border-t border-white/10 pt-8">
                <h2 className="text-sm font-medium text-[#8d8d8d]">More in {collection.title}</h2>
                <div className="mt-2 divide-y divide-white/10 border-b border-white/10">
                  {collection.articles
                    .filter((item) => item.slug !== article.slug)
                    .map((item) => (
                      <ArticleLink
                        key={item.slug}
                        href={`/How-Shockwave-Operates/${collection.slug}/${item.slug}`}
                        title={item.title}
                        description={item.description}
                      />
                    ))}
                </div>
              </aside>
            )}
          </article>
        ) : collection ? (
          <section>
            <nav className="mb-6 text-sm">
              <Link href="/How-Shockwave-Operates" className="text-[#8d8d8d] hover:text-white">
                ← All collections
              </Link>
            </nav>
            <h1 className="text-3xl font-bold tracking-tight text-white md:text-4xl">{collection.title}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-[#9a9a9a] md:text-base">{collection.description}</p>
            <p className="mt-4 flex items-center gap-2 text-xs text-[#8d8d8d]">
              <AuthorMark />
              <span>
                By Shockwave <span className="px-1 text-[#5c5c5c]">·</span> {collection.articles.length}{' '}
                {collection.articles.length === 1 ? 'article' : 'articles'}
              </span>
            </p>
            <div className="mt-8 divide-y divide-white/10 border-y border-white/10">
              {collection.articles.map((item) => (
                <ArticleLink
                  key={item.slug}
                  href={`/How-Shockwave-Operates/${collection.slug}/${item.slug}`}
                  title={item.title}
                  description={item.description}
                />
              ))}
            </div>
          </section>
        ) : (
          <section>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {collections.map((item) => (
                <CollectionCard key={item.slug} collection={item} />
              ))}
            </div>

            <div className="mt-14 rounded-xl border border-[#2a2a2a] bg-[#141414] px-6 py-8 text-center">
              <h2 className="text-xl font-semibold text-white md:text-2xl">Ready to Start Your Journey?</h2>
              <p className="mx-auto mt-2 max-w-xl text-sm leading-relaxed text-[#9a9a9a] md:text-base">
                Join the next generation of funded traders. No hidden rules, no surprises — just pure trading potential.
              </p>
              <Link
                href="/challenge"
                className="mt-6 inline-flex items-center gap-2 rounded-lg bg-[#0FF1CE] px-5 py-3 text-sm font-bold text-black transition-transform hover:scale-[1.02]"
              >
                Start Your Challenge
                <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-white/5 py-10 text-center text-sm text-[#8d8d8d]">Shockwave Help Center</footer>
    </div>
  );
}
