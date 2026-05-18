import Checkbox from '@/Components/Checkbox';
import InputError from '@/Components/InputError';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler, useState } from 'react';

export default function Login({
    status,
    canResetPassword,
}: {
    status?: string;
    canResetPassword: boolean;
}) {
    const { data, setData, post, processing, errors, reset } = useForm({
        login: '',
        password: '',
        remember: false as boolean,
    });

    const [showPassword, setShowPassword] = useState(false);

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('login'), {
            onFinish: () => reset('password'),
        });
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4 font-sans relative overflow-hidden transition-colors">
            <Head title="Log in" />

            {/* Background Decorations */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 dark:bg-blue-500/5 rounded-full blur-3xl"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-violet-500/10 dark:bg-violet-500/5 rounded-full blur-3xl"></div>
            </div>

            <div className="flex flex-col md:flex-row w-full max-w-4xl bg-white dark:bg-slate-800 rounded-[2rem] shadow-2xl shadow-blue-500/10 dark:shadow-none border border-white/20 dark:border-slate-700/50 h-auto md:h-[500px] relative z-10 transition-colors">
                {/* Left Side - Welcome Panel */}
                <div className="w-full md:w-1/2 bg-blue-600 p-10 md:p-14 flex flex-col justify-center items-center text-center text-white rounded-t-[2rem] md:rounded-tr-none md:rounded-l-[2rem] relative isolate overflow-hidden">
                    {/* Decorative blobs inside left panel */}
                    <div className="absolute top-0 right-0 w-64 h-64 bg-cyan-400/20 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-400/20 rounded-full blur-3xl -ml-10 -mb-10 pointer-events-none" />

                    <h1 className="text-5xl md:text-6xl font-black mb-1 relative z-10 tracking-tighter text-center">HRIS</h1>
                    <p className="text-[10px] font-black tracking-[0.2em] mb-12 text-blue-100 uppercase text-center relative z-10">
                        Human Resource Information System
                    </p>
                    <Link
                        href={route('register')}
                        className="border border-white/50 text-white hover:bg-white hover:text-blue-700 transition-colors rounded-xl px-12 py-3 font-bold text-xs uppercase tracking-wider relative z-10 backdrop-blur-sm"
                    >
                        DAFTAR
                    </Link>
                </div>

                {/* Right Side - Login Form */}
                <div className="w-full md:w-1/2 p-10 md:p-14 flex flex-col justify-center bg-white dark:bg-slate-800 rounded-b-[2rem] md:rounded-bl-none md:rounded-r-[2rem] transition-colors">
                    <h2 className="text-3xl font-bold text-slate-800 dark:text-white mb-8 transition-colors">Sign In</h2>

                    {status && (
                        <div className="mb-4 text-sm font-medium text-emerald-600 dark:text-emerald-400">
                            {status}
                        </div>
                    )}

                    <form onSubmit={submit} className="flex flex-col gap-5">
                        <div>
                            <input
                                id="login"
                                type="text"
                                name="login"
                                value={data.login}
                                className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white focus:border-blue-600 focus:ring focus:ring-blue-600 focus:ring-opacity-20 px-4 py-3 placeholder-slate-400 dark:placeholder-slate-500 text-sm transition-all shadow-sm"
                                autoComplete="username"
                                placeholder="Email atau NIP"
                                onChange={(e) => setData('login', e.target.value)}
                                required
                            />
                            <InputError message={errors.login} className="mt-2" />
                        </div>

                        <div className="relative">
                            <input
                                id="password"
                                type={showPassword ? 'text' : 'password'}
                                name="password"
                                value={data.password}
                                className="block w-full rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900/50 text-slate-900 dark:text-white focus:border-blue-600 focus:ring focus:ring-blue-600 focus:ring-opacity-20 px-4 py-3 placeholder-slate-400 dark:placeholder-slate-500 text-sm transition-all shadow-sm"
                                autoComplete="current-password"
                                placeholder="Password"
                                onChange={(e) => setData('password', e.target.value)}
                                required
                            />
                            <button
                                type="button"
                                className="absolute inset-y-0 right-0 pr-3 flex items-center text-slate-400 hover:text-blue-600 transition-colors"
                                onClick={() => setShowPassword(!showPassword)}
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M3.98 8.223A10.477 10.477 0 001.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.45 10.45 0 0112 4.5c4.756 0 8.773 3.162 10.065 7.498a10.523 10.523 0 01-4.293 5.774M6.228 6.228L3 3m3.228 3.228l3.65 3.65m7.894 7.894L21 21m-3.228-3.228l-3.65-3.65m0 0a3 3 0 10-4.243-4.243m4.242 4.242L9.88 9.88" />
                                    </svg>
                                ) : (
                                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                    </svg>
                                )}
                            </button>
                        </div>
                        <InputError message={errors.password} className="mt-2" />


                        <div className="flex items-center justify-between mt-1">
                            <label className="flex items-center cursor-pointer group">
                                <Checkbox
                                    name="remember"
                                    checked={data.remember}
                                    className="text-blue-600 focus:ring-blue-600 bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-600 rounded-md w-4 h-4 transition-colors"
                                    onChange={(e) =>
                                        setData(
                                            'remember',
                                            (e.target.checked || false) as false,
                                        )
                                    }
                                />
                                <span className="ms-3 text-xs text-slate-500 dark:text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                                    Remember me
                                </span>
                            </label>

                            {canResetPassword && (
                                <Link
                                    href={route('password.request')}
                                    className="text-xs text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 underline decoration-1 underline-offset-[3px] transition-colors font-medium"
                                >
                                    Forgot password?
                                </Link>
                            )}
                        </div>

                        <div className="mt-8 flex flex-col gap-4">
                            <button
                                type="submit"
                                disabled={processing}
                                className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-12 py-3.5 font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 shadow-lg shadow-blue-600/30"
                            >
                                MASUK
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
