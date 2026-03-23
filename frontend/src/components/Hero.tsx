export default function Hero() {
  return (
    <section className="bg-gradient-to-r from-blue-600 to-purple-600 text-white py-20">
      <div className="container mx-auto px-4 text-center">
        <h1 className="text-5xl font-bold mb-4">Read Flow</h1>
        <p className="text-xl mb-8 opacity-90">
          汇流万象，智能提纯，沉淀真知
        </p>
        <div className="flex justify-center gap-4 flex-wrap">
          <a
            href="/list"
            className="bg-white text-blue-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition"
          >
            浏览内容
          </a>
          <a
            href="https://github.com/agently-top/read-flow"
            target="_blank"
            rel="noopener noreferrer"
            className="border-2 border-white px-8 py-3 rounded-lg font-semibold hover:bg-white hover:text-blue-600 transition"
          >
            了解更多
          </a>
        </div>
      </div>
    </section>
  );
}
