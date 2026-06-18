import Image from "next/image";

type UserAvatarProps = {
  src?: string | null;
  name: string;
  size?: "sm" | "md" | "lg" | "xl";
  className?: string;
};

const sizeClasses = {
  sm: "h-12 w-12 text-base",
  md: "h-16 w-16 text-xl",
  lg: "h-24 w-24 text-3xl",
  xl: "h-32 w-32 text-5xl"
};

export function UserAvatar({ src, name, size = "md", className = "" }: UserAvatarProps) {
  const label = name.trim() || "Usuario";
  const isPreviewUrl = src?.startsWith("blob:") || src?.startsWith("data:");

  return (
    <div
      className={`relative flex shrink-0 items-center justify-center overflow-hidden rounded-md border border-walnut/15 bg-paper shadow-sm ${sizeClasses[size]} ${className}`}
    >
      {src && isPreviewUrl ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={src} alt={label} className="h-full w-full object-cover" />
      ) : src ? (
        <Image src={src} alt={label} fill sizes="160px" className="object-cover" />
      ) : (
        <span className="font-display font-bold uppercase leading-none text-walnut/35">
          {label[0]?.toUpperCase() || "U"}
        </span>
      )}
    </div>
  );
}
