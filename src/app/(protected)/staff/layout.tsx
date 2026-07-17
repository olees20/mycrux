import Link from "next/link";
export default function StaffLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <><header className="flex items-center justify-between border-b border-[var(--border)] bg-white px-5 py-4"><Link className="font-black" href="/staff">CRUX / STAFF</Link><Link className="text-sm font-bold" href="/app">Member view</Link></header><main className="p-5 md:p-10">{children}</main></>;
}
