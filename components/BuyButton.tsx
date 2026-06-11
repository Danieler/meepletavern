import { BrandIcon } from "@/components/BrandIcon";

type BuyButtonProps = {
  url: string | null;
};

export function BuyButton({ url }: BuyButtonProps) {
  if (!url) {
    return null;
  }

  return (
    <a className="button-primary" href={url} rel="nofollow sponsored noopener noreferrer" target="_blank">
      <BrandIcon name="tag" size={20} />
      Ver oferta
    </a>
  );
}
