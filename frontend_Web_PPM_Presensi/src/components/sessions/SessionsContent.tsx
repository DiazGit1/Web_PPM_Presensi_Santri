import useSWR from "swr";
import { useEffect, useMemo, useState } from "react";
import { Card, Field, Input, Select, Button } from "@/components/ui/Basics";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import { SessionDefaultsEditor } from "@/components/sessions/SessionDefaultsEditor";
import { formatDateIndonesian } from "@/lib/timezone";
import api from "@/lib/axios";

function todayWIBString() {
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta" });
  return fmt.format(new Date());
}

export function SessionsContent() {
  const { showToast } = useToast();
  const { data: ref, isLoading: refLoading, mutate: mutateRef } = useSWR("/reference");
  const { data: sessionsData, isLoading: sessionsLoading, mutate } = useSWR("/sessions");

  const [date, setDate] = useState(todayWIBString());
  const [sessionType, setSessionType] = useState<string>("subuh");
  const [scanStart, setScanStart] = useState("");
  const [onTimeUntil, setOnTimeUntil] = useState("");
  const [endTime, setEndTime] = useState("");
  const [selectedGroups, setSelectedGroups] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [editSessionTarget, setEditSessionTarget] = useState<any | null>(null);
  const [editSubmitting, setEditSubmitting] = useState(false);

  const settingsByType = useMemo(() => {
    const map = new Map<string, any>();
    for (const s of ref?.sessionSettings ?? []) map.set(s.session_type, s);
    return map;
  }, [ref]);

  useEffect(() => {
    const s = settingsByType.get(sessionType);
    if (s) {
      setScanStart(s.scan_start_time?.slice(0, 5) ?? "");
      setOnTimeUntil(s.on_time_until?.slice(0, 5) ?? "");
      setEndTime(s.end_time?.slice(0, 5) ?? "");
    } else {
      setScanStart("");
      setOnTimeUntil("");
      setEndTime("");
    }
  }, [sessionType, settingsByType]);

  useEffect(() => {
    if (ref?.groups) {
      setSelectedGroups(new Set(ref.groups.map((g: any) => g.id)));
    }
  }, [ref]);

  function toggleGroup(id: string) {
    setSelectedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreateSession() {
    setFormError(null);
    if (selectedGroups.size === 0) {
      setFormError("Pilih minimal satu kelompok yang mengaji.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/sessions", {
        sessionDate: date,
        sessionType,
        scanStartTime: scanStart,
        onTimeUntil,
        endTime,
        groupIds: Array.from(selectedGroups),
      });
      showToast("Sesi presensi berhasil dibuka.");
      mutate();
    } catch (err: any) {
      setFormError(err.response?.data?.message ?? "Gagal terhubung ke server. Periksa koneksi internet dan coba lagi.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleToggleGroup(sessionId: string, groupId: string, action: "close" | "reopen") {
    try {
      await api.post(`/sessions/${sessionId}/groups/${groupId}/toggle`, { action });
      showToast(action === "close" ? "Kelompok ditutup lebih awal." : "Kelompok dibuka kembali.");
      mutate();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? "Gagal terhubung ke server.", "error");
    }
  }

  async function handleDeleteSession(sessionId: string) {
    const confirmed = window.confirm("Hapus riwayat sesi ini? Data presensi yang terkait akan ikut terhapus dari rekap dan detail presensi.");
    if (!confirmed) return;

    try {
      await api.delete(`/sessions/${sessionId}`);
      showToast("Riwayat sesi berhasil dihapus.");
      mutate();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? "Gagal terhubung ke server.", "error");
    }
  }

  async function handleUpdateSession(e: React.FormEvent) {
    e.preventDefault();
    if (!editSessionTarget) return;
    setEditSubmitting(true);
    try {
      await api.put(`/sessions/${editSessionTarget.id}`, {
        sessionDate: editSessionTarget.session_date,
        sessionType: editSessionTarget.session_type,
        scanStartTime: editSessionTarget.scan_start_time?.slice(0, 5),
        onTimeUntil: editSessionTarget.on_time_until?.slice(0, 5),
        endTime: editSessionTarget.end_time?.slice(0, 5),
      });
      showToast("Sesi berhasil diperbarui.");
      setEditSessionTarget(null);
      mutate();
    } catch (err: any) {
      showToast(err.response?.data?.message ?? "Gagal memperbarui sesi.", "error");
    } finally {
      setEditSubmitting(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-5xl flex-col gap-6">
      <div>
        <p className="text-sm font-semibold text-ppm-gold-dark">Presensi</p>
        <h1 className="font-display text-2xl font-extrabold text-gray-800">Buka Sesi Presensi</h1>
      </div>

      <SessionDefaultsEditor sessionSettings={ref?.sessionSettings ?? []} onSaved={() => mutateRef()} />

      <Card className="p-5">
        {refLoading ? (
          <LoadingState />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
              <Field label="Tanggal">
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </Field>
              <Field label="Jenis Sesi">
                <Select value={sessionType} onChange={(e) => setSessionType(e.target.value as any)}>
                  <option value="subuh">Subuh</option>
                  <option value="pagi">Pagi</option>
                  <option value="siang">Siang</option>
                  <option value="malam">Malam</option>
                  <option value="lainnya">Lainnya</option>
                </Select>
              </Field>
              <Field label="Mulai Scan">
                <Input type="time" value={scanStart} onChange={(e) => setScanStart(e.target.value)} />
              </Field>
              <Field label="Batas Tepat Waktu">
                <Input
                  type="time"
                  value={onTimeUntil}
                  onChange={(e) => setOnTimeUntil(e.target.value)}
                />
              </Field>
              <Field label="Selesai">
                <Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} />
              </Field>
            </div>

            <div>
              <p className="mb-2 text-sm font-semibold text-ppm-gold-dark">
                Kelompok yang Mengaji
              </p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                {(ref?.groups ?? []).map((g: any) => (
                  <label
                    key={g.id}
                    className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm font-medium ${
                      selectedGroups.has(g.id)
                        ? "border-ppm-green bg-ppm-green/10 text-ppm-green-dark"
                        : "border-ppm-border text-gray-500"
                    }`}
                  >
                    <input
                      type="checkbox"
                      className="accent-[--ppm-green]"
                      checked={selectedGroups.has(g.id)}
                      onChange={() => toggleGroup(g.id)}
                    />
                    {g.name}
                  </label>
                ))}
              </div>
            </div>

            {formError && (
              <p className="rounded-lg bg-red-50 px-3 py-2 text-sm font-medium text-red-600">
                {formError}
              </p>
            )}

            <div>
              <Button onClick={handleCreateSession} disabled={submitting}>
                {submitting ? "Membuka Sesi..." : "Buka Sesi"}
              </Button>
            </div>
          </div>
        )}
      </Card>

      <div>
        <h2 className="mb-3 font-display text-lg font-bold text-gray-700">Riwayat Sesi</h2>
        {sessionsLoading && <LoadingState />}
        {sessionsData && !sessionsData.ok && (
          <ErrorState message="Gagal memuat riwayat sesi." />
        )}
        {sessionsData?.ok && sessionsData.sessions.length === 0 && (
          <EmptyState title="Belum ada sesi yang dibuka" />
        )}
        <div className="flex flex-col gap-3">
          {(sessionsData?.sessions ?? []).map((s: any) => (
            <Card key={s.id} className="p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <p className="font-semibold text-gray-800">
                    {formatDateIndonesian(s.session_date)} &middot;{" "}
                    <span className="capitalize">{s.session_type}</span>
                  </p>
                  <p className="text-xs text-gray-500">
                    Scan {s.scan_start_time?.slice(0, 5)} &bull; Tepat waktu s/d{" "}
                    {s.on_time_until?.slice(0, 5)} &bull; Selesai {s.end_time?.slice(0, 5)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap gap-2">
                  {(s.session_groups ?? []).map((sg: any) => {
                    const isEnded = s.session_date && s.end_time 
                      ? new Date(`${s.session_date}T${s.end_time}+07:00`) < new Date() 
                      : false;
                      
                    return (
                      <div
                        key={sg.id}
                        className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs font-semibold ${
                          !isEnded && (sg.closed_manually || sg.finalized)
                            ? "border-red-200 bg-red-50 text-red-600"
                            : "border-ppm-border bg-ppm-cream text-gray-600"
                        }`}
                      >
                        {sg.group?.name}
                        {!isEnded && (
                          <button
                            onClick={() =>
                              handleToggleGroup(
                                s.id,
                                sg.group?.id,
                                sg.closed_manually || sg.finalized ? "reopen" : "close"
                              )
                            }
                            className="ml-1 underline decoration-dotted"
                          >
                            {sg.closed_manually || sg.finalized ? "Buka lagi" : "Tutup"}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => setEditSessionTarget(s)}
                    className="rounded-lg border border-ppm-border bg-white px-3 py-1.5 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteSession(s.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:bg-red-100"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {editSessionTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="mb-4 font-display text-xl font-bold text-gray-800">
              Edit Pengaturan Sesi
            </h3>
            <form onSubmit={handleUpdateSession} className="flex flex-col gap-4">
              <Field label="Tanggal Sesi">
                <Input
                  type="date"
                  value={editSessionTarget.session_date}
                  onChange={(e) =>
                    setEditSessionTarget({ ...editSessionTarget, session_date: e.target.value })
                  }
                  required
                />
              </Field>
              <Field label="Jenis Sesi">
                <Select
                  value={editSessionTarget.session_type}
                  onChange={(e) =>
                    setEditSessionTarget({ ...editSessionTarget, session_type: e.target.value })
                  }
                >
                  <option value="subuh">Subuh</option>
                  <option value="pagi">Pagi</option>
                  <option value="siang">Siang</option>
                  <option value="malam">Malam</option>
                  <option value="lainnya">Lainnya</option>
                </Select>
              </Field>
              <div className="grid grid-cols-3 gap-2">
                <Field label="Mulai">
                  <Input
                    type="time"
                    value={editSessionTarget.scan_start_time?.slice(0, 5) || ""}
                    onChange={(e) =>
                      setEditSessionTarget({ ...editSessionTarget, scan_start_time: e.target.value })
                    }
                    required
                  />
                </Field>
                <Field label="Batas Waktu">
                  <Input
                    type="time"
                    value={editSessionTarget.on_time_until?.slice(0, 5) || ""}
                    onChange={(e) =>
                      setEditSessionTarget({ ...editSessionTarget, on_time_until: e.target.value })
                    }
                    required
                  />
                </Field>
                <Field label="Selesai">
                  <Input
                    type="time"
                    value={editSessionTarget.end_time?.slice(0, 5) || ""}
                    onChange={(e) =>
                      setEditSessionTarget({ ...editSessionTarget, end_time: e.target.value })
                    }
                    required
                  />
                </Field>
              </div>
              <div className="mt-4 flex justify-end gap-3">
                <Button type="button" variant="ghost" onClick={() => setEditSessionTarget(null)}>
                  Batal
                </Button>
                <Button type="submit" disabled={editSubmitting}>
                  {editSubmitting ? "Menyimpan..." : "Simpan Perubahan"}
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
