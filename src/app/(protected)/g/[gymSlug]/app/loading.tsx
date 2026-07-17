export default function GymHomeLoading() {
  return <div aria-label="Loading gym home" className="mx-auto max-w-7xl animate-pulse"><div className="h-64 rounded-3xl bg-black/10" /><div className="mt-6 grid gap-6 lg:grid-cols-3"><div className="space-y-6 lg:col-span-2">{[1,2,3].map((item) => <div className="h-56 rounded-2xl bg-black/10" key={item} />)}</div><div className="space-y-6">{[1,2,3].map((item) => <div className="h-40 rounded-2xl bg-black/10" key={item} />)}</div></div></div>;
}
