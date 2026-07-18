import { MarketingHeader } from "@/components/marketing-header";
import { SkipLink } from "@/components/skip-link";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><SkipLink /><MarketingHeader /><main id="main-content" tabIndex={-1}>{children}</main></>;
}
