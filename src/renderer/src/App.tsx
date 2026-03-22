function App(): JSX.Element {
  return (
    <div className="flex h-screen">
      <aside className="w-60 bg-witcher-surface border-r border-witcher-border flex flex-col">
        <div className="p-4 text-witcher-gold font-bold text-lg">W3 Mod Manager</div>
      </aside>
      <main className="flex-1 bg-witcher-bg p-6">
        <h1 className="text-2xl text-witcher-text">Welcome</h1>
      </main>
    </div>
  )
}

export default App
