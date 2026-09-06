import useSWR from "swr";
import { useMemo, useRef, useState } from "react";
import { Card, Field, Input, Select, Button, FilterBar } from "@/components/ui/Basics";
import { LoadingState, ErrorState, EmptyState } from "@/components/ui/States";
import { useToast } from "@/components/ui/Toast";
import api from "@/lib/axios";

export function StudentsContent() {
  const { showToast } = useToast();
  const { data: ref } = useSWR("/reference");
  const [search, setSearch] = useState("");
  const [classFilter, setClassFilter] = useState("");
  const [activeFilter, setActiveFilter] = useState("");
  const [genderFilter, setGenderFilter] = useState("");

  const queryString = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set("search", search);
    if (classFilter) params.set("classId", classFilter);
    if (activeFilter) params.set("active", activeFilter);
    if (genderFilter) params.set("gender", genderFilter);
    return params.toString();
  }, [search, classFilter, activeFilter, genderFilter]);

  const { data: students, isLoading, error: fetchError, mutate } = useSWR(`/students?${queryString}`);

  const groupedStudents = useMemo(() => {
    if (!students) return [];
    const groups = new Map<string, any[]>();
    for (const s of students) {
      const className = s.school_class?.name || s.class_name || "Tanpa Kelas";
      if (!groups.has(className)) groups.set(className, []);
      groups.get(className)!.push(s);
    }
    const CLASS_ORDER: Record<string, number> = {
      "Bacaan": 1,
      "Lambatan": 2,
      "Cepatan": 3,
      "HB": 4
    };

    return Array.from(groups.entries()).sort((a, b) => {
      const orderA = CLASS_ORDER[a[0]] || 99;
      const orderB = CLASS_ORDER[b[0]] || 99;
      if (orderA !== orderB) return orderA - orderB;
      return a[0].localeCompare(b[0]);
    });
  }, [students]);

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importSummary, setImportSummary] = useState<any>(null);

  async function handleImport(file: File) {
    setImporting(true);
    setImportSummary(null);
    try {
      // Parse file using xlsx, since we installed it.
      // But to keep it simple, we could just say frontend parsing is disabled for a moment,
      // Or send JSON. Since Laravel expects JSON, let's implement basic Excel parsing.
      const XLSX = await import("xlsx");
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const data = e.target?.result;
          const workbook = XLSX.read(data, { type: "array" });
          const sheet = workbook.Sheets[workbook.SheetNames[0]];
          const json = XLSX.utils.sheet_to_json(sheet);
          
          const rows = json.map((row: any) => ({
            nis: String(row.NIS || row.nis || ""),
            name: String(row.Nama || row.nama || row.Name || row.name || ""),
            className: String(row.Kelas || row.kelas || row.Class || ""),
            gender: String(row.Gender || row.gender || row['Jenis Kelamin'] || "L").charAt(0).toUpperCase(),
            generation: String(row.Angkatan || row.angkatan || ""),
            active: String(row.Aktif || row.aktif || row.Active || "TRUE").toUpperCase() === "TRUE"
          }));

          const res = await api.post("/students/import", { rows });
          const created = res.data.filter((r: any) => r.status === 'created').length;
          const skipped = res.data.filter((r: any) => r.status === 'skipped').length;
          const errorCount = res.data.filter((r: any) => r.status === 'error').length;
          
          setImportSummary({ created, skipped, error: errorCount });
          showToast(`Import selesai: ${created} ditambahkan, ${skipped} dilewati, ${errorCount} error.`);
          mutate();
        } catch (err: any) {
          showToast("Gagal memproses file Excel.", "error");
        } finally {
          setImporting(false);
        }
      };
      reader.readAsArrayBuffer(file);
    } catch {
      showToast("Gagal terhubung ke server.", "error");
      setImporting(false);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  return (
    <div className="mx-auto flex max-w-6xl flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-ppm-gold-dark">Data Master</p>
          <h1 className="font-display text-2xl font-extrabold text-gray-800">Data Santri</h1>
        </div>
        <div className="flex gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,.xlsx,.xls"
            className="hidden"
            onChange={(e) => e.target.files?.[0] && handleImport(e.target.files[0])}
          />
          <Button variant="outline" onClick={() => fileInputRef.current?.click()} disabled={importing}>
            {importing ? "Mengimpor..." : "Import Excel/CSV"}
          </Button>
          <Button variant="gold" onClick={() => setShowAddForm((v) => !v)}>
            {showAddForm ? "Tutup Form" : "+ Tambah Santri"}
          </Button>
        </div>
      </div>

      {importSummary && (
        <Card className="border-ppm-green bg-ppm-green/5 p-4 text-sm">
          Import selesai: <strong>{importSummary.created}</strong> ditambahkan,{" "}
          <strong>{importSummary.skipped}</strong> dilewati (NIS sudah ada),{" "}
          <strong>{importSummary.error}</strong> gagal. Format kolom: NIS, Nama, Kelas, Angkatan,
          Jenis Kelamin (L/P), Aktif (TRUE/FALSE).
        </Card>
      )}

      {showAddForm && (
        <AddStudentForm
          classes={ref?.classes ?? []}
          onCreated={() => {
            setShowAddForm(false);
            mutate();
          }}
        />
      )}

      <FilterBar>
        <Field label="Cari Nama / NIS">
          <Input
            placeholder="Ketik nama atau NIS..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </Field>
        <Field label="Kelas">
          <Select value={classFilter} onChange={(e) => setClassFilter(e.target.value)}>
            <option value="">Semua Kelas</option>
            {(ref?.classes ?? []).map((c: any) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Jenis Kelamin">
          <Select value={genderFilter} onChange={(e) => setGenderFilter(e.target.value)}>
            <option value="">Semua</option>
            <option value="L">Laki-laki (L)</option>
            <option value="P">Perempuan (P)</option>
          </Select>
        </Field>
        <Field label="Status">
          <Select value={activeFilter} onChange={(e) => setActiveFilter(e.target.value)}>
            <option value="">Semua</option>
            <option value="true">Aktif</option>
            <option value="false">Nonaktif</option>
          </Select>
        </Field>
      </FilterBar>

      {(isLoading || fetchError || students?.length === 0) && (
        <Card className="overflow-hidden">
          {isLoading && <LoadingState />}
          {fetchError && <ErrorState message="Gagal memuat data santri." />}
          {!isLoading && !fetchError && students?.length === 0 && (
            <EmptyState title="Tidak ada santri ditemukan" />
          )}
        </Card>
      )}

      {!isLoading && !fetchError && groupedStudents.length > 0 && (
        <div className="flex flex-col gap-6">
          {groupedStudents.map(([className, classStudents]) => (
            <Card key={className} className="overflow-hidden">
              <div className="bg-ppm-green-dark px-5 py-3 text-white">
                <h3 className="font-display text-lg font-bold">{className}</h3>
              </div>
              <div className="scroll-thin overflow-x-auto">
                <table className="w-full min-w-[720px] text-left text-sm">
                  <thead className="bg-ppm-green text-white">
                    <tr>
                      <th className="px-4 py-3 font-semibold">NIS</th>
                      <th className="px-4 py-3 font-semibold">Nama</th>
                      <th className="px-4 py-3 font-semibold">Kelas</th>
                      <th className="px-4 py-3 font-semibold">Gender</th>
                      <th className="px-4 py-3 font-semibold">Angkatan</th>
                      <th className="px-4 py-3 font-semibold">Status</th>
                      <th className="px-4 py-3 font-semibold text-right">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {classStudents.map((s: any) => (
                      <StudentRow
                        key={s.id}
                        student={s}
                        classes={ref?.classes ?? []}
                        editing={editingId === s.id}
                        onEdit={() => setEditingId(s.id)}
                        onCancelEdit={() => setEditingId(null)}
                        onSaved={() => {
                          setEditingId(null);
                          mutate();
                        }}
                        onDeleted={() => mutate()}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function AddStudentForm({ classes, onCreated }: { classes: any[]; onCreated: () => void }) {
  const { showToast } = useToast();
  const [nis, setNis] = useState("");
  const [name, setName] = useState("");
  const [classId, setClassId] = useState("");
  const [gender, setGender] = useState("L");
  const [generation, setGeneration] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit() {
    setError(null);
    if (!nis || !name || !classId) {
      setError("NIS, Nama, dan Kelas wajib diisi.");
      return;
    }
    setSubmitting(true);
    try {
      await api.post("/students", { nis, name, classId, gender, generation, active: true });
      showToast("Santri berhasil ditambahkan.");
      setNis("");
      setName("");
      setGeneration("");
      onCreated();
    } catch (err: any) {
      setError(err.response?.data?.message || "Gagal menambahkan santri.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <Card className="p-5">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="NIS">
          <Input value={nis} onChange={(e) => setNis(e.target.value)} />
        </Field>
        <Field label="Nama">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </Field>
        <Field label="Kelas">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            <option value="">Pilih kelas</option>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Jenis Kelamin">
          <Select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="L">Laki-laki (L)</option>
            <option value="P">Perempuan (P)</option>
          </Select>
        </Field>
        <Field label="Angkatan">
          <Input value={generation} onChange={(e) => setGeneration(e.target.value)} />
        </Field>
      </div>
      {error && <p className="mt-3 text-sm font-medium text-red-600">{error}</p>}
      <div className="mt-4">
        <Button onClick={handleSubmit} disabled={submitting}>
          {submitting ? "Menyimpan..." : "Simpan Santri"}
        </Button>
      </div>
    </Card>
  );
}

function StudentRow({
  student,
  classes,
  editing,
  onEdit,
  onCancelEdit,
  onSaved,
  onDeleted,
}: {
  student: any;
  classes: any[];
  editing: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSaved: () => void;
  onDeleted: () => void;
}) {
  const { showToast } = useToast();
  const [name, setName] = useState(student.name);
  const [classId, setClassId] = useState(student.class_id);
  const [gender, setGender] = useState(student.gender);
  const [generation, setGeneration] = useState(student.generation ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      await api.patch(`/students/${student.id}`, { name, classId, gender, generation });
      showToast("Data santri diperbarui.");
      onSaved();
    } catch (err: any) {
      showToast(err.response?.data?.message || "Gagal menyimpan perubahan.", "error");
    } finally {
      setSaving(false);
    }
  }

  async function handleToggleActive() {
    try {
      await api.patch(`/students/${student.id}`, { active: !student.active });
      showToast(student.active ? "Santri dinonaktifkan." : "Santri diaktifkan kembali.");
      onSaved();
    } catch {
      showToast("Gagal terhubung ke server.", "error");
    }
  }

  async function handleDelete() {
    const confirmed = window.confirm(
      `Hapus santri ${student.name} (${student.nis})? Data presensi dan riwayat kelas terkait akan ikut terhapus.`
    );
    if (!confirmed) return;

    try {
      await api.delete(`/students/${student.id}`);
      showToast("Santri berhasil dihapus.");
      onDeleted();
    } catch {
      showToast("Gagal terhubung ke server.", "error");
    }
  }

  if (editing) {
    return (
      <tr className="border-t border-ppm-border bg-ppm-cream/40">
        <td className="px-4 py-2 text-gray-500">{student.nis}</td>
        <td className="px-4 py-2">
          <Input value={name} onChange={(e) => setName(e.target.value)} />
        </td>
        <td className="px-4 py-2">
          <Select value={classId} onChange={(e) => setClassId(e.target.value)}>
            {classes.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </td>
        <td className="px-4 py-2">
          <Select value={gender} onChange={(e) => setGender(e.target.value)}>
            <option value="L">L</option>
            <option value="P">P</option>
          </Select>
        </td>
        <td className="px-4 py-2">
          <Input value={generation} onChange={(e) => setGeneration(e.target.value)} />
        </td>
        <td className="px-4 py-2 text-gray-500">{student.active ? "Aktif" : "Nonaktif"}</td>
        <td className="px-4 py-2">
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onCancelEdit}>
              Batal
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "..." : "Simpan"}
            </Button>
          </div>
        </td>
      </tr>
    );
  }

  return (
    <tr className="border-t border-ppm-border hover:bg-ppm-cream/30">
      <td className="px-4 py-2 text-gray-600">{student.nis}</td>
      <td className="px-4 py-2 font-medium text-gray-800">{student.name}</td>
      <td className="px-4 py-2 text-gray-600">{student.school_class?.name || student.class_name || "-"}</td>
      <td className="px-4 py-2 text-gray-600">{student.gender}</td>
      <td className="px-4 py-2 text-gray-600">{student.generation ?? "-"}</td>
      <td className="px-4 py-2">
        <span
          className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            student.active ? "bg-green-100 text-green-700" : "bg-gray-200 text-gray-500"
          }`}
        >
          {student.active ? "Aktif" : "Nonaktif"}
        </span>
      </td>
      <td className="px-4 py-2">
        <div className="flex justify-end gap-2">
          <button onClick={onEdit} className="text-sm font-semibold text-ppm-green-dark">
            Edit
          </button>
          <button onClick={handleToggleActive} className="text-sm font-semibold text-gray-500">
            {student.active ? "Nonaktifkan" : "Aktifkan"}
          </button>
          <button onClick={handleDelete} className="text-sm font-semibold text-red-600">
            Hapus
          </button>
        </div>
      </td>
    </tr>
  );
}
