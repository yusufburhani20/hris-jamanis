import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head, useForm } from '@inertiajs/react';
import React, { useState } from 'react';
import { MapPinIcon, PlusIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';

interface Geofence {
    id: number;
    name: string;
    latitude: number;
    longitude: number;
    radius: number;
    is_active: boolean;
    work_start_time: string | null;
    work_end_time: string | null;
}

export default function GeofenceIndex({ auth, geofences }: PageProps<{ geofences: Geofence[] }>) {
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [editingGeofence, setEditingGeofence] = useState<Geofence | null>(null);

    const { data, setData, post, put, delete: destroy, reset, processing, errors } = useForm({
        name: '',
        latitude: '',
        longitude: '',
        radius: 100,
        is_active: true,
        work_start_time: '',
        work_end_time: '',
    });

    const openDialog = (geofence?: Geofence) => {
        if (geofence) {
            setEditingGeofence(geofence);
            setData({
                name: geofence.name,
                latitude: String(geofence.latitude),
                longitude: String(geofence.longitude),
                radius: geofence.radius,
                is_active: geofence.is_active,
                work_start_time: geofence.work_start_time || '',
                work_end_time: geofence.work_end_time || '',
            });
        } else {
            setEditingGeofence(null);
            reset();
        }
        setIsDialogOpen(true);
    };

    const closeDialog = () => {
        setIsDialogOpen(false);
        reset();
    };

    const submit = (e: React.FormEvent) => {
        e.preventDefault();
        if (editingGeofence) {
            put(route('admin.geofences.update', editingGeofence.id), {
                onSuccess: () => closeDialog(),
            });
        } else {
            post(route('admin.geofences.store'), {
                onSuccess: () => closeDialog(),
            });
        }
    };

    const handleDelete = (id: number) => {
        if (confirm('Are you sure you want to delete this geofence location?')) {
            destroy(route('admin.geofences.destroy', id));
        }
    };

    return (
        <AuthenticatedLayout
            header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Geofences</h2>}
        >
            <Head title="Geofences" />

            <div className="py-12">
                <div className="max-w-7xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    <div className="flex justify-between items-center">
                        <p className="text-gray-600 dark:text-gray-400">Configure valid locations for Check-In/Check-Out</p>
                        <button
                            onClick={() => openDialog()}
                            className="bg-primary hover:bg-primary-hover text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                        >
                            <PlusIcon className="w-5 h-5" />
                            <span>Add Location</span>
                        </button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {geofences.map((gf) => (
                            <div key={gf.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col justify-between hover:shadow-md transition-shadow">
                                <div>
                                    <div className="flex justify-between items-start mb-4">
                                        <div className="flex items-center space-x-3">
                                            <div className={`p-2 rounded-lg ${gf.is_active ? 'bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400'}`}>
                                                <MapPinIcon className="w-6 h-6" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-bold text-gray-900 dark:text-white">{gf.name}</h3>
                                                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${gf.is_active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                    {gf.is_active ? 'Active' : 'Inactive'}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400 mb-6">
                                        <p><span className="font-medium text-gray-800 dark:text-gray-200">Lat:</span> {gf.latitude}</p>
                                        <p><span className="font-medium text-gray-800 dark:text-gray-200">Lng:</span> {gf.longitude}</p>
                                        <p><span className="font-medium text-gray-800 dark:text-gray-200">Radius:</span> {gf.radius} meters</p>
                                        <p><span className="font-medium text-gray-800 dark:text-gray-200">Jam Masuk:</span> {gf.work_start_time || '-'}</p>
                                        <p><span className="font-medium text-gray-800 dark:text-gray-200">Jam Keluar:</span> {gf.work_end_time || '-'}</p>
                                    </div>
                                </div>
                                <div className="flex justify-end space-x-2 border-t dark:border-gray-700 pt-4 mt-4">
                                    <button onClick={() => openDialog(gf)} className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 p-2">
                                        <PencilIcon className="w-5 h-5" />
                                    </button>
                                    <button onClick={() => handleDelete(gf.id)} className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-2">
                                        <TrashIcon className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {geofences.length === 0 && (
                            <div className="col-span-full py-12 text-center text-gray-500 dark:text-gray-400">
                                No geofence configured yet. Users won't be restricted by location.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Dialog Form */}
            {isDialogOpen && (
                <div className="fixed inset-0 z-50 overflow-y-auto" aria-labelledby="modal-title" role="dialog" aria-modal="true">
                    <div className="flex items-end justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" aria-hidden="true" onClick={closeDialog}></div>
                        <span className="hidden sm:inline-block sm:align-middle sm:h-screen" aria-hidden="true">&#8203;</span>
                        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-xl text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg w-full">
                            <form onSubmit={submit}>
                                <div className="bg-white dark:bg-gray-800 px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                                    <div className="sm:flex sm:items-start">
                                        <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                            <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white" id="modal-title">
                                                {editingGeofence ? 'Edit Geofence' : 'New Geofence'}
                                            </h3>
                                            <div className="mt-4 space-y-4">
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name / Title</label>
                                                    <input type="text" value={data.name} onChange={e => setData('name', e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white" placeholder="Main Campus" />
                                                    {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Latitude</label>
                                                        <input type="text" value={data.latitude} onChange={e => setData('latitude', e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white" placeholder="-6.200000" />
                                                        {errors.latitude && <p className="text-red-500 text-xs mt-1">{errors.latitude}</p>}
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Longitude</label>
                                                        <input type="text" value={data.longitude} onChange={e => setData('longitude', e.target.value)} required className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white" placeholder="106.816666" />
                                                        {errors.longitude && <p className="text-red-500 text-xs mt-1">{errors.longitude}</p>}
                                                    </div>
                                                </div>
                                                <div>
                                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Radius (meters)</label>
                                                    <input type="number" value={data.radius} onChange={e => setData('radius', parseInt(e.target.value))} required min="1" className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                                                    {errors.radius && <p className="text-red-500 text-xs mt-1">{errors.radius}</p>}
                                                </div>
                                                <div className="grid grid-cols-2 gap-4">
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jam Masuk</label>
                                                        <input type="time" value={data.work_start_time} onChange={e => setData('work_start_time', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                                                        {errors.work_start_time && <p className="text-red-500 text-xs mt-1">{errors.work_start_time}</p>}
                                                    </div>
                                                    <div>
                                                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Jam Keluar</label>
                                                        <input type="time" value={data.work_end_time} onChange={e => setData('work_end_time', e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 dark:bg-gray-900 dark:border-gray-700 dark:text-white" />
                                                        {errors.work_end_time && <p className="text-red-500 text-xs mt-1">{errors.work_end_time}</p>}
                                                    </div>
                                                </div>
                                                <div className="flex items-center">
                                                    <input type="checkbox" checked={data.is_active} onChange={e => setData('is_active', e.target.checked)} id="is_active" className="rounded border-gray-300 text-primary shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 dark:bg-gray-900 dark:border-gray-700" />
                                                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900 dark:text-gray-300">Active Location</label>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="bg-gray-50 dark:bg-gray-700 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse border-t border-gray-200 dark:border-gray-600">
                                    <button type="submit" disabled={processing} className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-primary text-base font-medium text-white hover:bg-primary-hover focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50">
                                        {processing ? 'Saving...' : 'Save Configuration'}
                                    </button>
                                    <button type="button" onClick={closeDialog} className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm dark:bg-gray-800 dark:text-gray-300 dark:border-gray-600 dark:hover:bg-gray-700">
                                        Cancel
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
