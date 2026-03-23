import Hero from '@/components/Hero';
import LatestArticles from '@/components/LatestArticles';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <header className="border-b border-gray-200">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-gray-900">Read Flow</h1>
            <nav className="flex gap-6 text-sm">
              <a href="/list" className="text-gray-600 hover:text-gray-900">
                信息流
              </a>
            </nav>
          </div>
        </div>
      </header>
      <Hero />
      <LatestArticles />
      <footer className="border-t border-gray-200 py-8">
        <div className="container mx-auto px-4 text-center text-sm text-gray-500">
          <p>© 2026 Read Flow</p>
        </div>
      </footer>
    </main>
  );
}
