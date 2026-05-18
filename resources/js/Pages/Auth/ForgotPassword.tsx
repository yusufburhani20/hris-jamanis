import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import GuestLayout from '@/Layouts/GuestLayout';
import { Head, Link, useForm } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function ForgotPassword({ status }: { status?: string }) {
    const { data, setData, post, processing, errors } = useForm({
        email: '',
    });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('password.email'));
    };

    return (
        <GuestLayout>
            <Head title="Lupa Kata Sandi" />

            <div className="mb-6 text-center">
                <h1 className="text-4xl font-black text-indigo-600 dark:text-indigo-400 tracking-tighter mb-0.5">HRIS</h1>
                <p className="text-[9px] font-black tracking-widest text-slate-400 dark:text-slate-500 uppercase mb-2">
                    Human Resource Information System
                </p>
                <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wide">
                    Pemulihan Kata Sandi
                </p>
            </div>

            <div className="mb-6 text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                Lupa kata sandi Anda? Tidak masalah. Cukup beri tahu kami alamat email yang Anda gunakan
                untuk login, dan kami akan mengirimkan tautan untuk mengatur ulang kata sandi.
            </div>

            {status && (
                <div className="mb-4 text-sm font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/30 p-3 rounded-lg border border-green-100 dark:border-green-800">
                    {status}
                </div>
            )}

            <form onSubmit={submit}>
                <div>
                    <InputLabel htmlFor="email" value="Alamat Email" />
                    <TextInput
                        id="email"
                        type="email"
                        name="email"
                        value={data.email}
                        className="mt-1 block w-full"
                        isFocused={true}
                        onChange={(e) => setData('email', e.target.value)}
                        placeholder="contoh@domain.com"
                    />
                    <InputError message={errors.email} className="mt-2" />
                </div>

                <div className="mt-6 flex items-center justify-between">
                    <Link
                        href={route('login')}
                        className="text-sm text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 underline font-medium"
                    >
                        &larr; Kembali ke Login
                    </Link>

                    <PrimaryButton disabled={processing}>
                        Kirim Link Reset
                    </PrimaryButton>
                </div>
            </form>
        </GuestLayout>
    );
}
