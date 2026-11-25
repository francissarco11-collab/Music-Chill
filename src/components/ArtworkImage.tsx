import { useState } from 'react';
import { Disc3 } from 'lucide-react';

interface ArtworkImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ArtworkImage({ src, alt, className = '' }: ArtworkImageProps) {
  const [failed, setFailed] = useState(false);

  if (failed || !src) {
    return (
      <div
        className={`flex items-center justify-center bg-gradient-to-br from-[#1B2330] to-[#0E131B] text-[#64748B] ${className}`}
        aria-label={alt}
      >
        <Disc3 className="w-1/3 h-1/3 opacity-60" />
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className={`object-cover ${className}`}
    />
  );
}
