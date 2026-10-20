import Link from "next/link";

export default function NotFound() {
  return (
    <main id="main" className="section container-page flex flex-1 flex-col items-center justify-center gap-5 text-center">
      <p className="eyebrow text-muted">404</p>
      <h1 className="heading-display">Page not found</h1>
      <p className="max-w-prose text-muted">The page you are looking for has moved or no longer exists.</p>
      <Link href="/" className="btn btn-primary mt-2">
        Return home
      </Link>
    </main>
  );
}
