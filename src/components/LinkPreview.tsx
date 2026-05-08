import { useState, useEffect, memo } from 'react';
import { ExternalLink, Play } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

interface LinkPreviewData {
  title: string | null;
  description: string | null;
  image: string | null;
  site_name: string | null;
  url: string;
}

const STREAM_DOMAIN = 'stream-smile-share.lovable.app';
const EMBED_HOST_REGEX = /^https?:\/\/([^\/]*\.)?(lovable\.app|base44\.app)(\/|$)/i;

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

// Simple in-memory cache
const previewCache = new Map<string, LinkPreviewData | null>();

export function extractUrls(text: string): string[] {
  return text.match(URL_REGEX) || [];
}

function isEmbeddableApp(url: string): boolean {
  return EMBED_HOST_REGEX.test(url);
}

function getEmbedLabel(url: string): string {
  try {
    const host = new URL(url).hostname;
    if (host === STREAM_DOMAIN) return 'Open on Stream Smile Share';
    if (host.endsWith('.lovable.app') || host === 'lovable.app') return 'Open Lovable app';
    if (host.endsWith('.base44.app') || host === 'base44.app') return 'Open Base44 app';
    return 'Open app';
  } catch {
    return 'Open app';
  }
}

const AppEmbed = memo(({ url }: { url: string }) => {
  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-border bg-card">
      <iframe
        src={url}
        width="100%"
        height="420"
        frameBorder="0"
        loading="lazy"
        allow="autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
        referrerPolicy="no-referrer-when-downgrade"
        className="w-full bg-background"
        title="Embedded app preview"
      />
      <a
        href={url}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2 px-3 py-2 text-xs text-muted-foreground hover:text-foreground transition-colors border-t border-border"
      >
        <Play className="h-3 w-3" />
        {getEmbedLabel(url)}
        <ExternalLink className="h-3 w-3 ml-auto" />
      </a>
    </div>
  );
});
AppEmbed.displayName = 'AppEmbed';

const GenericPreview = memo(({ data }: { data: LinkPreviewData }) => {
  if (!data.title && !data.description && !data.image) return null;

  return (
    <a
      href={data.url}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-2 flex overflow-hidden rounded-lg border border-border bg-card hover:bg-accent/30 transition-colors group block animate-fade-in"
    >
      {data.image && (
        <div className="w-24 h-24 sm:w-32 sm:h-24 shrink-0 bg-muted">
          <img
            src={data.image}
            alt={data.title || 'Preview'}
            className="w-full h-full object-cover"
            loading="lazy"
            onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
          />
        </div>
      )}
      <div className="flex-1 min-w-0 p-3">
        {data.site_name && (
          <p className="text-xs text-muted-foreground truncate">{data.site_name}</p>
        )}
        {data.title && (
          <p className="text-sm font-medium truncate group-hover:text-primary transition-colors">
            {data.title}
          </p>
        )}
        {data.description && (
          <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{data.description}</p>
        )}
      </div>
      <div className="flex items-center pr-3">
        <ExternalLink className="h-3.5 w-3.5 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </a>
  );
});
GenericPreview.displayName = 'GenericPreview';

interface LinkPreviewProps {
  text: string;
  maxPreviews?: number;
}

const PreviewSkeleton = memo(() => (
  <div className="mt-2 flex overflow-hidden rounded-lg border border-border bg-card">
    <Skeleton className="w-24 h-24 sm:w-32 sm:h-24 shrink-0 rounded-none" />
    <div className="flex-1 min-w-0 p-3 space-y-2">
      <Skeleton className="h-3 w-20" />
      <Skeleton className="h-4 w-3/4" />
      <Skeleton className="h-3 w-full" />
    </div>
  </div>
));
PreviewSkeleton.displayName = 'PreviewSkeleton';

const LinkPreview = ({ text, maxPreviews = 3 }: LinkPreviewProps) => {
  const [previews, setPreviews] = useState<Map<string, LinkPreviewData | null>>(new Map());
  const [loading, setLoading] = useState<Set<string>>(new Set());
  const urls = extractUrls(text).slice(0, maxPreviews);

  useEffect(() => {
    if (urls.length === 0) return;

    const nonStreamUrls = urls.filter((u) => !u.includes(STREAM_DOMAIN));
    const uncached = nonStreamUrls.filter((u) => !previewCache.has(u));

    // Immediately apply cached results
    const cached = new Map<string, LinkPreviewData | null>();
    nonStreamUrls.forEach((u) => {
      if (previewCache.has(u)) cached.set(u, previewCache.get(u)!);
    });
    if (cached.size > 0) setPreviews(cached);

    if (uncached.length === 0) return;

    setLoading(new Set(uncached));

    const fetchPreviews = async () => {
      const newPreviews = new Map(cached);

      await Promise.all(
        uncached.map(async (url) => {
          try {
            const { data, error } = await supabase.functions.invoke('link-preview', {
              body: { url },
            });
            if (!error && data && !data.error) {
              previewCache.set(url, data);
              newPreviews.set(url, data);
            } else {
              previewCache.set(url, null);
            }
          } catch {
            previewCache.set(url, null);
          }
        })
      );

      setPreviews(newPreviews);
      setLoading(new Set());
    };

    fetchPreviews();
  }, [text]);

  if (urls.length === 0) return null;

  return (
    <div className="space-y-2">
      {urls.map((url) => {
        if (url.includes(STREAM_DOMAIN)) {
          return <StreamEmbed key={url} url={url} />;
        }

        if (loading.has(url)) {
          return <PreviewSkeleton key={url} />;
        }

        const data = previews.get(url);
        if (!data) return null;

        return <GenericPreview key={url} data={data} />;
      })}
    </div>
  );
};

export default memo(LinkPreview);
