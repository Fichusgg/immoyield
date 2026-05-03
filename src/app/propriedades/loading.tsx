export default function PropriedadesLoading() {
  return (
    <div className="flex h-screen flex-col bg-[#F8F7F4]">
      {/* Top nav placeholder */}
      <div className="flex h-12 shrink-0 items-center border-b border-[#E2E0DA] bg-[#FAFAF8] px-6">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center bg-[#4A7C59] font-mono text-xs font-black text-white">
            I
          </div>
          <span className="text-sm font-bold tracking-tight text-[#1C2B20]">ImmoYield</span>
        </div>
      </div>

      <div className="flex min-h-0 flex-1">
        {/* Sidebar placeholder */}
        <aside className="flex w-64 shrink-0 flex-col gap-2 border-r border-[#E2E0DA] bg-[#FAFAF8] p-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-[88px] animate-pulse border border-[#E2E0DA] bg-[#F0EFEB]"
            />
          ))}
        </aside>

        {/* Main placeholder */}
        <main className="flex-1 overflow-y-auto p-8">
          <div className="mb-4">
            <div className="h-6 w-40 animate-pulse bg-[#E2E0DA]" />
            <div className="mt-2 h-4 w-72 animate-pulse bg-[#E2E0DA]" />
          </div>
          <div className="mb-5 grid grid-cols-3 gap-px border border-[#E2E0DA] bg-[#E2E0DA]">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-[68px] animate-pulse bg-[#FAFAF8]" />
            ))}
          </div>
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="h-[88px] animate-pulse border border-[#E2E0DA] bg-[#FAFAF8]"
              />
            ))}
          </div>
        </main>
      </div>
    </div>
  );
}
