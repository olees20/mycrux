import Link from "next/link";

export default function AuthLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <main className="grid min-h-screen place-items-center p-5">
      <div className="w-full max-w-md">
        <Link className="mb-8 block text-center text-xl font-black" href="/">CRUX</Link>
        {children}
      </div>
    </main>
  );
}
