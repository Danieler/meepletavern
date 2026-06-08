import { ExternalLink } from "lucide-react";

type BuyButtonProps = {
  url: string | null;
};

export function BuyButton({ url }: BuyButtonProps) {
  if (!url) {
    return null;
  }

  return (
    <a className="button-primary" href={url} rel="nofollow sponsored noopener noreferrer" target="_blank">
      <ExternalLink size={18} aria-hidden="true" />
      Ver oferta
    </a>
  );
}

