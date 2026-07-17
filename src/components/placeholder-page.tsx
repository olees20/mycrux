export function PlaceholderPage({ eyebrow, title, description }: { eyebrow: string; title: string; description: string }) {
  return (
    <div className="mx-auto max-w-4xl">
      <p className="text-sm font-bold uppercase tracking-[0.2em] text-[var(--muted)]">{eyebrow}</p>
      <h1 className="mt-3 text-4xl font-black tracking-tight md:text-6xl">{title}</h1>
      <p className="mt-5 max-w-2xl text-lg leading-8 text-[var(--muted)]">{description}</p>
    </div>
  );
}
