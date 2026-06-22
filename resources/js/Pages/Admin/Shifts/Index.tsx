import React, { useState } from 'react';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm, router } from '@inertiajs/react';
import PrimaryButton from '@/Components/PrimaryButton';

interface Shift {
    id: number;
    name: string;
    code: string;
    start_time: string;
    end_time: string;
}

interface Employee {
    id: number;
    name: string;
    email: string;
    role: string;
    shifts?: (Shift & {
        pivot: {
            id: number;
            start_date: string;
            end_date: string | null;
        };
    })[];
}

interface IndexProps {
    shifts: Shift[];
    employees: Employee[];
}

export default function ShiftsIndex({ shifts, employees }: IndexProps) {
        const [showShiftModal, setShowShiftModal] = useState(false);
        const [editingShift, setEditingShift] = useState<Shift | null>(null);
        const [showAssignModal, setShowAssignModal] = useState(false);
        const [showEditAssignModal, setShowEditAssignModal] = useState(false);
        const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<number[]>([]);
        const [bulkShiftId, setBulkShiftId] = useState<string>(shifts.length > 0 ? String(shifts[0].id) : '');
        const [bulkStartDate, setBulkStartDate] = useState<string>(new Date().toISOString().slice(0, 10));
        const [bulkEndDate, setBulkEndDate] = useState<string>('');

        const todayStr = new Date().toISOString().slice(0, 10);
        const getShiftStatus = (startDateStr: string, endDateStr: string | null) => {
            if (startDateStr <= todayStr && (!endDateStr || endDateStr >= todayStr)) {
                return 'active';
            } else if (startDateStr > todayStr) {
                return 'upcoming';
            }
            return 'past';
        };

        const checkOverlap = (empShifts: any[], newStart: string, newEnd: string | null, excludeId?: string) => {
            if (!newStart) return false;
            const S_n = newStart;
            const E_n = newEnd || '9999-12-31';

            return empShifts.some(sh => {
                if (excludeId && String(sh.pivot.id) === excludeId) return false;
                const S_e = sh.pivot.start_date;
                const E_e = sh.pivot.end_date || '9999-12-31';

                // Overlap: S_e <= E_n && S_n <= E_e
                return S_e <= E_n && S_n <= E_e;
            });
        };

        const { data: editAssignData, setData: setEditAssignData, post: postEditAssign, processing: processingEditAssign, errors: editAssignErrors, reset: resetEditAssign } = useForm({
            user_shift_id: '',
            shift_id: '',
            start_date: '',
            end_date: '',
        });

        const handleEditAssignSubmit = (e: React.FormEvent) => {
            e.preventDefault();
            postEditAssign(route('admin.shifts.update-assignment'), {
                onSuccess: () => {
                    resetEditAssign();
                    setShowEditAssignModal(false);
                },
            });
        };

        const openEditAssignModal = (sh: any) => {
            setEditAssignData({
                user_shift_id: String(sh.pivot.id),
                shift_id: String(sh.id),
                start_date: sh.pivot.start_date,
                end_date: sh.pivot.end_date || '',
            });
            setShowEditAssignModal(true);
        };

    // Form state for creating/updating Shift
    const { data: shiftData, setData: setShiftData, post: postShift, patch: patchShift, processing: processingShift, errors: shiftErrors, reset: resetShift } = useForm({
        name: '',
        code: '',
        start_time: '',
        end_time: '',
    });

    // Form state for assigning shift to employee
    const { data: assignData, setData: setAssignData, post: postAssign, processing: processingAssign, errors: assignErrors, reset: resetAssign } = useForm({
        user_id: '',
        shift_id: '',
        start_date: '',
        end_date: '',
    });

    const handleCreateShift = (e: React.FormEvent) => {
        e.preventDefault();
        postShift(route('admin.shifts.store'), {
            onSuccess: () => {
                resetShift();
                setShowShiftModal(false);
            },
        });
    };

    const handleUpdateShift = (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingShift) return;
        patchShift(route('admin.shifts.update', editingShift.id), {
            onSuccess: () => {
                resetShift();
                setEditingShift(null);
                setShowShiftModal(false);
            },
        });
    };

    const handleEditClick = (shift: Shift) => {
        setEditingShift(shift);
        setShiftData({
            name: shift.name,
            code: shift.code,
            // Strip seconds if present (e.g. 08:00:00 -> 08:00)
            start_time: shift.start_time.slice(0, 5),
            end_time: shift.end_time.slice(0, 5),
        });
        setShowShiftModal(true);
    };

    const handleDeleteShift = (id: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus shift ini?')) {
            router.delete(route('admin.shifts.destroy', id));
        }
    };

    const handleAssignShift = (e: React.FormEvent) => {
        e.preventDefault();
        postAssign(route('admin.shifts.assign'), {
            onSuccess: () => {
                resetAssign();
                setShowAssignModal(false);
            },
        });
    };

    const handleAssignBulk = () => {
        if (selectedEmployeeIds.length === 0) {
            alert('Silakan pilih minimal satu karyawan.');
            return;
        }
        if (!bulkShiftId) {
            alert('Silakan pilih shift yang akan ditugaskan.');
            return;
        }
        if (confirm(`Apakah Anda yakin ingin menugaskan shift terpilih ke ${selectedEmployeeIds.length} karyawan sekaligus?`)) {
            router.post(route('admin.shifts.assignBulk'), {
                user_ids: selectedEmployeeIds,
                shift_id: bulkShiftId,
                start_date: bulkStartDate,
                end_date: bulkEndDate || null,
            }, {
                preserveScroll: true,
                onSuccess: () => {
                    setSelectedEmployeeIds([]);
                    setBulkEndDate('');
                }
            });
        }
    };

    const handleRemoveAssignment = (userShiftId: number) => {
        if (confirm('Apakah Anda yakin ingin membatalkan penugasan shift ini?')) {
            router.post(route('admin.shifts.remove-assignment'), {
                user_shift_id: userShiftId,
            });
        }
    };

    const openAssignModal = (employeeId?: number) => {
        setAssignData({
            user_id: employeeId ? String(employeeId) : '',
            shift_id: shifts.length > 0 ? String(shifts[0].id) : '',
            start_date: new Date().toISOString().slice(0, 10),
            end_date: '',
        });
        setShowAssignModal(true);
    };

    return (
        <AuthenticatedLayout
            header={
                <h2 className="text-xl font-bold leading-tight text-slate-800 dark:text-slate-200">
                    Manajemen Shift & Penugasan Karyawan
                </h2>
            }
        >
            <Head title="Jadwal Shift Kerja" />

            <div className="max-w-7xl mx-auto space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column - Shift Lists */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-150 dark:border-slate-700/60 transition-colors">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-md font-bold text-slate-900 dark:text-white">Daftar Shift Kerja</h3>
                                    <p className="text-xs text-slate-400">Master shift jam kerja harian.</p>
                                </div>
                                <button
                                    onClick={() => { setEditingShift(null); resetShift(); setShowShiftModal(true); }}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase px-3 py-2 rounded-lg transition-all"
                                >
                                    + Shift
                                </button>
                            </div>

                            <div className="space-y-3">
                                {shifts.length === 0 ? (
                                    <p className="text-sm text-slate-400 text-center py-6">Belum ada shift kerja.</p>
                                ) : (
                                    shifts.map((shift) => (
                                        <div
                                            key={shift.id}
                                            className="p-4 rounded-xl border border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/30 flex justify-between items-center transition-colors"
                                        >
                                            <div>
                                                <div className="flex items-center gap-2">
                                                    <span className="font-bold text-slate-950 dark:text-white text-sm">{shift.name}</span>
                                                    <span className="text-[10px] bg-slate-200 dark:bg-slate-750 text-slate-700 dark:text-slate-300 font-black px-1.5 py-0.5 rounded uppercase">
                                                        {shift.code}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-1">
                                                    ⏱️ {shift.start_time.slice(0, 5)} - {shift.end_time.slice(0, 5)}
                                                </p>
                                            </div>
                                            <div className="flex gap-1.5">
                                                <button
                                                    onClick={() => handleEditClick(shift)}
                                                    className="p-1 text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                    title="Edit Shift"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteShift(shift.id)}
                                                    className="p-1 text-slate-400 hover:text-red-500 transition-colors"
                                                    title="Hapus Shift"
                                                >
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column - Employee Shift Assignments */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 shadow-sm border border-slate-150 dark:border-slate-700/60 transition-colors">
                            <div className="flex justify-between items-center mb-6">
                                <div>
                                    <h3 className="text-md font-bold text-slate-900 dark:text-white">Penugasan Shift Kerja Karyawan</h3>
                                    <p className="text-xs text-slate-400">Atur shift jam kerja untuk setiap karyawan.</p>
                                </div>
                                <button
                                    onClick={() => openAssignModal()}
                                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-lg transition-all"
                                    disabled={shifts.length === 0}
                                >
                                    Tugaskan Shift
                                </button>
                            </div>

                            {selectedEmployeeIds.length > 0 && (
                                <div className="bg-indigo-50 dark:bg-indigo-950/30 border border-indigo-150 dark:border-indigo-900/60 p-4 rounded-2xl mb-5 flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 transition-all animate-fade-in">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-indigo-100 dark:bg-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                                            <span className="text-xs font-bold">{selectedEmployeeIds.length}</span>
                                        </div>
                                        <div>
                                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                                                Penugasan Shift Masal
                                            </span>
                                            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                                Tugaskan satu shift kerja aktif untuk seluruh karyawan terpilih secara bersamaan.
                                            </p>
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                                        <div className="min-w-[180px] flex-1 sm:flex-initial">
                                            <select
                                                value={bulkShiftId}
                                                onChange={(e) => setBulkShiftId(e.target.value)}
                                                className="w-full text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 py-2.5"
                                            >
                                                <option value="" disabled>-- Pilih Shift --</option>
                                                {shifts.map((sh) => (
                                                    <option key={sh.id} value={sh.id}>{sh.name} [{sh.code}] ({sh.start_time.slice(0, 5)} - {sh.end_time.slice(0, 5)})</option>
                                                ))}
                                            </select>
                                        </div>
                                        
                                        <div className="flex-1 sm:flex-initial">
                                            <input
                                                type="date"
                                                value={bulkStartDate}
                                                onChange={(e) => setBulkStartDate(e.target.value)}
                                                className="w-full text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 py-2.5"
                                                title="Tanggal Mulai"
                                            />
                                        </div>

                                        <div className="flex-1 sm:flex-initial">
                                            <input
                                                type="date"
                                                value={bulkEndDate}
                                                onChange={(e) => setBulkEndDate(e.target.value)}
                                                className="w-full text-xs font-semibold rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 py-2.5"
                                                title="Tanggal Selesai (Opsional)"
                                            />
                                        </div>
                                        
                                        <button
                                            onClick={handleAssignBulk}
                                            className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs uppercase px-4 py-2.5 rounded-xl transition-all shadow-md shadow-indigo-600/20 active:scale-95 flex-shrink-0"
                                            disabled={
                                                !bulkShiftId || 
                                                !bulkStartDate || 
                                                employees.some(emp => 
                                                    selectedEmployeeIds.includes(emp.id) && 
                                                    checkOverlap(emp.shifts || [], bulkStartDate, bulkEndDate)
                                                )
                                            }
                                        >
                                            Tugaskan Masal
                                        </button>
                                    </div>
                                    {employees.some(emp => 
                                        selectedEmployeeIds.includes(emp.id) && 
                                        checkOverlap(emp.shifts || [], bulkStartDate, bulkEndDate)
                                    ) && (
                                        <div className="text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/50 w-full mt-2 animate-fade-in">
                                            ⚠️ Karyawan berikut memiliki bentrok jadwal: {
                                                employees
                                                    .filter(emp => selectedEmployeeIds.includes(emp.id) && checkOverlap(emp.shifts || [], bulkStartDate, bulkEndDate))
                                                    .map(e => e.name)
                                                    .join(', ')
                                            }
                                        </div>
                                    )}
                                </div>
                            )}

                            <div className="overflow-x-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead>
                                        <tr className="border-b border-slate-100 dark:border-slate-750 bg-slate-50 dark:bg-slate-900/10">
                                            <th className="w-12 px-4 py-3.5 text-center">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                    checked={employees.length > 0 && employees.every(emp => selectedEmployeeIds.includes(emp.id))}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedEmployeeIds(employees.map(emp => emp.id));
                                                        } else {
                                                            setSelectedEmployeeIds([]);
                                                        }
                                                    }}
                                                />
                                            </th>
                                            <th className="px-4 py-3.5 text-xs font-bold text-slate-400 uppercase">Karyawan</th>
                                            <th className="px-4 py-3.5 text-xs font-bold text-slate-400 uppercase" colSpan={2}>Jadwal Shift Kerja (Timeline)</th>
                                            <th className="px-4 py-3.5 text-xs font-bold text-slate-400 uppercase text-right">Aksi</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100 dark:divide-slate-750">
                                        {employees.length === 0 ? (
                                            <tr>
                                                <td colSpan={5} className="px-4 py-8 text-center text-sm text-slate-500">
                                                    Tidak ada data karyawan.
                                                </td>
                                            </tr>
                                        ) : (
                                            employees.map((employee) => {
                                                const activeShift = employee.shifts && employee.shifts.length > 0 ? employee.shifts[0] : null;
                                                return (
                                                    <tr key={employee.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-700/30 transition-colors">
                                                        <td className="px-4 py-4 text-center">
                                                            <input
                                                                type="checkbox"
                                                                className="rounded border-slate-300 dark:border-slate-600 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                                                                checked={selectedEmployeeIds.includes(employee.id)}
                                                                onChange={(e) => {
                                                                    if (e.target.checked) {
                                                                        setSelectedEmployeeIds([...selectedEmployeeIds, employee.id]);
                                                                    } else {
                                                                        setSelectedEmployeeIds(selectedEmployeeIds.filter(id => id !== employee.id));
                                                                    }
                                                                }}
                                                            />
                                                        </td>
                                                        <td className="px-4 py-4">
                                                            <div className="font-semibold text-slate-900 dark:text-white text-sm">{employee.name}</div>
                                                            <div className="text-xs text-slate-400">{employee.email}</div>
                                                        </td>
                                                        <td className="px-4 py-4" colSpan={2}>
                                                            {employee.shifts && employee.shifts.length > 0 ? (
                                                                <div className="space-y-2 max-w-lg">
                                                                    {employee.shifts.map((sh) => {
                                                                        const status = getShiftStatus(sh.pivot.start_date, sh.pivot.end_date);
                                                                        return (
                                                                            <div 
                                                                                key={sh.pivot.id} 
                                                                                className={`flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl border transition-all ${
                                                                                    status === 'active' 
                                                                                    ? 'bg-emerald-50/70 dark:bg-emerald-950/20 border-emerald-150 dark:border-emerald-900/40 text-emerald-900 dark:text-emerald-350' 
                                                                                    : 'bg-slate-50/50 dark:bg-slate-900/30 border-slate-100 dark:border-slate-700/60 text-slate-800 dark:text-slate-300'
                                                                                }`}
                                                                            >
                                                                                <div className="flex flex-wrap items-center gap-2">
                                                                                    <span className={`text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-full ${
                                                                                        status === 'active'
                                                                                        ? 'bg-emerald-500 text-white shadow-sm shadow-emerald-500/20'
                                                                                        : 'bg-indigo-100 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400'
                                                                                    }`}>
                                                                                        {status === 'active' ? 'Aktif' : 'Mendatang'}
                                                                                    </span>
                                                                                    <div className="font-bold text-sm">
                                                                                        {sh.name} <span className="text-xs font-mono font-medium opacity-75">[{sh.code}]</span>
                                                                                    </div>
                                                                                    <span className="text-xs opacity-80">
                                                                                        ⏱️ {sh.start_time.slice(0, 5)} - {sh.end_time.slice(0, 5)}
                                                                                    </span>
                                                                                </div>
                                                                                <div className="flex items-center justify-between sm:justify-end gap-3 mt-1.5 sm:mt-0">
                                                                                    <div className="text-xs font-semibold opacity-75">
                                                                                        🗓️ {new Date(sh.pivot.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                                                        {' - '}
                                                                                        {sh.pivot.end_date 
                                                                                            ? new Date(sh.pivot.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })
                                                                                            : 'Seterusnya'
                                                                                        }
                                                                                    </div>
                                                                                    <button
                                                                                        onClick={() => openEditAssignModal(sh)}
                                                                                        className="text-xs font-bold text-indigo-600 hover:text-indigo-700 hover:underline p-1 flex-shrink-0 transition-colors"
                                                                                        title="Edit Penugasan"
                                                                                    >
                                                                                        Edit
                                                                                    </button>
                                                                                    <button
                                                                                        onClick={() => handleRemoveAssignment(sh.pivot.id)}
                                                                                        className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline p-1 flex-shrink-0 transition-colors"
                                                                                        title="Batalkan Penugasan"
                                                                                    >
                                                                                        Hapus
                                                                                    </button>
                                                                                </div>
                                                                            </div>
                                                                        );
                                                                    })}
                                                                </div>
                                                            ) : (
                                                                <span className="text-xs text-rose-500 font-semibold bg-rose-50 dark:bg-rose-950/20 px-2 py-1 rounded border border-rose-100 dark:border-rose-900/50">
                                                                    Belum Ditugaskan
                                                                </span>
                                                            )}
                                                        </td>
                                                        <td className="px-4 py-4 text-right">
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    onClick={() => openAssignModal(employee.id)}
                                                                    className="bg-indigo-50 dark:bg-indigo-500/10 hover:bg-indigo-100 text-indigo-700 dark:text-indigo-400 font-bold text-xs uppercase px-2.5 py-1.5 rounded-lg transition-all"
                                                                >
                                                                    Tugaskan
                                                                </button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                );
                                            })
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Modal CRUD Shift */}
            {showShiftModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 transform transition-all scale-100 animate-scale-up">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-850">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">
                                {editingShift ? 'Edit Shift Kerja' : 'Tambah Shift Kerja Baru'}
                            </h3>
                            <button
                                onClick={() => { setShowShiftModal(false); resetShift(); }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={editingShift ? handleUpdateShift : handleCreateShift} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Nama Shift</label>
                                <input
                                    type="text"
                                    value={shiftData.name}
                                    onChange={(e) => setShiftData('name', e.target.value)}
                                    placeholder="Contoh: Shift Pagi, Shift Regular"
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    required
                                />
                                {shiftErrors.name && <p className="text-red-500 text-xs mt-1">{shiftErrors.name}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Kode Shift (Unique)</label>
                                <input
                                    type="text"
                                    value={shiftData.code}
                                    onChange={(e) => setShiftData('code', e.target.value)}
                                    placeholder="Contoh: SHP, SHM"
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm uppercase"
                                    required
                                />
                                {shiftErrors.code && <p className="text-red-500 text-xs mt-1">{shiftErrors.code}</p>}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Jam Masuk (Check-In)</label>
                                    <input
                                        type="time"
                                        value={shiftData.start_time}
                                        onChange={(e) => setShiftData('start_time', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        required
                                    />
                                    {shiftErrors.start_time && <p className="text-red-500 text-xs mt-1">{shiftErrors.start_time}</p>}
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Jam Pulang (Check-Out)</label>
                                    <input
                                        type="time"
                                        value={shiftData.end_time}
                                        onChange={(e) => setShiftData('end_time', e.target.value)}
                                        className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                        required
                                    />
                                    {shiftErrors.end_time && <p className="text-red-500 text-xs mt-1">{shiftErrors.end_time}</p>}
                                </div>
                            </div>

                            <div className="pt-4 flex gap-3">
                                <button
                                    type="button"
                                    onClick={() => { setShowShiftModal(false); resetShift(); }}
                                    className="flex-1 border border-slate-200 dark:border-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold text-xs uppercase tracking-wide py-3 rounded-xl transition-all"
                                >
                                    Batal
                                </button>
                                <PrimaryButton
                                    type="submit"
                                    disabled={processingShift}
                                    className="flex-1 justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20"
                                >
                                    {editingShift ? 'Simpan' : 'Tambah Shift'}
                                </PrimaryButton>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Assign Shift to Employee */}
            {showAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 transform transition-all scale-100 animate-scale-up">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-850">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Tugaskan Shift Kerja</h3>
                            <button
                                onClick={() => { setShowAssignModal(false); resetAssign(); }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleAssignShift} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Pilih Karyawan</label>
                                <select
                                    value={assignData.user_id}
                                    onChange={(e) => setAssignData('user_id', e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    required
                                >
                                    <option value="" disabled>-- Pilih Karyawan --</option>
                                    {employees.map((emp) => (
                                        <option key={emp.id} value={emp.id}>{emp.name} ({emp.email})</option>
                                    ))}
                                </select>
                                {assignErrors.user_id && <p className="text-red-500 text-xs mt-1">{assignErrors.user_id}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Pilih Jam Shift</label>
                                <select
                                    value={assignData.shift_id}
                                    onChange={(e) => setAssignData('shift_id', e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    required
                                >
                                    <option value="" disabled>-- Pilih Shift --</option>
                                    {shifts.map((sh) => (
                                        <option key={sh.id} value={sh.id}>{sh.name} [{sh.code}] ({sh.start_time.slice(0, 5)} - {sh.end_time.slice(0, 5)})</option>
                                    ))}
                                </select>
                                {assignErrors.shift_id && <p className="text-red-500 text-xs mt-1">{assignErrors.shift_id}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Mulai Berlaku Tanggal</label>
                                <input
                                    type="date"
                                    value={assignData.start_date}
                                    onChange={(e) => setAssignData('start_date', e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    required
                                />
                                {assignErrors.start_date && <p className="text-red-500 text-xs mt-1">{assignErrors.start_date}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Berakhir Tanggal (Opsional)</label>
                                <input
                                    type="date"
                                    value={assignData.end_date}
                                    onChange={(e) => setAssignData('end_date', e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                />
                                {assignErrors.end_date && <p className="text-red-500 text-xs mt-1">{assignErrors.end_date}</p>}
                            </div>

                             {(() => {
                                 const selectedEmployeeObj = employees.find(emp => String(emp.id) === assignData.user_id);
                                 const hasAssignOverlap = selectedEmployeeObj && checkOverlap(selectedEmployeeObj.shifts || [], assignData.start_date, assignData.end_date);
                                 return (
                                     <>
                                         {selectedEmployeeObj && selectedEmployeeObj.shifts && selectedEmployeeObj.shifts.length > 0 && (
                                             <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50 text-xs space-y-1.5">
                                                 <div className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Jadwal Terdaftar Karyawan:</div>
                                                 {selectedEmployeeObj.shifts.map(s => (
                                                     <div key={s.pivot.id} className="flex justify-between items-center text-slate-700 dark:text-slate-350">
                                                         <span>📅 {s.name} ({s.code})</span>
                                                         <span className="font-medium">
                                                             {new Date(s.pivot.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                             {' - '}
                                                             {s.pivot.end_date 
                                                                 ? new Date(s.pivot.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                                                                 : 'Seterusnya'
                                                             }
                                                         </span>
                                                     </div>
                                                 ))}
                                             </div>
                                         )}

                                         {hasAssignOverlap && (
                                             <div className="text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/50">
                                                 ⚠️ Tanggal yang dipilih bentrok dengan jadwal yang sudah terdaftar!
                                             </div>
                                         )}

                                         <div className="pt-4 flex gap-3">
                                             <button
                                                 type="button"
                                                 onClick={() => { setShowAssignModal(false); resetAssign(); }}
                                                 className="flex-1 border border-slate-200 dark:border-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold text-xs uppercase tracking-wide py-3 rounded-xl transition-all"
                                             >
                                                 Batal
                                             </button>
                                             <PrimaryButton
                                                 type="submit"
                                                 disabled={processingAssign || !!hasAssignOverlap}
                                                 className="flex-1 justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20"
                                             >
                                                 Tugaskan Shift
                                             </PrimaryButton>
                                         </div>
                                     </>
                                 );
                             })()}
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Edit Assign Shift */}
            {showEditAssignModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
                    <div className="bg-white dark:bg-slate-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden border border-slate-100 dark:border-slate-700 transform transition-all scale-100 animate-scale-up">
                        <div className="p-6 border-b border-slate-100 dark:border-slate-700/60 flex justify-between items-center bg-slate-50/50 dark:bg-slate-850">
                            <h3 className="text-lg font-black text-slate-900 dark:text-white">Edit Penugasan Shift</h3>
                            <button
                                onClick={() => { setShowEditAssignModal(false); resetEditAssign(); }}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        <form onSubmit={handleEditAssignSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Pilih Jam Shift</label>
                                <select
                                    value={editAssignData.shift_id}
                                    onChange={(e) => setEditAssignData('shift_id', e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    required
                                >
                                    <option value="" disabled>-- Pilih Shift --</option>
                                    {shifts.map((sh) => (
                                        <option key={sh.id} value={sh.id}>{sh.name} [{sh.code}] ({sh.start_time.slice(0, 5)} - {sh.end_time.slice(0, 5)})</option>
                                    ))}
                                </select>
                                {editAssignErrors.shift_id && <p className="text-red-500 text-xs mt-1">{editAssignErrors.shift_id}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Mulai Berlaku Tanggal</label>
                                <input
                                    type="date"
                                    value={editAssignData.start_date}
                                    onChange={(e) => setEditAssignData('start_date', e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                    required
                                />
                                {editAssignErrors.start_date && <p className="text-red-500 text-xs mt-1">{editAssignErrors.start_date}</p>}
                            </div>

                            <div>
                                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">Berakhir Tanggal (Opsional)</label>
                                <input
                                    type="date"
                                    value={editAssignData.end_date}
                                    onChange={(e) => setEditAssignData('end_date', e.target.value)}
                                    className="w-full rounded-xl border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-150 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                                />
                                {editAssignErrors.end_date && <p className="text-red-500 text-xs mt-1">{editAssignErrors.end_date}</p>}
                            </div>

                             {(() => {
                                 const editedEmployeeObj = employees.find(emp => 
                                     emp.shifts && emp.shifts.some(sh => String(sh.pivot.id) === editAssignData.user_shift_id)
                                 );
                                 const otherShifts = editedEmployeeObj && editedEmployeeObj.shifts 
                                     ? editedEmployeeObj.shifts.filter(sh => String(sh.pivot.id) !== editAssignData.user_shift_id) 
                                     : [];
                                 const hasEditOverlap = checkOverlap(otherShifts, editAssignData.start_date, editAssignData.end_date);
                                 return (
                                     <>
                                         {editedEmployeeObj && otherShifts.length > 0 && (
                                             <div className="bg-slate-50 dark:bg-slate-900/40 p-3 rounded-2xl border border-slate-100 dark:border-slate-700/50 text-xs space-y-1.5 font-sans">
                                                 <div className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Jadwal Terdaftar Lainnya:</div>
                                                 {otherShifts.map(s => (
                                                     <div key={s.pivot.id} className="flex justify-between items-center text-slate-700 dark:text-slate-350">
                                                         <span>📅 {s.name} ({s.code})</span>
                                                         <span className="font-medium">
                                                             {new Date(s.pivot.start_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}
                                                             {' - '}
                                                             {s.pivot.end_date 
                                                                 ? new Date(s.pivot.end_date).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })
                                                                 : 'Seterusnya'
                                                             }
                                                         </span>
                                                     </div>
                                                 ))}
                                             </div>
                                         )}

                                         {hasEditOverlap && (
                                             <div className="text-xs text-rose-500 font-bold bg-rose-50 dark:bg-rose-950/20 p-2.5 rounded-xl border border-rose-100 dark:border-rose-900/50">
                                                 ⚠️ Tanggal yang dipilih bentrok dengan jadwal yang sudah terdaftar!
                                             </div>
                                         )}

                                         <div className="pt-4 flex gap-3">
                                             <button
                                                 type="button"
                                                 onClick={() => { setShowEditAssignModal(false); resetEditAssign(); }}
                                                 className="flex-1 border border-slate-200 dark:border-slate-700 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-750 font-bold text-xs uppercase tracking-wide py-3 rounded-xl transition-all"
                                             >
                                                 Batal
                                             </button>
                                             <PrimaryButton
                                                 type="submit"
                                                 disabled={processingEditAssign || !!hasEditOverlap}
                                                 className="flex-1 justify-center py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl shadow-lg shadow-indigo-600/20"
                                             >
                                                 Simpan Perubahan
                                             </PrimaryButton>
                                         </div>
                                     </>
                                 );
                             })()}
                        </form>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
