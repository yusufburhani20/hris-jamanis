import { PageProps } from '@/types';
import AuthenticatedLayout from '@/Layouts/AuthenticatedLayout';
import { Head } from '@inertiajs/react';
import AttendanceScanner from '@/Components/AttendanceScanner';
import { MapPinIcon } from '@heroicons/react/24/outline';

export default function Scanner({ auth, todayAttendance, geofences }: PageProps<{ todayAttendance: any; geofences: any[] }>) {
    return (
        <AuthenticatedLayout header={<h2 className="font-semibold text-xl text-gray-800 dark:text-gray-200 leading-tight">Absensi Geolocation</h2>}>
            <Head title="Absensi Geolocation" />

            <div className="py-12">
                <div className="max-w-3xl mx-auto sm:px-6 lg:px-8 space-y-6">
                    <div className="bg-gradient-to-br from-indigo-600 to-violet-700 rounded-xl p-6 text-white shadow-lg relative overflow-hidden">
                        <div className="relative z-10">
                            <h3 className="text-2xl font-bold mb-2 flex items-center">
                                <MapPinIcon className="w-6 h-6 mr-2" />
                                Presensi Kehadiran Harian
                            </h3>
                            <p className="text-indigo-100 max-w-xl">
                                Harap pastikan lokasi (GPS) pada perangkat Anda telah menyala dan Anda berada di dalam radius zona Geofence kampus/sekolah untuk dapat melakukan check-in dan check-out harian.
                            </p>
                        </div>
                        <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-2 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700">
                        {/* Attendance Scanner Component is designed to take the full width/height of its container */}
                        <div className="max-w-md mx-auto py-4">
                            <AttendanceScanner existingRecord={todayAttendance} geofences={geofences} />
                        </div>
                    </div>
                </div>
            </div>
        </AuthenticatedLayout>
    );
}
