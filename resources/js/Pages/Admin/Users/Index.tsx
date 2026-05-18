import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import { PlusIcon, PencilIcon, TrashIcon, UserCircleIcon, KeyIcon } from '@heroicons/react/24/outline';

interface User {
    id: number;
    name: string;
    email: string;
    nip: string | null;
    phone: string | null;
    status: string;
    role: 'admin' | 'employee';
    basic_salary?: number | string;
}

export default function UserIndex({ auth, users, roles, statuses }: PageProps<{ users: User[], roles: {value: string, label: string}[], statuses: {value: string, label: string}[] }>) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingUser, setEditingUser] = useState<User | null>(null);

    const { data, setData, post, put, delete: destroy, reset, processing, errors } = useForm({
        name: '',
        email: '',
        nip: '',
        phone: '',
        status: statuses[0]?.value || 'active',
        role: 'employee',
        reset_password_default: false,
        basic_salary: '4500000',
    });

    const openDialog = (user?: User) => {
        if (user) {
            setEditingUser(user);
            setData({
                name: user.name,
                email: user.email,
                nip: user.nip || '',
                phone: user.phone || '',
                status: user.status,
                role: user.role,
                reset_password_default: false,
                basic_salary: String(user.basic_salary || '4500000'),
            });
        } else {
            setEditingUser(null);
            setData({
                name: '',
                email: '',
                nip: '',
                phone: '',
                status: 'active',
                role: 'employee',
                reset_password_default: false,
                basic_salary: '4500000',
            });
        }
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        reset();
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingUser) {
            put(route('admin.users.update', editingUser.id), {
                onSuccess: () => closeDialog(),
            });
        } else {
            post(route('admin.users.store'), {
                onSuccess: () => closeDialog(),
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Apakah Anda yakin ingin menghapus data karyawan ini secara permanen?')) {
            destroy(route('admin.users.destroy', id));
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Kelola Data Karyawan</h2>}
        >
            <Head title="Data Karyawan" />

            <div className="py-6">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    <div className="flex justify-between items-center">
                        <div>
                            <p className="text-gray-600 dark:text-gray-400 text-sm">Kelola seluruh staf, karyawan, dan akun HR Admin aplikasi HRIS.</p>
                        </div>
                        <button
                            onClick={() => openDialog()}
                            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-xl flex items-center space-x-2 transition-colors shadow-lg shadow-indigo-600/10 font-semibold text-sm"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>Tambah Karyawan</span>
                        </button>
                    </div>

                    <div className="bg-white dark:bg-gray-800 shadow-xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-slate-700 rounded-2xl overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left border-collapse">
                                <thead>
                                    <tr className="bg-slate-50 dark:bg-slate-700/30 border-b border-slate-200 dark:border-slate-700/60 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                                        <th className="px-6 py-4 font-medium">Nama / Email</th>
                                        <th className="px-6 py-4 font-medium">NIP / WhatsApp</th>
                                        <th className="px-6 py-4 font-medium">Gaji Pokok</th>
                                        <th className="px-6 py-4 font-medium">Hak Akses (Role)</th>
                                        <th className="px-6 py-4 font-medium">Status Akun</th>
                                        <th className="px-6 py-4 font-medium text-right">Aksi</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/40 text-xs">
                                    {users && users.length > 0 ? users.map((userRecord) => (
                                        <tr key={userRecord.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/10 transition-colors">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center space-x-3">
                                                    <div className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center text-slate-400 shrink-0">
                                                        <UserCircleIcon className="w-6 h-6" />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-slate-800 dark:text-slate-200">{userRecord.name}</p>
                                                        <p className="text-[10px] text-slate-400">{userRecord.email}</p>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4">
                                                <div className="space-y-0.5">
                                                    <p className="text-slate-800 dark:text-slate-200 font-semibold">{userRecord.nip || '-'}</p>
                                                    <p className="text-slate-400">{userRecord.phone || '-'}</p>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-bold text-slate-700 dark:text-slate-300">
                                                {new Intl.NumberFormat('id-ID', { style: 'currency', currency: 'IDR', minimumFractionDigits: 0 }).format(Number(userRecord.basic_salary || 0))}
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 ${
                                                    userRecord.role === 'admin' 
                                                        ? 'bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-400' 
                                                        : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-400'
                                                }`}>
                                                    {userRecord.role === 'admin' ? 'HR Admin' : 'Karyawan'}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4">
                                                <span className={`inline-flex text-[10px] font-bold uppercase tracking-wider rounded-full px-2.5 py-0.5 capitalize 
                                                    ${userRecord.status === 'active' ? 'bg-green-100 text-green-800 dark:bg-green-500/15 dark:text-green-400' : 
                                                    userRecord.status === 'inactive' ? 'bg-gray-100 text-gray-800 dark:bg-gray-500/15 dark:text-gray-400' : 
                                                    'bg-red-100 text-red-800 dark:bg-red-500/15 dark:text-red-400'}`}>
                                                    {userRecord.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right space-x-1 shrink-0">
                                                <button onClick={() => openDialog(userRecord)} className="p-2 text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-blue-900/30 rounded-lg transition-colors">
                                                    <PencilIcon className="w-4 h-4" />
                                                </button>
                                                {auth.user.id !== userRecord.id && (
                                                    <button onClick={() => handleDelete(userRecord.id)} className="p-2 text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/30 rounded-lg transition-colors">
                                                        <TrashIcon className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )) : (
                                        <tr>
                                            <td colSpan={5} className="py-8 text-center text-slate-400">Belum ada data karyawan terdaftar</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* Dialog */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={closeDialog}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-xl w-full">
                            <form onSubmit={submit}>
                                <div className="bg-white dark:bg-gray-800 px-6 pt-6 pb-5 border-b dark:border-gray-700/60">
                                    <h3 className="text-lg font-black text-gray-900 dark:text-white">
                                        {editingUser ? 'Edit Profil Karyawan' : 'Tambah Karyawan Baru'}
                                    </h3>
                                    <p className="text-xs text-slate-400 mt-1">Lengkapi data pribadi dan peran kerja pegawai.</p>
                                </div>
                                <div className="p-6 space-y-4 max-h-[60vh] overflow-y-auto custom-scrollbar">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Nama Lengkap</label>
                                            <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} required className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5" />
                                            {errors.name && <p className="text-red-500 text-[10px] mt-1">{errors.name}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">NIP Pegawai</label>
                                            <input type="text" value={data.nip} onChange={e => setData('nip', e.target.value)} className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5" placeholder="Nomor Induk Pegawai" />
                                            {errors.nip && <p className="text-red-500 text-[10px] mt-1">{errors.nip}</p>}
                                        </div>
                                    </div>
                                    
                                    <div>
                                        <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Email (Login Akun)</label>
                                        <input type="email" value={data.email} onChange={e => setData('email', e.target.value)} required className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5" />
                                        {errors.email && <p className="text-red-500 text-[10px] mt-1">{errors.email}</p>}
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Nomor WhatsApp</label>
                                            <input type="text" value={data.phone} onChange={e => setData('phone', e.target.value)} className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5" placeholder="Contoh: 0812..." />
                                            {errors.phone && <p className="text-red-500 text-[10px] mt-1">{errors.phone}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Peran (Role Hak Akses)</label>
                                            <select value={data.role} onChange={e => setData('role', e.target.value as any)} className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5">
                                                {roles.map(r => (
                                                    <option key={r.value} value={r.value}>{r.label}</option>
                                                ))}
                                            </select>
                                            {errors.role && <p className="text-red-500 text-[10px] mt-1">{errors.role}</p>}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Status Kepegawaian</label>
                                            <select value={data.status} onChange={e => setData('status', e.target.value)} className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5">
                                                {statuses.map(s => (
                                                    <option key={s.value} value={s.value}>{s.label}</option>
                                                ))}
                                            </select>
                                            {errors.status && <p className="text-red-500 text-[10px] mt-1">{errors.status}</p>}
                                        </div>
                                        <div>
                                            <label className="block text-xs font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wider">Gaji Pokok (Rupiah)</label>
                                            <input 
                                                type="number" 
                                                value={data.basic_salary} 
                                                onChange={e => setData('basic_salary', e.target.value)} 
                                                required 
                                                min="0"
                                                className="mt-1 block w-full rounded-xl border-gray-300 dark:border-gray-700 shadow-sm focus:border-indigo-500 focus:ring focus:ring-indigo-200 dark:bg-gray-900 dark:text-white text-xs py-2.5" 
                                                placeholder="Contoh: 4500000"
                                            />
                                            {errors.basic_salary && <p className="text-red-500 text-[10px] mt-1">{errors.basic_salary}</p>}
                                        </div>
                                    </div>

                                    {editingUser && (
                                        <div className="bg-orange-50 dark:bg-orange-950/20 p-4 rounded-xl border border-orange-200/50 dark:border-orange-800/40 flex items-center space-x-3">
                                            <KeyIcon className="w-6 h-6 text-orange-500 shrink-0" />
                                            <div className="flex-1 min-w-0">
                                                <p className="text-xs font-bold text-orange-800 dark:text-orange-400">Reset ke Password Default</p>
                                                <p className="text-[10px] text-orange-600 dark:text-orange-500 mt-0.5">Centang ini untuk mengembalikan password akun menjadi "password".</p>
                                            </div>
                                            <input 
                                                type="checkbox" 
                                                checked={data.reset_password_default}
                                                onChange={e => setData('reset_password_default', e.target.checked)}
                                                className="w-5 h-5 text-indigo-600 rounded-lg border-slate-300 focus:ring-indigo-500 shrink-0"
                                            />
                                        </div>
                                    )}
                                    {!editingUser && (
                                        <p className="text-[10px] text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-900/50 p-3 rounded-xl text-center border border-dashed border-slate-200 dark:border-slate-700">
                                            Kata sandi default untuk akun baru adalah <strong>"password"</strong>.
                                        </p>
                                    )}
                                </div>
                                <div className="bg-slate-50 dark:bg-gray-700/60 px-6 py-4 flex flex-row-reverse gap-2 border-t border-slate-200 dark:border-gray-600">
                                    <button type="submit" disabled={processing} className="inline-flex justify-center rounded-xl px-4 py-2 bg-indigo-600 text-xs font-bold text-white hover:bg-indigo-700 transition-colors disabled:opacity-50 shadow-md shadow-indigo-600/10">
                                        {processing ? 'Menyimpan...' : 'Simpan Karyawan'}
                                    </button>
                                    <button type="button" onClick={closeDialog} className="inline-flex justify-center rounded-xl border border-slate-300 dark:border-gray-600 px-4 py-2 bg-white dark:bg-gray-800 text-xs font-semibold text-slate-700 dark:text-gray-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors">
                                        Batal
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </AuthenticatedLayout>
    );
}
