import useSWR from "swr";
import { useState, useMemo } from "react";
import { Card, Field, Input, Select, Button, FilterBar } from "@/components/ui/Basics";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import api from "@/lib/axios";

function todayWIBString() {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(new Date());
}
function daysAgoWIBString(days: number) {
  const now = new Date();
  now.setDate(now.getDate() - days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" }).format(now);
}

const COUNT_BADGE: Record<string, string> = {
  hadir: "bg-[var(--status-hadir)]",
  terlambat: "bg-[var(--status-terlambat)]",
  izin: "bg-[var(--status-izin)]",
  sakit: "bg-[var(--status-sakit)]",
  alpa: "bg-[var(--status-alpa)]",
};

import { MatrixCell } from "@/components/ui/StatusBadge";
import * as XLSX from "xlsx";

export function RecapContent() {
  const { data: ref } = useSWR("/reference");

  const [from, setFrom] = useState(daysAgoWIBString(29));
  const [to, setTo] = useState(todayWIBString());
  const [groupId, setGroupId] = useState("");
  const [applied, setApplied] = useState({ from: daysAgoWIBString(29), to: todayWIBString(), groupId: "" });

  const { data: detailData, isLoading: isLoadingDetail } = useSWR(
    `/attendance?from=${applied.from}&to=${applied.to}&groupId=${applied.groupId}`
  );

  const summaryByStudent = useMemo(() => {
    if (!detailData?.ok || !detailData.rows) return [];
    
    return detailData.rows.map((row: any) => {
      let hadir = 0;
      let terlambat = 0;
      let izin = 0;
      let sakit = 0;
      let alpa = 0;
      let total = 0;

      for (const session of detailData.sessions) {
        const cell = row.cells[session.sessionId];
        if (cell) {
          total++;
          switch (cell.status) {
            case 'hadir': hadir++; break;
            case 'terlambat': terlambat++; break;
            case 'izin': izin++; break;
            case 'sakit': sakit++; break;
            case 'alpa': alpa++; break;
          }
        }
      }

      const percentage = total > 0 ? ((hadir + terlambat) / total) * 100 : 0;

      return {
        studentId: row.studentId,
        name: row.name,
        nis: row.nis,
        className: row.className,
        gender: row.gender,
        hadir,
        terlambat,
        izin,
        sakit,
        alpa,
        percentage
      };
    });
  }, [detailData]);

  // Remove flatData and groupedData entirely

  const [filterGender, setFilterGender] = useState("");
  const [filterClass, setFilterClass] = useState("");

  const filteredSummary = useMemo(() => {
    if (!summaryByStudent) return [];
    return summaryByStudent.filter(student => {
      if (filterGender && student.gender !== filterGender) return false;
      if (filterClass && student.className !== filterClass) return false;
      return true;
    });
  }, [summaryByStudent, filterGender, filterClass]);

  const groupedSummary = useMemo(() => {
    const classGroups = new Map<string, any[]>();
    for (const row of filteredSummary) {
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
  }, [filteredSummary]);

  // Remove applyFilterSesi

  function applyFilterSantri() {
    setApplied({ from, to, groupId: "" });
  }

  function handleExport() {
    if (!filteredSummary || filteredSummary.length === 0) {
      alert("Tidak ada data untuk di-export.");
      return;
    }

    const exportData = filteredSummary.map((r: any) => ({
      "Nama Santri": r.name,
      "NIS": r.nis,
      "Kelas": r.className,
      "Gender": r.gender === 'L' ? 'Laki-laki' : 'Perempuan',
      "Hadir": r.hadir,
      "Terlambat": r.terlambat,
      "Izin": r.izin,
      "Sakit": r.sakit,
      "Alpa": r.alpa,
      "Persentase (%)": parseFloat(r.percentage.toFixed(1))
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    
    // Auto-size columns slightly
    const colWidths = [
      { wch: 30 }, // Nama
      { wch: 15 }, // NIS
      { wch: 15 }, // Kelas
      { wch: 12 }, // Gender
      { wch: 8 },  // Hadir
      { wch: 10 }, // Terlambat
      { wch: 8 },  // Izin
      { wch: 8 },  // Sakit
      { wch: 8 },  // Alpa
      { wch: 15 }  // Persentase
    ];
    worksheet['!cols'] = colWidths;

    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Rekap Presensi");
    XLSX.writeFile(workbook, `Rekap_Presensi_${applied.from}_sampai_${applied.to}.xlsx`);
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ppm-gold-dark">Laporan</p>
          <h1 className="font-display text-2xl font-extrabold text-gray-800">
            Rekapan Kehadiran Santri
          </h1>
        </div>
        <Button variant="outline" onClick={handleExport}>
          Export Excel
        </Button>
      </div>

      <div className="flex flex-col gap-4">
        <FilterBar>
          <Field label="Dari Tanggal">
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
          </Field>
          <Field label="Sampai Tanggal">
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} />
          </Field>
          <Field label="Pilih Kelas">
            <Select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="">— Semua Kelas —</option>
              {(ref?.classes ?? []).map((c: any) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </Select>
          </Field>
          <Field label="Pilih Gender">
            <Select value={filterGender} onChange={(e) => setFilterGender(e.target.value)}>
              <option value="">— Semua Gender —</option>
              <option value="L">Laki-laki</option>
              <option value="P">Perempuan</option>
            </Select>
          </Field>
          <Button variant="gold" onClick={applyFilterSantri}>
            Terapkan Tanggal
          </Button>
        </FilterBar>

        <div>
          {isLoadingDetail && <LoadingState />}
          {detailData && !detailData.ok && <ErrorState message="Gagal memuat rekap presensi." />}
          {detailData?.ok && groupedSummary.length === 0 && <EmptyState title="Tidak ada data pada rentang ini" />}
          
          {detailData?.ok && groupedSummary.length > 0 && (
            <div className="flex flex-col gap-6">
              {groupedSummary.map(([className, classRows]) => (
                <Card key={className} className="overflow-hidden">
                  <div className="bg-ppm-green-dark px-5 py-3 text-white">
                    <h3 className="font-display text-lg font-bold">{className}</h3>
                  </div>
                  <div className="scroll-thin overflow-x-auto">
                    <table className="w-full min-w-[720px] text-left text-sm">
                      <thead className="bg-ppm-green text-white">
                        <tr>
                          <th className="px-4 py-3 font-semibold">Nama</th>
                          <th className="px-4 py-3 font-semibold">NIS</th>
                          <th className="px-4 py-3 font-semibold">Gender</th>
                          <th className="px-4 py-3 font-semibold text-center">Hadir</th>
                          <th className="px-4 py-3 font-semibold text-center">Terlambat</th>
                          <th className="px-4 py-3 font-semibold text-center">Izin</th>
                          <th className="px-4 py-3 font-semibold text-center">Sakit</th>
                          <th className="px-4 py-3 font-semibold text-center">Alpa</th>
                          <th className="px-4 py-3 font-semibold text-center">Persentase</th>
                        </tr>
                      </thead>
                      <tbody>
                        {classRows.map((r: any) => (
                          <tr key={r.studentId} className="border-t border-ppm-border hover:bg-ppm-cream/40">
                            <td className="px-4 py-2 font-medium text-gray-700">{r.name}</td>
                            <td className="px-4 py-2 text-gray-500">{r.nis}</td>
                            <td className="px-4 py-2 text-gray-600">{r.gender === "L" ? "Laki-laki" : "Perempuan"}</td>
                            <td className="px-4 py-2 text-center">
                              <CountBadge value={r.hadir} colorKey="hadir" />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <CountBadge value={r.terlambat} colorKey="terlambat" />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <CountBadge value={r.izin} colorKey="izin" />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <CountBadge value={r.sakit} colorKey="sakit" />
                            </td>
                            <td className="px-4 py-2 text-center">
                              <CountBadge value={r.alpa} colorKey="alpa" />
                            </td>
                            <td className="px-4 py-2 text-center font-semibold text-gray-700">
                              {r.percentage.toFixed(1)}%
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CountBadge({ value, colorKey }: { value: number; colorKey: string }) {
  return (
    <span
      className={`inline-flex h-6 w-6 items-center justify-center rounded-md text-xs font-bold text-white ${COUNT_BADGE[colorKey]} ${value === 0 ? "opacity-20" : ""}`}
    >
      {value}
    </span>
  );
}
