export default function Hero() {
  return (
    <section className="py-16 bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="max-w-3xl">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">Read Flow</h1>
          <p className="text-lg text-gray-600 mb-8">
            汇流万象，智能提纯，沉淀真知。
          </p>
          <div className="flex gap-3">
            <a
              href="/list"
              className="bg-gray-900 text-white px-5 py-2.5 rounded-md font-medium hover:bg-gray-800 transition text-sm"
            >
              浏览内容
            </a>
            <a
              href="https://github.com/agently-top/read-flow"
              target="_blank"
              rel="noopener noreferrer"
              className="border border-gray-300 text-gray-700 px-5 py-2.5 rounded-md font-medium hover:bg-gray-50 transition text-sm"
            >
              了解更多
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
