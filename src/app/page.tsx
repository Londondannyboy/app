export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <div className="text-center">
        <h1 className="text-4xl font-bold mb-4 bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
          Quest App
        </h1>
        <p className="text-gray-400 mb-8">
          AI-powered relocation assistant with voice and text chat
        </p>
        <div className="flex gap-4 justify-center">
          <a
            href="/voice"
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg hover:opacity-90 transition"
          >
            Start Voice Chat
          </a>
          <a
            href="/chat"
            className="px-6 py-3 border border-purple-500 rounded-lg hover:bg-purple-500/10 transition"
          >
            Text Chat
          </a>
        </div>
      </div>
    </main>
  )
}
