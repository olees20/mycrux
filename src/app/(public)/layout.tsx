import { MarketingHeader } from "@/components/marketing-header";

export default function PublicLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><MarketingHeader /><main>{children}</main></>;
}
