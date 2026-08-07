type BrandIconProps = {
  size?: number;
  className?: string;
  alt?: string;
};

export default function BrandIcon({
  size = 32,
  className = "",
  alt = "",
}: BrandIconProps) {
  const source = size <= 32
    ? "/brand/replysis-icon-64.png"
    : size <= 64
      ? "/brand/replysis-icon-128.png"
      : "/brand/replysis-icon-256.png";

  return (
    <img
      src={source}
      alt={alt}
      width={size}
      height={size}
      draggable={false}
      aria-hidden={alt ? undefined : true}
      className={`block shrink-0 select-none rounded-full object-cover ring-1 ring-emerald-300/20 shadow-[0_3px_10px_rgba(33,146,74,0.2)] ${className}`}
      style={{ width: size, height: size }}
    />
  );
}
