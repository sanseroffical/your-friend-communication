import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

type StorageBucket = 'chat-attachments' | 'social-images';

const KNOWN_BUCKETS: StorageBucket[] = ['chat-attachments', 'social-images'];

const getStorageReference = (source: string, defaultBucket?: StorageBucket) => {
  const trimmed = source.trim();
  if (!trimmed) return null;

  for (const bucket of KNOWN_BUCKETS) {
    if (trimmed.startsWith(`${bucket}:`)) {
      return { bucket, path: trimmed.slice(bucket.length + 1).split('?')[0] };
    }
  }

  try {
    const url = new URL(trimmed);
    const match = decodeURIComponent(url.pathname).match(/\/storage\/v1\/object\/(?:public|sign)\/([^/]+)\/(.+)$/);
    if (match && KNOWN_BUCKETS.includes(match[1] as StorageBucket)) {
      return { bucket: match[1] as StorageBucket, path: match[2] };
    }
    return null;
  } catch {
    return defaultBucket ? { bucket: defaultBucket, path: trimmed.split('?')[0] } : null;
  }
};

export const getStorageRef = (bucket: StorageBucket, path: string) => `${bucket}:${path}`;

export const useSignedStorageUrl = (
  source?: string | null,
  defaultBucket?: StorageBucket,
  expiresIn = 60 * 60,
) => {
  const [url, setUrl] = useState<string | null>(source || null);

  useEffect(() => {
    let cancelled = false;

    const resolveUrl = async () => {
      if (!source) {
        setUrl(null);
        return;
      }

      const ref = getStorageReference(source, defaultBucket);
      if (!ref) {
        setUrl(source);
        return;
      }

      const { data, error } = await supabase.storage
        .from(ref.bucket)
        .createSignedUrl(ref.path, expiresIn);

      if (!cancelled) {
        setUrl(error ? null : data.signedUrl);
      }
    };

    resolveUrl();

    return () => {
      cancelled = true;
    };
  }, [source, defaultBucket, expiresIn]);

  return url;
};