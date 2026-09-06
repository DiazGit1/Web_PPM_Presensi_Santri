import useSWR from "swr";
import { useState, useMemo } from "react";
import { Card, Field, Input, Select, Button, FilterBar } from "@/components/ui/Basics";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { MatrixCell } from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import type { AttendanceStatus } from "@/types/domain";
import api from "@/lib/axios";

function getPastDate(days: number) {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(d);
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

  const [fromDate, setFromDate] = useState(getPastDate(7));
  const [toDate, setToDate] = useState(getPastDate(0));
  const [appliedQuery, setAppliedQuery] = useState({ from: getPastDate(7), to: getPastDate(0) });

  const { data, isLoading, mutate } = useSWR(
    `/attendance?from=${appliedQuery.from}&to=${appliedQuery.to}`
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

  const groupedClasses = useMemo(() => {
    if (!data?.ok || !data.rows) return [];
    
    let filteredRows = data.rows;
    if (searchName) {
      filteredRows = filteredRows.filter((r: any) => r.name.toLowerCase().includes(searchName.toLowerCase()));
    }
    if (filterGender) {
      filteredRows = filteredRows.filter((r: any) => r.gender === filterGender);
    }
    if (filterClass) {
      filteredRows = filteredRows.filter((r: any) => r.className === filterClass);
    }

    const classGroups = new Map<string, any[]>();
    for (const row of filteredRows) {
      const className = row.className || "Tanpa Kelas";
      if (!classGroups.has(className)) classGroups.set(className, []);
      classGroups.get(className)!.push(row);
    }
    
    const CLASS_ORDER: Record<string, number> = {
      "Bacaan": 1,
      "Lambatan": 2,
      "Cepatan": 3,
      "HB": 4
    };
    
    return Array.from(classGroups.entries()).sort((a, b) => {
      const orderA = CLASS_ORDER[a[0]] || 99;
      const orderB = CLASS_ORDER[b[0]] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a[0].localeCompare(b[0]);
    });
  }, [data, searchName, filterGender, filterClass]);

  const daySpans = useMemo(() => {
    if (!data?.sessions) return [];
    return groupDaySpans(data.sessions);
  }, [data]);

  function applyFilter() {
    setAppliedQuery({ from: fromDate, to: toDate });
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
          Riwayat Detail Presensi
        </h1>
      </div>

      <Card className="bg-gray-50 p-5 shadow-sm border border-gray-200">
        <h3 className="font-bold text-gray-700 mb-4">Filter Data</h3>
        
        <div className="grid grid-cols-1 gap-3 md:grid-cols-6 items-end">
          <Field label="Dari Tanggal">
            <Input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} />
          </Field>
          
          <Field label="Sampai Tanggal">
            <Input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} />
          </Field>

          <Field label="Cari Nama">
            <Input
              type="text"
              placeholder="Ketik nama santri..."
              value={searchName}
              onChange={(e) => setSearchName(e.target.value)}
            />
          </Field>

          <Field label="Pilih Gender">
            <Select value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
              <option value="">Semua Gender</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </Select>
          </Field>

          <Field label="Pilih Kelas">
            <Select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="">Semua Kelas</option>
              {(ref?.classes ?? []).map((c: any) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>

          <Button variant="gold" onClick={applyFilter}>
            Terapkan
          </Button>
        </div>

        <p className="mt-1 text-center text-xs text-gray-500">
          * Filter nama, gender, dan kelas akan langsung diterapkan tanpa memuat ulang (klik huruf status H/A/I/S/T pada tabel untuk mengubah status).
        </p>
      </Card>

      {isLoading && <LoadingState />}
      {data && !data.ok && <ErrorState message="Gagal memuat data presensi." />}

      <div className="flex flex-col gap-6">
        {data?.ok && groupedClasses.map(([className, classRows]) => (
          <Card key={className} className="overflow-hidden">
            <div className="bg-ppm-green-dark px-5 py-3 text-white">
              <h3 className="font-display text-lg font-bold">{className}</h3>
            </div>
            
            <div className="scroll-thin overflow-x-auto">
              <table className="w-full text-center text-sm border-collapse">
                <thead className="bg-ppm-green text-white">
                  <tr>
                    <th rowSpan={2} className="px-4 py-2 font-semibold text-left border border-ppm-green-dark min-w-[200px]">
                      Nama
                    </th>
                    {daySpans.map((span, i) => (
                      <th key={i} colSpan={span.count} className="px-2 py-1 font-bold border border-ppm-green-dark">
                        {span.day}
                      </th>
                    ))}
                  </tr>
                  <tr>
                    {data.sessions.map((session: any) => (
                      <th key={session.sessionId} title={session.label} className="px-2 py-1 font-medium border border-ppm-green-dark min-w-[32px]">
                        {session.label.charAt(0)}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {classRows.map((row: any) => (
                    <tr key={row.studentId} className="border-b border-gray-200 hover:bg-gray-50">
                      <td className="px-4 py-2 font-medium text-gray-800 text-left border-r border-gray-200 truncate max-w-[200px]">
                        {row.name}
                      </td>
                      {data.sessions.map((session: any) => {
                        const cell = row.cells[session.sessionId];
                        const status = cell ? cell.status : null;
                        
                        let letter = ".";
                        let colorClass = "text-gray-300";
                        if (status === "hadir") { letter = "H"; colorClass = "text-green-600 font-bold"; }
                        else if (status === "izin") { letter = "I"; colorClass = "text-yellow-600 font-bold"; }
                        else if (status === "sakit") { letter = "S"; colorClass = "text-blue-600 font-bold"; }
                        else if (status === "alpa") { letter = "A"; colorClass = "text-red-600 font-bold"; }
                        else if (status === "terlambat") { letter = "T"; colorClass = "text-orange-500 font-bold"; }
                        
                        return (
                          <td 
                            key={session.sessionId} 
                            className={`border-r border-gray-200 p-0 text-center align-middle ${cell ? 'cursor-pointer hover:bg-gray-200 transition-colors' : ''}`}
                            onClick={() => {
                              if (cell) {
                                setEditTarget({
                                  sessionId: session.sessionId,
                                  studentId: row.studentId,
                                  studentName: row.name,
                                  label: `${session.date.split("-").reverse().join("/")} - ${session.label}`
                                });
                              }
                            }}
                          >
                            <span className={colorClass}>{letter}</span>
                          </td>
                        );
                      })}
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
