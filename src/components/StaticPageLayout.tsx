import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import BrandMark from "@/components/BrandMark";
import Footer from "@/components/Footer";

export default function StaticPageLayout({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col min-h-screen">
      <header className="sticky top-0 z-50 bg-white border-b border-soft-grey px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 text-charcoal hover:text-olive transition-colors">
          <ArrowLeft size={20} />
          <span className="font-medium text-sm">Back to catalog</span>
        </Link>
        <BrandMark compact href="/" />
        <div className="w-24" />
      </header>

      <main className="flex-1 max-w-2xl w-full mx-auto px-4 md:px-6 py-12">
        <h1 className="font-serif text-3xl font-semibold mb-8">{title}</h1>
        <div className="prose-content space-y-6 text-sm leading-relaxed text-charcoal/80">
          {children}
        </div>
      </main>

      <Footer />
    </div>
  );
}
