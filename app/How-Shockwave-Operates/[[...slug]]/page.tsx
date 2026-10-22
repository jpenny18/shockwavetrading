import type { Metadata } from 'next';
import HelpCenter from '../HelpCenter';
import { findArticle, findCollection } from '../content';

type PageProps = {
  params: { slug?: string[] };
};

export function generateMetadata({ params }: PageProps): Metadata {
  const [collectionSlug, articleSlug] = params.slug ?? [];
  const collection = collectionSlug ? findCollection(collectionSlug) : undefined;
  const article = collection && articleSlug ? findArticle(collection, articleSlug) : undefined;

  if (article) {
    return {
      title: `${article.title} · Shockwave Help Center`,
      description: article.description,
    };
  }

  if (collection) {
    return {
      title: `${collection.title} · Shockwave Help Center`,
      description: collection.description,
    };
  }

  return {
    title: 'How Shockwave Operates · Shockwave Capital',
    description: 'No secrets. No fine print. Just real trading, real payouts, and a model you can trust.',
  };
}

export default function HowShockwaveOperatesPage({ params }: PageProps) {
  return <HelpCenter slug={params.slug ?? []} />;
}
