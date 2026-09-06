import useSWR from "swr";
import { Card } from "@/components/ui/Basics";
import { LoadingState, ErrorState } from "@/components/ui/States";

const STAT_LABELS: Array<{ key: "hadir" | "terlambat" | "izin" | "sakit" | "alpa"; label: string; color: string }> = [
  { key: "hadir", label: "Hadir", color: "text-[var(--status-hadir)]" },
  { key: "terlambat", label: "Terlambat", color: "text-[var(--status-terlambat)]" },
  { key: "izin", label: "Izin", color: "text-[var(--status-izin)]" },
  { key: "sakit", label: "Sakit", color: "text-[var(--status-sakit)]" },
  { key: "alpa", label: "Alpa", color: "text-[var(--status-alpa)]" },
];

export function DashboardContent() {
  const { data, error, isLoading } = useSWR("/dashboard/stats", undefined, {
    refreshInterval: 30000,
  });

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-ppm-gold-dark">Beranda</p>
        <h1 className="font-display text-2xl font-extrabold text-gray-800">Dashboard</h1>
      </div>

      {isLoading && <LoadingState />}
      {error && <ErrorState message="Gagal memuat statistik. Periksa koneksi internet dan coba lagi." />}

      {data && data.ok && (
        <>
          {data.activeSessionLabel ? (
            <Card className="border-ppm-green bg-ppm-green/5 p-4">
              <p className="font-semibold text-ppm-green-dark">{data.activeSessionLabel}</p>
            </Card>
          ) : (
            <Card className="p-4">
              <p className="text-sm text-gray-500">Tidak ada sesi presensi yang sedang berlangsung saat ini.</p>
            </Card>
          )}

          <div>
            <h2 className="mb-3 font-display text-lg font-bold text-gray-700">
              Statistik Hari Ini (Keseluruhan)
            </h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
              {STAT_LABELS.map((s) => (
                <Card key={s.key} className="flex flex-col items-center gap-1 p-5">
                  <p className={`font-display text-3xl font-extrabold ${s.color}`}>
                    {data.stats?.[s.key] ?? 0}
                  </p>
                  <p className="text-sm font-semibold text-gray-500">{s.label}</p>
                </Card>
              ))}
            </div>
          </div>
          
          {data.statsByClass && Object.entries(data.statsByClass).length > 0 && (
            <div className="mt-4">
              <h2 className="mb-3 font-display text-lg font-bold text-gray-700">
                Statistik Per Kelas
              </h2>
              <div className="flex flex-col gap-4">
                {Object.entries(data.statsByClass).map(([className, classStats]: [string, any]) => (
                  <Card key={className} className="p-4 border border-gray-100">
                    <h3 className="mb-3 font-display font-bold text-gray-700 text-lg border-b border-gray-100 pb-2">
                      {className}
                    </h3>
                    <div className="grid grid-cols-5 gap-2">
                      {STAT_LABELS.map((s) => (
                        <div key={s.key} className="flex flex-col items-center text-center">
                          <p className={`font-display text-xl font-bold ${s.color}`}>
                            {classStats?.[s.key] ?? 0}
                          </p>
                          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">{s.label}</p>
                        </div>
                      ))}
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
