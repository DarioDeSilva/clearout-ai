import Link from "next/link";

export default function LandingPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-white px-4 text-center">
      <h1 className="text-4xl font-bold text-gray-900 sm:text-5xl">Clearout AI</h1>
      <p className="max-w-xl text-lg text-gray-600">
        Upload a photo of anything you&apos;re getting rid of. AI writes the listing for you.
      </p>

      <div className="flex gap-3">
        <Link
          href="/signup"
          className="rounded-lg bg-blue-600 px-6 py-2 font-semibold text-white transition-colors hover:bg-blue-700"
        >
          Sign up
        </Link>
        <Link
          href="/login"
          className="rounded-lg border border-gray-300 px-6 py-2 font-semibold text-gray-700 transition-colors hover:bg-gray-50"
        >
          Log in
        </Link>
      </div>
    </main>
  );
}
