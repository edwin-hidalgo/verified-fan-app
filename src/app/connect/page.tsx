export default function ConnectPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-black px-4 py-12">
      <main className="w-full max-w-lg flex flex-col items-center justify-center gap-8 text-center">
        <div className="space-y-4">
          <h1 className="text-4xl md:text-5xl font-bold text-white tracking-tight">
            Connect your music.
          </h1>
          <p className="text-xl text-gray-300">
            We'll see your top artists, saved tracks, and recent listening.
          </p>
        </div>

        <div className="bg-gray-900/50 border border-gray-800 rounded-lg p-6 max-w-sm space-y-3">
          <p className="text-gray-300 leading-relaxed">
            <span className="font-semibold">We never see your password</span> or post anything to your account. Your verified fan identity is only visible to artists you follow.
          </p>
          <div className="text-sm text-gray-400 space-y-1">
            <p>✓ Your top artists & tracks</p>
            <p>✓ Saved tracks</p>
            <p>✓ Recent listening</p>
          </div>
        </div>

        <a
          href="/api/spotify/auth"
          className="w-full sm:w-auto px-8 py-4 bg-[#1DB954] text-white font-semibold rounded-full hover:bg-[#1ed760] transition-colors duration-200 text-center inline-block"
        >
          Connect Spotify
        </a>

        <p className="text-sm text-gray-500 max-w-sm">
          You'll be redirected to Spotify to authorize access. No account creation needed.
        </p>
      </main>
    </div>
  )
}
