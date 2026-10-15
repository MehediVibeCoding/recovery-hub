// Vangcur Gadgets-এর লোগো — Mehediadmin-এর লগইন পেজের মতোই (public/vangcur-logo.png)।
interface Props {
  className?: string;
  priority?: boolean;
}

export function BrandLogo({ className = "", priority = false }: Props) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/vangcur-logo.png"
      alt="Vangcur Gadgets"
      width={560}
      height={197}
      draggable={false}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      className={`block select-none ${className}`}
    />
  );
}
