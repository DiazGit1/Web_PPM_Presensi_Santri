import useSWR from "swr";
import { useState, useMemo } from "react";
import { Card, Field, Input, Select, Button, FilterBar } from "@/components/ui/Basics";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { MatrixCell } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import type { AttendanceStatus } from "@/types/domain";
import api from "@/lib/axios";

function todayWIBString() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}

function daysAgoWIBString(days: number) {
  const now = new Date();
  now.setDate(now.getDate() - days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
}

const STATUS_OPTIONS: { value: AttendanceStatus; label: string }[] = [
  { value: "hadir", label: "Hadir" },
  { value: "terlambat", label: "Terlambat" },
  { value: "izin", label: "Izin" },
  { value: "sakit", label: "Sakit" },
  { value: "alpa", label: "Alpa" },
];

export function AttendanceContent() {
  const { showToast } = useToast();
  const { data: ref } = useSWR("/reference");

  const [groupId, setGroupId] = useState("");
  const [appliedQuery, setAppliedQuery] = useState({ groupId: "" });

  const { data, isLoading, mutate } = useSWR(
    `/attendance?latest=true&groupId=${appliedQuery.groupId}`
  );

  const [editTarget, setEditTarget] = useState<{
    sessionId: string;
    studentId: string;
    studentName: string;
    label: string;
  } | null>(null);
  const [savingStatus, setSavingStatus] = useState(false);

  // Local table filters
  const [searchName, setSearchName] = useState("");
  const [filterGender, setFilterGender] = useState("");
  const [filterClass, setFilterClass] = useState("");
  const [filterStatus, setFilterStatus] = useState("");

  const flatData = useMemo(() => {
    if (!data?.ok || !data.rows || !data.sessions) return [];
    const list: any[] = [];
    for (const row of data.rows) {
      for (const session of data.sessions) {
        const cellData = row.cells[session.sessionId];
        if (cellData) {
          list.push({
            studentId: row.studentId,
            name: row.name,
            gender: row.gender,
            className: row.className,
            sessionId: session.sessionId,
            sessionDate: session.date,
            sessionType: session.type,
            label: session.label,
            status: cellData.status,
            time: cellData.time,
          });
        }
      }
    }
    list.sort((a, b) => {
      if (a.sessionDate !== b.sessionDate) return b.sessionDate.localeCompare(a.sessionDate);
      return a.name.localeCompare(b.name);
    });
    return list;
  }, [data]);

  const filteredFlatData = useMemo(() => {
    return flatData.filter((item) => {
      if (searchName && !item.name.toLowerCase().includes(searchName.toLowerCase())) return false;
      if (filterGender && item.gender !== filterGender) return false;
      if (filterClass && item.className !== filterClass) return false;
      if (filterStatus && item.status !== filterStatus) return false;
      return true;
    });
  }, [flatData, searchName, filterGender, filterClass, filterStatus]);

  const groupedData = useMemo(() => {
    const groups = new Map<string, typeof filteredFlatData>();
    for (const item of filteredFlatData) {
      if (!groups.has(item.sessionId)) groups.set(item.sessionId, []);
      groups.get(item.sessionId)!.push(item);
    }
    return Array.from(groups.entries()).map(([sessionId, items]) => ({
      sessionId,
      sessionDate: items[0].sessionDate,
      label: items[0].label,
      items,
    }));
  }, [filteredFlatData]);

  function applyFilter() {
    setAppliedQuery({ groupId });
  }

  async function handleChangeStatus(status: AttendanceStatus) {
    if (!editTarget) return;
    setSavingStatus(true);
    try {
      const { data: resData } = await api.post("/attendance/edit-status", {
        sessionId: editTarget.sessionId,
        studentId: editTarget.studentId,
        status,
      });
      if (!resData.ok) {
        showToast(resData.message ?? "Gagal memperbarui status.", "error");
        return;
      }
      showToast("Status presensi diperbarui.");
      setEditTarget(null);
      mutate();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? "Gagal terhubung ke server.", "error");
    } finally {
      setSavingStatus(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-ppm-gold-dark">Presensi</p>
        <h1 className="font-display text-2xl font-extrabold text-gray-800">
          Monitoring Sesi Terbaru
        </h1>
      </div>

      <FilterBar>
        <Field label="Pilih Kelas">
          <Select value={groupId} onChange={(e) => setGroupId(e.target.value)}>
            <option value="">Semua Kelas &amp; Gender</option>
            {(ref?.groups ?? []).map((g: any) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </Select>
        </Field>
        <Button variant="gold" onClick={applyFilter}>
          Terapkan
        </Button>
      </FilterBar>

      {isLoading && <LoadingState />}
      {data && !data.ok && <ErrorState message="Gagal memuat data presensi." />}
      {data?.ok && flatData.length === 0 && (
        <EmptyState title="Tidak ada data presensi pada rentang tanggal ini" />
      )}

      {data?.ok && flatData.length > 0 && (
        <Card className="bg-gray-50 p-4 shadow-sm border border-gray-200">
          <p className="mb-3 text-xs font-bold uppercase tracking-wider text-gray-500">
            Saring Hasil Tabel (Lokal)
          </p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <input
              type="text"
              placeholder="Cari nama..."
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-ppm-green focus:outline-none focus:ring-1 focus:ring-ppm-green"
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
            <select
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-ppm-green focus:outline-none focus:ring-1 focus:ring-ppm-green"
              value={filterGender}
              onChange={(e) => setFilterGender(e.target.value)}
            >
              <option value="">Semua Gender</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </select>
            <select
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-ppm-green focus:outline-none focus:ring-1 focus:ring-ppm-green"
              value={filterClass}
              onChange={(e) => setFilterClass(e.target.value)}
            >
              <option value="">Semua Kelas</option>
              {(ref?.classes ?? []).map((c: any) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
            <select
              className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-ppm-green focus:outline-none focus:ring-1 focus:ring-ppm-green"
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
            >
              <option value="">Semua Status</option>
              <option value="hadir">Hadir</option>
              <option value="terlambat">Terlambat</option>
              <option value="izin">Izin</option>
              <option value="sakit">Sakit</option>
              <option value="alpa">Alpa</option>
            </select>
          </div>
        </Card>
      )}

      {data?.ok && flatData.length > 0 && groupedData.length === 0 && (
        <EmptyState title="Tidak ada data presensi yang sesuai dengan filter" />
      )}

      <div className="flex flex-col gap-6">
        {data?.ok && groupedData.map((group) => (
          <Card key={group.sessionId} className="overflow-hidden">
            <div className="bg-ppm-green-dark px-5 py-3 text-white">
              <h3 className="font-display text-lg font-bold">
                {group.sessionDate.split("-").reverse().join("/")} &middot; {group.label}
              </h3>
            </div>
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full min-w-[720px] text-left text-sm">
                <thead className="bg-ppm-green text-white">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Nama Santri</th>
                    <th className="px-4 py-3 font-semibold">Gender</th>
                    <th className="px-4 py-3 font-semibold">Kelas</th>
                    <th className="px-4 py-3 text-center font-semibold">Status</th>
                    <th className="px-4 py-3 text-center font-semibold">Waktu</th>
                    <th className="px-4 py-3 text-right font-semibold">Aksi</th>
                  </tr>
                </thead>
                <tbody>
                  {group.items.map((item) => (
                    <tr
                      key={item.studentId}
                      className="border-t border-ppm-border hover:bg-ppm-cream/40"
                    >
                      <td className="px-4 py-2 font-medium text-gray-700">{item.name}</td>
                      <td className="px-4 py-2 text-gray-600">
                        {item.gender === "L" ? "Laki-laki" : "Perempuan"}
                      </td>
                      <td className="px-4 py-2 text-gray-600">{item.className}</td>
                      <td className="px-4 py-2 text-center">
                        <MatrixCell code={item.status} />
                      </td>
                      <td className="px-4 py-2 text-center text-gray-500">
                        {item.time !== "-" ? item.time : "-"}
                      </td>
                      <td className="px-4 py-2 text-right">
                        <button
                          onClick={() =>
                            setEditTarget({
                              sessionId: item.sessionId,
                              studentId: item.studentId,
                              studentName: item.name,
                              label: `${item.sessionDate.split("-").reverse().join("/")} - ${item.label}`,
                            })
                          }
                          className="text-sm font-semibold text-ppm-green hover:underline"
                        >
                          Ubah
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        ))}
      </div>

      {editTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="font-display text-lg font-bold text-gray-800">Ubah Status Presensi</h3>
            <p className="mt-1 text-sm text-gray-500">
              {editTarget.studentName} &middot; {editTarget.label}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-2">
              {STATUS_OPTIONS.map((opt) => (
                <Button
                  key={opt.value}
                  variant="outline"
                  disabled={savingStatus}
                  onClick={() => handleChangeStatus(opt.value)}
                >
                  {opt.label}
                </Button>
              ))}
            </div>
            <div className="mt-4 text-right">
              <Button variant="ghost" onClick={() => setEditTarget(null)}>
                Batal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function groupDaySpans(sessions: any[]): Array<{ date: string; day: string; count: number }> {
  const spans: Array<{ date: string; day: string; count: number }> = [];
  for (const s of sessions) {
    const day = String(parseInt(s.date.split("-")[2], 10));
    const last = spans[spans.length - 1];
    if (last && last.date === s.date) {
      last.count += 1;
    } else {
      spans.push({ date: s.date, day, count: 1 });
    }
  }
  return spans;
}
