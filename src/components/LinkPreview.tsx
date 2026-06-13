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

const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`\[\]]+/gi;

// Simple in-memory cache
const previewCache = new Map<string, LinkPreviewData | null>();

export function extractUrls(text: string): string[] {
  return text.match(URL_REGEX) || [];
}

// Transform certain known URLs into their embeddable form
function toEmbedUrl(raw: string): { src: string; height: number } | null {
  try {
    const u = new URL(raw);
    const host = u.hostname.replace(/^www\./, '');

    // YouTube
    if (host === 'youtube.com' || host === 'm.youtube.com') {
      const v = u.searchParams.get('v');
      if (v) return { src: `https://www.youtube.com/embed/${v}`, height: 360 };
      if (u.pathname.startsWith('/shorts/')) {
        return { src: `https://www.youtube.com/embed/${u.pathname.split('/')[2]}`, height: 560 };
      }
      if (u.pathname.startsWith('/embed/')) return { src: raw, height: 360 };
    }
    if (host === 'youtu.be') {
      const id = u.pathname.replace('/', '');
      if (id) return { src: `https://www.youtube.com/embed/${id}`, height: 360 };
    }

    // Vimeo
    if (host === 'vimeo.com') {
      const id = u.pathname.split('/').filter(Boolean)[0];
      if (id && /^\d+$/.test(id)) return { src: `https://player.vimeo.com/video/${id}`, height: 360 };
    }

    // Twitch
    if (host === 'twitch.tv') {
      const parts = u.pathname.split('/').filter(Boolean);
      const parent = window.location.hostname;
      if (parts[0] && !['videos', 'directory'].includes(parts[0])) {
        return { src: `https://player.twitch.tv/?channel=${parts[0]}&parent=${parent}`, height: 360 };
      }
    }

    // SoundCloud
    if (host === 'soundcloud.com') {
      return { src: `https://w.soundcloud.com/player/?url=${encodeURIComponent(raw)}&color=%23a855f7&auto_play=false`, height: 166 };
    }

    // Spotify
    if (host === 'open.spotify.com') {
      return { src: raw.replace('open.spotify.com/', 'open.spotify.com/embed/'), height: 232 };
    }

    // CodePen / CodeSandbox / StackBlitz
    if (host === 'codepen.io') {
      return { src: raw.replace('/pen/', '/embed/'), height: 400 };
    }
    if (host === 'codesandbox.io') {
      return { src: raw.includes('/embed/') ? raw : raw.replace('/s/', '/embed/').replace('/sandbox/', '/embed/'), height: 500 };
    }
    if (host === 'stackblitz.com') {
      return { src: raw.includes('embed=') ? raw : `${raw}${raw.includes('?') ? '&' : '?'}embed=1`, height: 500 };
    }

    // Google Maps
    if (host === 'google.com' && u.pathname.startsWith('/maps')) {
      return { src: `https://maps.google.com/maps?q=${encodeURIComponent(u.searchParams.get('q') || '')}&output=embed`, height: 360 };
    }

    // Loom
    if (host === 'loom.com' && u.pathname.startsWith('/share/')) {
      return { src: raw.replace('/share/', '/embed/'), height: 400 };
    }

    // Lovable / Base44 apps & generic *.app demo hosts
    if (
      host === 'lovable.app' || host.endsWith('.lovable.app') ||
      host === 'base44.app' || host.endsWith('.base44.app') ||
      host.endsWith('.vercel.app') || host.endsWith('.netlify.app') ||
      host.endsWith('.pages.dev') || host.endsWith('.github.io')
    ) {
      return { src: raw, height: 420 };
    }

    // Fallback: try iframe — many sites block it via X-Frame-Options, but
    // when they do the OG-card still renders below as a usable fallback.
    return { src: raw, height: 420 };
  } catch {
    return null;
  }
}

function getEmbedLabel(url: string): string {
  try {
    const host = new URL(url).hostname;
    if (host === STREAM_DOMAIN) return 'Open on Stream Smile Share';
    return `Open ${host.replace(/^www\./, '')}`;
  } catch {
    return 'Open link';
  }
}

const AppEmbed = memo(({ url, height }: { url: string; height: number }) => {
  return (
    <div className="mt-2 rounded-lg overflow-hidden border border-border bg-card">
      <iframe
        src={url}
        width="100%"
        height={height}
        frameBorder="0"
        loading="lazy"
        allow="autoplay; fullscreen; clipboard-write; encrypted-media; picture-in-picture"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox allow-presentation"
        referrerPolicy="no-referrer-when-downgrade"
        className="w-full bg-background"
        title="Embedded preview"
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

    const nonEmbedUrls = urls.filter((u) => !toEmbedUrl(u));
    const uncached = nonEmbedUrls.filter((u) => !previewCache.has(u));

    // Immediately apply cached results
    const cached = new Map<string, LinkPreviewData | null>();
    nonEmbedUrls.forEach((u) => {
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
        const embed = toEmbedUrl(url);
        if (embed) {
          return <AppEmbed key={url} url={embed.src} height={embed.height} />;
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
