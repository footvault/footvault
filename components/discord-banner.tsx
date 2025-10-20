export function DiscordBanner() {
  return (
    <div className="w-full bg-[#5865F2] text-white py-2">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
        <p className="text-sm font-medium">
          🎉 Get free premium account for free in Discord! 
          <a 
            href="https://discord.gg/Rh4xmpDBEZ" 
            target="_blank" 
            rel="noopener noreferrer"
            className="ml-2 underline hover:no-underline font-semibold"
          >
            Join now →
          </a>
        </p>
      </div>
    </div>
  );
}