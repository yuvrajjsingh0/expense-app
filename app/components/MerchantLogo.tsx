import { useState } from "react";
import { brandIconUrl, initial } from "../format";

interface MerchantLogoProps {
  brand?: string;
  merchant?: string;
}

/**
 * A small merchant avatar. Tries a Simple Icons logo keyed on the brand, per the
 * project rule of never committing logo files, and falls back to a coloured
 * initial when there is no slug or the image fails to load.
 */
export function MerchantLogo({ brand, merchant }: MerchantLogoProps) {
  const [failed, setFailed] = useState(false);
  const url = brandIconUrl(brand);
  const label = brand ?? merchant;

  if (url && !failed) {
    return (
      <span className="logo">
        <img
          src={url}
          alt={label ?? "merchant"}
          width={20}
          height={20}
          onError={() => setFailed(true)}
        />
      </span>
    );
  }
  return <span className="logo logo-fallback">{initial(label)}</span>;
}
