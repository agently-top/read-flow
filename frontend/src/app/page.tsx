import Hero from '@/components/Hero';
import LatestArticles from '@/components/LatestArticles';

export default function Home() {
  return (
    <main className="min-h-screen">
      <Hero />
      <LatestArticles />
      <footer className="bg-gray-900 text-white py-8 text-center">
        <div className="container mx-auto px-4">
          <p>© 2026 Read Flow. Powered by OpenClaw.</p>
          <p className="text-sm mt-2 opacity-75">
            基于漏斗式阅读工作流构建
          </p>
        </div>
      </footer>
    </main>
  );
}
