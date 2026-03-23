export default function TitleBar(): JSX.Element {
  return (
    <div
      className="flex items-center justify-between bg-witcher-surface/80 backdrop-blur-sm h-10 px-4 select-none"
      style={{ WebkitAppRegion: 'drag' } as React.CSSProperties}
    >
      <div className="flex items-center gap-2.5">
        <span className="text-witcher-gold text-base leading-none">&#x2694;</span>
        <span className="text-witcher-gold font-semibold text-sm tracking-wide">
          W3 Mod Manager
        </span>
      </div>
      <div className="flex" style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}>
        <button
          className="w-11 h-10 flex items-center justify-center text-witcher-text-muted/60 hover:bg-white/5 hover:text-witcher-text transition-colors-smooth text-xs"
          onClick={() => window.api.windowMinimize()}
          aria-label="Minimize"
        >
          &#x2500;
        </button>
        <button
          className="w-11 h-10 flex items-center justify-center text-witcher-text-muted/60 hover:bg-white/5 hover:text-witcher-text transition-colors-smooth text-xs"
          onClick={() => window.api.windowMaximize()}
          aria-label="Maximize"
        >
          &#x25A1;
        </button>
        <button
          className="w-11 h-10 flex items-center justify-center text-witcher-text-muted/60 hover:bg-red-500/20 hover:text-red-400 transition-colors-smooth text-xs"
          onClick={() => window.api.windowClose()}
          aria-label="Close"
        >
          &#x2715;
        </button>
      </div>
    </div>
  )
}
