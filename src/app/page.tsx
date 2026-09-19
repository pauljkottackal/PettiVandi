import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col">
      {/* Header */}
      <header style={{ backgroundColor: 'var(--color-green)' }} className="px-6 py-8 text-white">
        <div className="max-w-2xl mx-auto">
          <div className="flex items-baseline gap-3">
            <h1 className="text-3xl font-bold tracking-tight">PettiVandi</h1>
            <span className="text-sm font-medium opacity-70">by KSRTC</span>
          </div>
          <p className="mt-1 text-base opacity-80">Digital parcel booking &amp; tracking on state buses</p>
        </div>
      </header>

      {/* Role selector */}
      <div className="flex-1 flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-2xl">
          <p className="text-sm font-medium uppercase tracking-widest mb-8" style={{ color: 'var(--color-muted)' }}>
            Select your role to continue
          </p>

          <div className="flex flex-col gap-4">
            <Link href="/depot" className="group block w-full rounded-none border-2 px-8 py-6 transition-all hover:scale-[1.01]" style={{ backgroundColor: 'var(--color-green)', borderColor: 'var(--color-green)', color: 'white' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📦</span>
                    <span className="text-xl font-semibold">Depot Clerk</span>
                  </div>
                  <p className="mt-1 text-sm opacity-75 ml-9">Book parcels, generate waybills, manage loading</p>
                </div>
                <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">→</span>
              </div>
            </Link>

            <Link href="/conductor" className="group block w-full rounded-none border-2 px-8 py-6 transition-all hover:scale-[1.01]" style={{ backgroundColor: 'var(--color-text)', borderColor: 'var(--color-text)', color: 'white' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">🚌</span>
                    <span className="text-xl font-semibold">Conductor</span>
                  </div>
                  <p className="mt-1 text-sm opacity-75 ml-9">Scan QR codes, confirm loading and delivery</p>
                </div>
                <span className="text-2xl opacity-50 group-hover:opacity-100 transition-opacity">→</span>
              </div>
            </Link>

            <Link href="/track" className="group block w-full rounded-none border-2 px-8 py-6 transition-all hover:scale-[1.01]" style={{ backgroundColor: 'var(--color-white)', borderColor: 'var(--color-muted)', color: 'var(--color-text)' }}>
              <div className="flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">📍</span>
                    <span className="text-xl font-semibold">Track a Parcel</span>
                  </div>
                  <p className="mt-1 text-sm ml-9" style={{ color: 'var(--color-muted)' }}>Enter a waybill ID to see live status</p>
                </div>
                <span className="text-2xl transition-opacity" style={{ color: 'var(--color-muted)' }}>→</span>
              </div>
            </Link>
          </div>

          <p className="mt-10 text-xs text-center" style={{ color: 'var(--color-muted)' }}>
            Kerala State Road Transport Corporation · Parcel Service MVP
          </p>
        </div>
      </div>
    </main>
  )
}
