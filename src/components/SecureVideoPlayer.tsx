'use client';

import { useEffect, useId, useMemo, useRef } from 'react';
import 'plyr/dist/plyr.css';
import { cn } from '@/lib/cn';
import { extractYoutubeVideoId } from '@/lib/youtube';

type PlyrInstance = {
  playing: boolean;
  currentTime: number;
  play: () => Promise<void> | void;
  destroy: () => void;
  on: (event: string, callback: () => void) => void;
};

type PlyrConstructor = new (
  target: HTMLElement,
  options?: Record<string, unknown>,
) => PlyrInstance;

export type SecureVideoPlayerProps = {
  youtubeVideoId?: string;
  videoUrl?: string;
  autoplay?: boolean;
  watermarkText?: string;
  className?: string;
  playbackStorageKey?: string;
  reloadKey?: number;
  onPlayingChange?: (playing: boolean) => void;
  onEnded?: () => void;
};

const PLYR_CONTROLS = [
  'play-large',
  'play',
  'progress',
  'current-time',
  'mute',
  'volume',
  'settings',
  'pip',
  'airplay',
  'fullscreen',
] as const;

const YOUTUBE_PLAYER_OPTS = {
  rel: 0,
  showinfo: 0,
  iv_load_policy: 3,
  modestbranding: 1,
  disablekb: 0,
  fs: 0,
  controls: 0,
  cc_load_policy: 0,
  playsinline: 1,
};

function readSavedPlaybackTime(storageKey?: string): number {
  if (!storageKey || typeof window === 'undefined') return 0;
  try {
    const saved = Number(localStorage.getItem(storageKey) || '0');
    return Number.isFinite(saved) && saved > 0 ? saved : 0;
  } catch {
    return 0;
  }
}

function persistPlaybackTime(storageKey: string | undefined, time: number) {
  if (!storageKey) return;
  try {
    localStorage.setItem(storageKey, String(Math.max(0, time)));
  } catch {
    // Ignore storage failures.
  }
}

function scrubSensitiveDomAttributes(root: HTMLElement) {
  root.querySelectorAll('[data-plyr-embed-id]').forEach((node) => {
    node.removeAttribute('data-plyr-embed-id');
  });
  root.querySelectorAll('iframe').forEach((iframe) => {
    iframe.removeAttribute('title');
    iframe.setAttribute('referrerpolicy', 'no-referrer');
  });
}

function attachWatermark(plyrRoot: Element, text: string) {
  const existing = plyrRoot.querySelector('.video-watermark-layer');
  if (existing) existing.remove();

  const layer = document.createElement('div');
  layer.className =
    'video-watermark-layer pointer-events-none absolute inset-0 z-30 overflow-hidden';

  const floating = document.createElement('div');
  floating.className = 'video-watermark-float';

  const label = document.createElement('span');
  label.className = 'video-watermark-item';
  label.textContent = text;

  floating.appendChild(label);
  layer.appendChild(floating);
  plyrRoot.appendChild(layer);
}

