export function SkipLink({ target = "main-content" }: { target?: string }) {
  return <a className="skip-link" href={`#${target}`}>Skip to main content</a>;
}
