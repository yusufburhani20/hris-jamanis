import React, { useState, useRef, useEffect, useCallback } from 'react';
import { useForm } from '@inertiajs/react';
import { MapPinIcon, CameraIcon, CheckCircleIcon, ArrowPathIcon } from '@heroicons/react/24/outline';
import { addToOfflineQueue } from '../utils/offlineStore';

export default function AttendanceScanner({ existingRecord, geofences = [] }: { existingRecord?: any, geofences?: any[] }) {
    const [location, setLocation] = useState<{ lat: number, lng: number } | null>(null);
    const [locationError, setLocationError] = useState<string | null>(null);
    const [isRefreshingLocation, setIsRefreshingLocation] = useState(false);
    
    // Geofence validation state
    const [nearestGeofence, setNearestGeofence] = useState<{ name: string, distance: number, radius: number, valid: boolean } | null>(null);
    const [localSuccessMessage, setLocalSuccessMessage] = useState<string | null>(null);
    
    const mapContainerRef = useRef<HTMLDivElement>(null);
    const mapRef = useRef<any>(null);
    const userMarkerRef = useRef<any>(null);
    const circlesRef = useRef<any[]>([]);
    
    // Haversine Distance helper
    const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371000; // meters
        const dLat = (lat2 - lat1) * Math.PI / 180;
        const dLon = (lon2 - lon1) * Math.PI / 180;
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    };
    
    // Webcam states
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const streamRef = useRef<MediaStream | null>(null); // Use ref so cleanup always gets fresh value
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);
    const [cameraError, setCameraError] = useState<string | null>(null);
    
    const { data, setData, post, processing, errors } = useForm<{ latitude: string, longitude: string, photo: File | null, is_mocked: boolean }>({
        latitude: '',
        longitude: '',
        photo: null,
        is_mocked: false,
    });

    // Start Webcam
    const startCamera = async () => {
        setCameraError(null);
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({ 
                video: { facingMode: 'user' },
                audio: false 
            });
            streamRef.current = mediaStream; // store in ref for reliable cleanup
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err: any) {
            setCameraError("Kamera tidak dapat diakses: " + err.message);
        }
    };

    // Stop Webcam
    const stopCamera = () => {
        if (streamRef.current) {
            streamRef.current.getTracks().forEach(track => track.stop());
            streamRef.current = null;
            setStream(null);
        }
    };

    // Map Initialization Effect (runs once or when geofences load)
    useEffect(() => {
        if (typeof window === 'undefined' || !mapContainerRef.current) return;

        const L = (window as any).L;
        if (!L) return;

        const defaultLat = geofences[0] ? parseFloat(geofences[0].latitude) : -6.200000;
        const defaultLng = geofences[0] ? parseFloat(geofences[0].longitude) : 106.816666;

        // Clean up previous map if exists
        if (mapRef.current) {
            mapRef.current.remove();
            mapRef.current = null;
        }
        circlesRef.current = [];
        userMarkerRef.current = null;

        const map = L.map(mapContainerRef.current).setView([defaultLat, defaultLng], 14);
        mapRef.current = map;

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap'
        }).addTo(map);

        // Draw geofence circles
        geofences.forEach(gf => {
            const circle = L.circle([parseFloat(gf.latitude), parseFloat(gf.longitude)], {
                color: '#f43f5e', // Default red, turns green when inside
                fillColor: '#f43f5e',
                fillOpacity: 0.15,
                radius: gf.radius
            }).addTo(map).bindPopup(`<b>${gf.name}</b><br>Radius: ${gf.radius}m`);
            circlesRef.current.push({ id: gf.id, circle });
        });

        // If location is already available on mount
        if (location) {
            map.setView([location.lat, location.lng], 16);
            
            const userIcon = L.divIcon({
                html: `<div class="relative flex items-center justify-center">
                    <div class="absolute w-4 h-4 bg-indigo-600 rounded-full border-2 border-white shadow-lg animate-ping"></div>
                    <div class="relative w-4 h-4 bg-indigo-600 rounded-full border-2 border-white shadow-lg"></div>
                </div>`,
                className: '',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            userMarkerRef.current = L.marker([location.lat, location.lng], { icon: userIcon })
                .addTo(map)
                .bindPopup("<b>Posisi Anda saat ini</b>");

            circlesRef.current.forEach(({ id, circle }) => {
                const gf = geofences.find(g => g.id === id);
                if (gf) {
                    const dist = calculateDistance(location.lat, location.lng, parseFloat(gf.latitude), parseFloat(gf.longitude));
                    const isValid = dist <= gf.radius;
                    circle.setStyle({
                        color: isValid ? '#10b981' : '#f43f5e',
                        fillColor: isValid ? '#10b981' : '#f43f5e'
                    });
                    circle.setPopupContent(`<b>${gf.name}</b><br>Radius: ${gf.radius}m<br>Jarak: ${Math.round(dist)}m`);
                }
            });
        }

        return () => {
            if (mapRef.current) {
                mapRef.current.remove();
                mapRef.current = null;
            }
            circlesRef.current = [];
            userMarkerRef.current = null;
        };
    }, [geofences]);

    // Map Location Update Effect (updates marker and geofences style)
    useEffect(() => {
        const map = mapRef.current;
        if (!map || !location) return;

        const L = (window as any).L;
        if (!L) return;

        // Update/Create user marker
        if (!userMarkerRef.current) {
            const userIcon = L.divIcon({
                html: `<div class="relative flex items-center justify-center">
                    <div class="absolute w-4 h-4 bg-indigo-600 rounded-full border-2 border-white shadow-lg animate-ping"></div>
                    <div class="relative w-4 h-4 bg-indigo-600 rounded-full border-2 border-white shadow-lg"></div>
                </div>`,
                className: '',
                iconSize: [16, 16],
                iconAnchor: [8, 8]
            });

            userMarkerRef.current = L.marker([location.lat, location.lng], { icon: userIcon })
                .addTo(map)
                .bindPopup("<b>Posisi Anda saat ini</b>");
        } else {
            userMarkerRef.current.setLatLng([location.lat, location.lng]);
        }

        // Center on user position
        map.setView([location.lat, location.lng], 16);

        // Update geofence circles
        circlesRef.current.forEach(({ id, circle }) => {
            const gf = geofences.find(g => g.id === id);
            if (gf) {
                const dist = calculateDistance(location.lat, location.lng, parseFloat(gf.latitude), parseFloat(gf.longitude));
                const isValid = dist <= gf.radius;
                circle.setStyle({
                    color: isValid ? '#10b981' : '#f43f5e',
                    fillColor: isValid ? '#10b981' : '#f43f5e'
                });
                circle.setPopupContent(`<b>${gf.name}</b><br>Radius: ${gf.radius}m<br>Jarak: ${Math.round(dist)}m`);
            }
        });
    }, [location]);

    const refreshLocation = useCallback(() => {
        setIsRefreshingLocation(true);
        setLocationError(null);
        
        if (!navigator.geolocation) {
            setLocationError("Browser ini tidak mendukung Geolocation.");
            setIsRefreshingLocation(false);
            return;
        }
        
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const isMocked = (position.coords as any).mocked || (position as any).mocked || false;
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                setLocation({ lat, lng });
                
                if (geofences.length > 0) {
                    let closest = null;
                    let minInfo = null;
                    
                    for (const gf of geofences) {
                        const d = calculateDistance(lat, lng, parseFloat(gf.latitude), parseFloat(gf.longitude));
                        if (closest === null || d < closest) {
                            closest = d;
                            minInfo = { name: gf.name, distance: d, radius: gf.radius, valid: d <= gf.radius };
                        }
                    }
                    setNearestGeofence(minInfo);
                } else {
                    setNearestGeofence({ name: 'Tanpa Pembatasan', distance: 0, radius: 999999, valid: true });
                }

                setData(d => ({
                    ...d,
                    latitude: String(lat),
                    longitude: String(lng),
                    is_mocked: isMocked
                }));
                
                setIsRefreshingLocation(false);
            },
            (error) => {
                setLocationError("Gagal mendapatkan lokasi GPS: " + error.message);
                setIsRefreshingLocation(false);
            },
            { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
        );
    }, [geofences, setData]);

    useEffect(() => {
        refreshLocation();

        // Only start camera if not already fully checked out
        const isCheckedOut = existingRecord && existingRecord.check_out;
        if (!isCheckedOut) {
            startCamera();
        }

        return () => {
            // Use streamRef (not stream state) so this cleanup always sees the latest value
            if (streamRef.current) {
                streamRef.current.getTracks().forEach(track => track.stop());
                streamRef.current = null;
            }
        };
    }, [refreshLocation]);

    const capturePhoto = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;
            
            // Set canvas size to match video
            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;
            
            const context = canvas.getContext('2d');
            if (context) {
                context.drawImage(video, 0, 0, canvas.width, canvas.height);
                
                // Convert to dataUrl for preview
                const dataUrl = canvas.toDataURL('image/jpeg', 0.8);
                setPhotoPreview(dataUrl);
                
                // Convert to File for form submission
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], "selfie.jpg", { type: "image/jpeg" });
                        setData('photo', file);
                    }
                }, 'image/jpeg', 0.8);
                
                // Stop camera stream instantly after taking photo
                stopCamera();
            }
        }
    }, [stream]);

    const retakePhoto = (e: React.MouseEvent) => {
        e.preventDefault();
        setPhotoPreview(null);
        setData('photo', null);
        startCamera();
    };

    const submit = (type: 'checkIn' | 'checkOut') => async (e: React.FormEvent) => {
        e.preventDefault();

        // Fallback to offline queue if client is offline
        if (!navigator.onLine) {
            const now = new Date();
            const year = now.getFullYear();
            const month = String(now.getMonth() + 1).padStart(2, '0');
            const day = String(now.getDate()).padStart(2, '0');
            const hours = String(now.getHours()).padStart(2, '0');
            const minutes = String(now.getMinutes()).padStart(2, '0');
            const seconds = String(now.getSeconds()).padStart(2, '0');
            const localDeviceTime = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;

            const offlinePayload = {
                type: type === 'checkIn' ? 'check-in' as const : 'check-out' as const,
                latitude: parseFloat(data.latitude),
                longitude: parseFloat(data.longitude),
                photo_base64: photoPreview || undefined,
                offline_device_time: localDeviceTime,
                is_mocked: data.is_mocked,
            };

            try {
                await addToOfflineQueue(offlinePayload);
                setLocalSuccessMessage(`Absensi ${type === 'checkIn' ? 'masuk' : 'pulang'} berhasil disimpan secara lokal karena Anda sedang offline. Data akan disinkronkan saat koneksi internet kembali normal.`);
                stopCamera();
                return;
            } catch (err: any) {
                alert("Gagal menyimpan absensi offline: " + err.message);
                return;
            }
        }

        const routeName = type === 'checkIn' ? 'attendances.check-in' : 'attendances.check-out';
        post(route(routeName), {
            preserveScroll: true,
            onSuccess: () => {
                // If it was a success, we should restart the camera if they need to check out later
                if (type === 'checkIn') {
                    setPhotoPreview(null);
                    setData('photo', null);
                    startCamera();
                }
            }
        });
    };

    const isCheckedIn = existingRecord && existingRecord.check_in;
    const isCheckedOut = existingRecord && existingRecord.check_out;

    if (localSuccessMessage) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 text-center h-full flex flex-col justify-center items-center space-y-4 shadow-md transition-shadow">
                <CheckCircleIcon className="w-16 h-16 text-emerald-500 animate-bounce" />
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Absensi Disimpan</h3>
                    <p className="text-gray-600 dark:text-gray-400 mt-2 text-sm leading-relaxed">{localSuccessMessage}</p>
                </div>
                <button
                    onClick={() => {
                        setLocalSuccessMessage(null);
                        setPhotoPreview(null);
                        setData('photo', null);
                        startCamera();
                    }}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                >
                    Kembali ke Pemindai
                </button>
            </div>
        );
    }

    if (isCheckedOut) {
        return (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 text-center h-full flex flex-col justify-center items-center space-y-4 shadow-md transition-shadow">
                <CheckCircleIcon className="w-16 h-16 text-emerald-500" />
                <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">Presensi Selesai</h3>
                    <p className="text-gray-500 dark:text-gray-400 mt-2">Anda telah menyelesaikan Check-In dan Check-Out hari ini.</p>
                </div>
            </div>
        );
    }

    return (
        <form onSubmit={submit(isCheckedIn ? 'checkOut' : 'checkIn')} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 p-6 flex flex-col h-full shadow-md transition-shadow">
            <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-4 border-b pb-4 dark:border-gray-700 flex justify-between items-center">
                <span>{isCheckedIn ? 'Check-Out (Pulang)' : 'Check-In (Hadir)'} - Jendela Pemindai</span>
                {isCheckedIn && <span className="text-xs bg-indigo-100 text-indigo-800 dark:bg-indigo-900/50 dark:text-indigo-300 px-2 py-1 rounded-full">Telah Hadir: {existingRecord.check_in}</span>}
            </h3>
            
            <div className="flex-1 flex flex-col space-y-4">
                {/* Geofence Status Badge */}
                {location && nearestGeofence && (
                    <div className={`flex items-center justify-between p-3 rounded-lg border transition-all ${nearestGeofence.valid ? 'bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-900/20 dark:border-emerald-800 dark:text-emerald-400 font-bold' : 'bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-900/40 dark:border-rose-800 dark:text-rose-400 animate-pulse'}`}>
                        <div className="flex items-center">
                            <MapPinIcon className="w-5 h-5 mr-2" />
                            <span className="text-sm">{nearestGeofence.name}</span>
                        </div>
                        <div className="text-right">
                            <div className="text-xs uppercase opacity-80">{nearestGeofence.valid ? 'Area Terdeteksi' : 'Di Luar Area'}</div>
                            <div className="text-[10px] sm:text-xs">Jarak: {Math.round(nearestGeofence.distance)}m (Maks: {nearestGeofence.radius}m)</div>
                        </div>
                    </div>
                )}

                {/* Leaflet Interactive Map */}
                <div className="relative rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner z-10">
                    <div 
                        ref={mapContainerRef} 
                        className="w-full h-[180px]"
                        style={{ minHeight: '150px' }}
                    />
                    <div className="absolute top-2 right-2 z-[400] bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm text-[10px] font-bold px-2 py-1 rounded shadow-sm dark:text-white border dark:border-gray-700">
                        Peta Lokasi & Geofence
                    </div>
                    {location && (
                        <button
                            type="button"
                            onClick={refreshLocation}
                            disabled={isRefreshingLocation}
                            className="absolute bottom-2 right-2 z-[400] flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400 text-white text-[10px] sm:text-xs font-bold rounded-lg shadow-md transition-all active:scale-95"
                        >
                            {isRefreshingLocation ? (
                                <>
                                    <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                                    <span>Mengakuratkan...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                                    <span>Akuratkan GPS</span>
                                </>
                            )}
                        </button>
                    )}
                    {!location && (
                        <div className="absolute inset-0 bg-slate-900/30 backdrop-blur-[1px] flex items-center justify-center pointer-events-none">
                            <span className="text-xs bg-slate-900/80 dark:bg-gray-800/90 text-white dark:text-gray-200 px-3 py-1.5 rounded-lg shadow-md font-medium text-center max-w-[80%]">
                                GPS Memuat / Diblokir. Harap izinkan akses lokasi GPS.
                            </span>
                        </div>
                    )}
                </div>

                {/* Location Status Badge (Only if no lock yet) */}
                {!location && (
                    <div className={`flex items-center justify-center p-3 rounded-lg border ${locationError ? 'bg-red-50 border-red-200 text-red-700 dark:bg-red-900/20 dark:border-red-800 dark:text-red-400' : 'bg-gray-50 border-gray-200 text-gray-600 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'}`}>
                        {locationError ? (
                            <div className="flex flex-col items-center">
                                <div className="flex items-center">
                                    <MapPinIcon className="w-5 h-5 mr-2" />
                                    <span className="text-sm font-semibold">GPS Gagal</span>
                                </div>
                                <span className="text-xs mt-1 opacity-80">{locationError}</span>
                            </div>
                        ) : (
                            <>
                                <div className="animate-spin rounded-full h-4 w-4 border-2 border-current border-t-transparent mr-2"></div>
                                <span className="text-sm font-medium">Mencari Koordinat Lokasi Presensi...</span>
                            </>
                        )}
                    </div>
                )}

                {/* Camera Viewfinder */}
                <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center rounded-xl relative overflow-hidden bg-black shadow-inner border border-gray-200 dark:border-gray-700 group">
                    {cameraError && !photoPreview ? (
                        <div className="text-red-500 text-center p-4">
                            <CameraIcon className="w-10 h-10 mx-auto mb-2 opacity-50" />
                            <p className="text-sm font-medium">{cameraError}</p>
                            <p className="text-xs mt-2 text-gray-400">Pastikan Anda memberi izin akses kamera pada browser.</p>
                            <button onClick={(e) => { e.preventDefault(); startCamera(); }} className="mt-4 px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-white text-sm transition-colors border border-white/20">Coba Ulang Kamera</button>
                        </div>
                    ) : (
                        <>
                            {/* Live Video Feed (Hidden if preview exists) */}
                            <video 
                                ref={videoRef} 
                                autoPlay 
                                playsInline 
                                muted 
                                className={`w-full h-full object-cover absolute inset-0 \${photoPreview ? 'hidden' : 'block'}`}
                            ></video>
                            
                            {/* Canvas for processing (Always hidden) */}
                            <canvas ref={canvasRef} className="hidden"></canvas>
                            
                            {/* Photo Preview (Hidden if live feed) */}
                            {photoPreview && (
                                <img src={photoPreview} alt="Selfie Preview" className="w-full h-full object-cover absolute inset-0" />
                            )}

                            {/* Camera Overlay Controls */}
                            <div className="absolute bottom-4 left-0 right-0 flex justify-center z-10 space-x-4">
                                {!photoPreview ? (
                                    <button 
                                        type="button" 
                                        onClick={capturePhoto} 
                                        disabled={!!cameraError}
                                        className="bg-white/20 hover:bg-white/40 backdrop-blur-md border border-white/50 p-4 rounded-full shadow-lg transition-all focus:outline-none focus:ring-2 focus:ring-white focus:ring-offset-2 disabled:opacity-0"
                                    >
                                        <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center">
                                            <CameraIcon className="w-6 h-6 text-indigo-600" />
                                        </div>
                                    </button>
                                ) : (
                                    <button 
                                        type="button" 
                                        onClick={retakePhoto}
                                        className="bg-gray-900/80 hover:bg-gray-800 backdrop-blur-md border border-gray-600 px-4 py-2 rounded-full text-white text-sm font-semibold shadow-lg transition-all flex items-center space-x-2"
                                    >
                                        <ArrowPathIcon className="w-4 h-4" />
                                        <span>Ulangi Foto</span>
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>
                
                {errors.photo && <p className="text-red-500 text-xs text-center font-semibold">Peringatan: {errors.photo}</p>}
                {errors.latitude && <p className="text-red-500 text-xs text-center font-semibold">Peringatan: Anda belum terdeteksi oleh GPS (Lokasi Wajib).</p>}
            </div>

            <button 
                type="submit" 
                disabled={processing || !location || !photoPreview || !nearestGeofence?.valid}
                className="mt-6 w-full py-4 px-4 bg-primary hover:bg-primary-hover disabled:bg-gray-300 dark:disabled:bg-gray-700 disabled:text-gray-500 disabled:cursor-not-allowed text-white rounded-xl font-bold shadow-lg transition-all flex justify-center items-center space-x-2 text-lg lg:text-xl active:scale-[0.98]"
            >
                {processing ? (
                    <>
                        <div className="animate-spin rounded-full h-5 w-5 border-2 border-white border-t-transparent"></div>
                        <span>Merekam Kehadiran...</span>
                    </>
                ) : (
                    <span>{isCheckedIn ? 'Kirim Absen Pulang (Check-Out)' : 'Kirim Absen Masuk (Check-In)'}</span>
                )}
            </button>
        </form>
    );
}