export default function SecureVideoPlayer({
  youtubeVideoId,
  videoUrl,
  autoplay = false,
  watermarkText,
  className,
  playbackStorageKey,
  reloadKey = 0,
  onPlayingChange,
  onEnded,
}: SecureVideoPlayerProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const playerRef = useRef<PlyrInstance | null>(null);
  const lastPlaybackTimeRef = useRef(0);
  const wasPlayingBeforeHideRef = useRef(false);
  const lastPersistedAtRef = useRef(0);
  const instanceId = useId().replace(/:/g, '');

  const resolvedYoutubeId = useMemo(() => {
    return (
      extractYoutubeVideoId(youtubeVideoId || '') ||
      extractYoutubeVideoId(videoUrl || '') ||
      undefined
    );
  }, [youtubeVideoId, videoUrl]);

  const nativeVideoUrl = useMemo(() => {
    if (!videoUrl?.trim() || resolvedYoutubeId) return undefined;
    return videoUrl.trim();
  }, [resolvedYoutubeId, videoUrl]);

  const hasYoutube = Boolean(resolvedYoutubeId);
  const hasNativeVideo = Boolean(nativeVideoUrl);

  // Recover playback when the tab becomes visible again.
  useEffect(() => {
    const handleVisibilityChange = () => {
      const player = playerRef.current;
      if (!player) return;

      if (document.hidden) {
        try {
          wasPlayingBeforeHideRef.current = Boolean(player.playing);
          lastPlaybackTimeRef.current = Number(player.currentTime) || 0;
          persistPlaybackTime(playbackStorageKey, lastPlaybackTimeRef.current);
        } catch {
          wasPlayingBeforeHideRef.current = false;
          lastPlaybackTimeRef.current = 0;
        }
        return;
      }

      try {
        if (lastPlaybackTimeRef.current > 0) {
          const currentTime = Number(player.currentTime) || 0;
          if (Math.abs(currentTime - lastPlaybackTimeRef.current) > 1.5) {
            player.currentTime = lastPlaybackTimeRef.current;
          }
        }

        if (wasPlayingBeforeHideRef.current && typeof player.play === 'function') {
          const playPromise = player.play();
          if (playPromise && typeof playPromise.catch === 'function') {
            playPromise.catch(() => {});
          }
        }
      } catch {
        try {
          player.destroy();
        } catch {
          // Ignore destroy errors during recovery.
        }
        playerRef.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [playbackStorageKey]);

  useEffect(() => {
    let mounted = true;
    const container = containerRef.current;
    if (!container) return;

    if (!hasYoutube && !hasNativeVideo) {
      onPlayingChange?.(false);
      return;
    }

    container.innerHTML = '';
    lastPlaybackTimeRef.current = readSavedPlaybackTime(playbackStorageKey);

    const mountNode = document.createElement('div');
    mountNode.id = `secure-player-${instanceId}-${reloadKey}`;

    if (hasNativeVideo) {
      const video = document.createElement('video');
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.src = nativeVideoUrl!;
      if (autoplay) video.autoplay = true;
      mountNode.appendChild(video);
    } else {
      mountNode.setAttribute('data-plyr-provider', 'youtube');
      mountNode.setAttribute('data-plyr-embed-id', resolvedYoutubeId!);
    }

    container.appendChild(mountNode);

    const initPlayer = async () => {
      const plyrModule = await import('plyr');
      const PlyrCtor = ((plyrModule as { default?: PlyrConstructor }).default ||
        plyrModule) as PlyrConstructor;
      if (!mounted) return;

      const player = new PlyrCtor(mountNode, {
        controls: [...PLYR_CONTROLS],
        autoplay,
        // Use the local sprite so controls don't depend on cdn.plyr.io.
        iconUrl: '/plyr.svg',
        settings: ['captions', 'quality', 'speed'],
        speed: {
          selected: 1,
          options: [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2],
        },
        fullscreen: {
          enabled: true,
          fallback: true,
          iosNative: true,
        },
        youtube: {
          ...YOUTUBE_PLAYER_OPTS,
          noCookie: true,
        },
      });

      player.on('ready', () => {
        if (lastPlaybackTimeRef.current > 0) {
          try {
            player.currentTime = lastPlaybackTimeRef.current;
          } catch {
            // Ignore seek errors before the provider is ready.
          }
        }

        const plyrRoot = container.querySelector('.plyr');
        if (plyrRoot instanceof HTMLElement) {
          plyrRoot.classList.add('secure-video-plyr');
          scrubSensitiveDomAttributes(plyrRoot);
          if (watermarkText?.trim()) {
            attachWatermark(plyrRoot, watermarkText.trim());
          }
        }
      });

      player.on('play', () => onPlayingChange?.(true));
      player.on('pause', () => {
        onPlayingChange?.(false);
        try {
          persistPlaybackTime(playbackStorageKey, Number(player.currentTime) || 0);
        } catch {
          // Ignore pause persistence errors.
        }
      });
      player.on('ended', () => {
        onPlayingChange?.(false);
        persistPlaybackTime(playbackStorageKey, 0);
        onEnded?.();
      });
      player.on('timeupdate', () => {
        if (!playbackStorageKey) return;
        const now = Date.now();
        if (now - lastPersistedAtRef.current < 3000) return;
        lastPersistedAtRef.current = now;
        try {
          persistPlaybackTime(playbackStorageKey, Number(player.currentTime) || 0);
        } catch {
          // Ignore timeupdate persistence errors.
        }
      });

      playerRef.current = player;
    };

    initPlayer().catch(() => {
      // Avoid logging provider details to the console.
    });

    return () => {
      mounted = false;
      const player = playerRef.current;
      if (!player) return;

      try {
        lastPlaybackTimeRef.current = Number(player.currentTime) || 0;
        persistPlaybackTime(playbackStorageKey, lastPlaybackTimeRef.current);
      } catch {
        lastPlaybackTimeRef.current = 0;
      }

      try {
        player.destroy();
      } catch {
        // Ignore destroy errors on unmount.
      }
      playerRef.current = null;
    };
  }, [
    autoplay,
    hasNativeVideo,
    hasYoutube,
    instanceId,
    onEnded,
    onPlayingChange,
    playbackStorageKey,
    reloadKey,
    nativeVideoUrl,
    resolvedYoutubeId,
    watermarkText,
  ]);

  if (!hasYoutube && !hasNativeVideo) {
    return (
      <div
        className={cn(
          'flex h-full w-full items-center justify-center bg-black text-sm text-white/70',
          className
        )}
      >
        No video available
      </div>
    );
  }

  return (
    <div
      className={cn('secure-video-player relative h-full w-full overflow-hidden bg-black', className)}
      onContextMenu={(event) => event.preventDefault()}
    >
      <div ref={containerRef} className="h-full w-full" />
      {hasYoutube ? (
        <div
          className="youtube-title-blocker"
          aria-hidden
          onClick={(event) => event.preventDefault()}
          onMouseDown={(event) => event.preventDefault()}
        />
      ) : null}
    </div>
  );
}
