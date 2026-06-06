import { clsx } from 'clsx';

const LOGO_SRC = '/logo_billetra.png';

interface LogoProps {
  /** "full" = full vertical lockup (wallet + wordmark). "mark" = wallet glyph only. */
  variant?: 'full' | 'mark';
  /** Pixel size: height for `full`, box edge for `mark`. */
  size?: number;
  className?: string;
}

/**
 * Billetra app logo. The source asset is a vertical lockup (wallet over the
 * "billetra" wordmark). `mark` crops to the wallet glyph for tight horizontal
 * spots; `full` shows the whole lockup for centered brand moments.
 */
export function Logo({ variant = 'mark', size = 32, className }: LogoProps) {
  if (variant === 'full') {
    return (
      <img
        src={LOGO_SRC}
        alt="Billetra"
        style={{ height: size, width: 'auto' }}
        className={clsx('object-contain select-none', className)}
        draggable={false}
      />
    );
  }

  // Mark: square box that zooms the lockup and anchors to the top so only the
  // wallet glyph shows (wordmark is cropped out below the box).
  return (
    <span
      role="img"
      aria-label="Billetra"
      style={{
        width: size,
        height: size,
        backgroundImage: `url(${LOGO_SRC})`,
        backgroundSize: '118% auto',
        backgroundPosition: 'center -2%',
        backgroundRepeat: 'no-repeat',
      }}
      className={clsx('inline-block shrink-0 select-none', className)}
    />
  );
}
