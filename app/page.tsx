import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-4 px-4 text-center">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
        Student Housing Archive
      </h1>
      <p className="text-muted-foreground">
        Coming soon — we&apos;re building something for Mutare students.
      </p>
      <div className="flex items-center gap-3">
        <Button asChild>
          <Link href="#">Find Housing</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link href="#">List Your Property</Link>
        </Button>
      </div>
    </main>
  );
}
