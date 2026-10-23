import { useState } from 'react';
import { ImageOff } from 'lucide-react';

/** Fades the photo in once it has loaded (instant for reduced-motion users). */
export function Photo({ src, alt, className = '' }: { src?: string; alt: string; className?: string }) {
  const [state, setState] = useState<'loading' | 'loaded' | 'failed'>('loading');
  return <div className={`relative overflow-hidden bg-muted ${className}`}>
    {state === 'failed' || !src
      ? src === undefined && state !== 'failed'
        ? <div className="absolute inset-0 animate-pulse bg-muted motion-reduce:animate-none" />
        : <div className="absolute inset-0 flex items-center justify-center text-muted-foreground"><ImageOff aria-hidden="true" className="h-8 w-8" /></div>
      : <img src={src} alt={alt} onLoad={() => setState('loaded')} onError={() => setState('failed')}
        className={`h-full w-full object-cover object-top transition-opacity duration-500 motion-reduce:transition-none ${state === 'loaded' ? 'opacity-100' : 'opacity-0'}`} />}
  </div>;
}
