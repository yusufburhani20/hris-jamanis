import InputError from '@/Components/InputError';
import InputLabel from '@/Components/InputLabel';
import PrimaryButton from '@/Components/PrimaryButton';
import TextInput from '@/Components/TextInput';
import { Transition } from '@headlessui/react';
import { Link, useForm, usePage } from '@inertiajs/react';
import { FormEventHandler } from 'react';

export default function UpdateProfileInformation({
    mustVerifyEmail,
    status,
    className = '',
}: {
    mustVerifyEmail: boolean;
    status?: string;
    className?: string;
}) {
    const user = usePage().props.auth.user;

    const { data, setData, post, errors, processing, recentlySuccessful } =
        useForm<{
            _method: string;
            name: string;
            email: string;
            phone: string;
            telegram_id: string;
            nip: string;
            avatar: File | null;
        }>({
            _method: 'patch',
            name: user.name,
            email: user.email,
            phone: user.phone || '',
            telegram_id: user.telegram_id || '',
            nip: user.nip || '',
            avatar: null,
        });

    const submit: FormEventHandler = (e) => {
        e.preventDefault();

        post(route('profile.update'), { preserveScroll: true });
    };

    return (
        <section className={className}>
            <header>
                <h2 className="text-lg font-medium text-gray-900 dark:text-gray-100">
                    Profile Information
                </h2>

                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">
                    Update your account's profile information and email address.
                </p>
            </header>

            <form onSubmit={submit} className="mt-6 space-y-6" encType="multipart/form-data">
                {/* Avatar / Profile Photo Upload */}
                <div className="flex items-center gap-6">
                    <div className="shrink-0">
                        {data.avatar ? (
                            <img src={URL.createObjectURL(data.avatar)} alt="Avatar preview" className="object-cover w-16 h-16 rounded-full border border-gray-200 shadow-sm" />
                        ) : user.avatar_url ? (
                            <img src={user.avatar_url} alt="Current Avatar" className="object-cover w-16 h-16 rounded-full border border-gray-200 shadow-sm" />
                        ) : (
                            <div className="flex items-center justify-center w-16 h-16 rounded-full bg-indigo-100 text-indigo-600 font-bold text-xl border border-gray-200 shadow-sm">
                                {user.name.charAt(0)}
                            </div>
                        )}
                    </div>
                    <div>
                        <InputLabel htmlFor="avatar" value="Profile Photo (Optional)" />
                        <input
                            id="avatar"
                            type="file"
                            accept="image/*"
                            className="mt-1 block w-full text-sm text-slate-500
                                file:mr-4 file:py-2 file:px-4
                                file:rounded-full file:border-0
                                file:text-sm file:font-semibold
                                file:bg-indigo-50 file:text-indigo-700
                                hover:file:bg-indigo-100 dark:file:bg-indigo-900/50 dark:file:text-indigo-300 dark:text-slate-400"
                            onChange={(e) => setData('avatar', e.target.files ? e.target.files[0] : null)}
                        />
                        <InputError className="mt-2" message={errors.avatar} />
                    </div>
                </div>

                <div>
                    <InputLabel htmlFor="name" value="Name" />

                    <TextInput
                        id="name"
                        className="mt-1 block w-full"
                        value={data.name}
                        onChange={(e) => setData('name', e.target.value)}
                        required
                        isFocused
                        autoComplete="name"
                    />

                    <InputError className="mt-2" message={errors.name} />
                </div>

                <div>
                    <InputLabel htmlFor="email" value="Email" />

                    <TextInput
                        id="email"
                        type="email"
                        className="mt-1 block w-full"
                        value={data.email}
                        onChange={(e) => setData('email', e.target.value)}
                        required
                        autoComplete="username"
                    />

                    <InputError className="mt-2" message={errors.email} />
                </div>

                <div>
                    <InputLabel htmlFor="nip" value="NIP / NUPTK" />
                    <TextInput
                        id="nip"
                        className="mt-1 block w-full"
                        value={data.nip}
                        onChange={(e) => setData('nip', e.target.value)}
                        autoComplete="off"
                    />
                    <InputError className="mt-2" message={errors.nip} />
                </div>

                <div>
                    <InputLabel htmlFor="phone" value="No. HP (Aktif)" />
                    <TextInput
                        id="phone"
                        className="mt-1 block w-full"
                        value={data.phone}
                        onChange={(e) => setData('phone', e.target.value)}
                        placeholder="08xxxxxxxxx"
                    />
                    <InputError className="mt-2" message={errors.phone} />
                </div>

                <div>
                    <InputLabel htmlFor="telegram_id" value="ID / No. Telegram" />
                    <TextInput
                        id="telegram_id"
                        className="mt-1 block w-full bg-slate-100 dark:bg-slate-800"
                        value={data.telegram_id}
                        onChange={(e) => setData('telegram_id', e.target.value)}
                        placeholder="@username atau Chat ID"
                        readOnly={!!user.telegram_id}
                    />
                    <p className="mt-1 text-xs text-slate-500">
                        {user.telegram_id 
                            ? "Sudah terhubung. Gunakan Bot Telegram untuk mengubah jika perlu." 
                            : "Akan terisi otomatis saat Anda melakukan verifikasi di Bot Telegram."}
                    </p>
                    <InputError className="mt-2" message={errors.telegram_id} />
                </div>

                {mustVerifyEmail && user.email_verified_at === null && (
                    <div>
                        <p className="mt-2 text-sm text-gray-800 dark:text-gray-200">
                            Your email address is unverified.
                            <Link
                                href={route('verification.send')}
                                method="post"
                                as="button"
                                className="rounded-md text-sm text-gray-600 underline hover:text-gray-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:text-gray-400 dark:hover:text-gray-100 dark:focus:ring-offset-gray-800"
                            >
                                Click here to re-send the verification email.
                            </Link>
                        </p>

                        {status === 'verification-link-sent' && (
                            <div className="mt-2 text-sm font-medium text-green-600 dark:text-green-400">
                                A new verification link has been sent to your
                                email address.
                            </div>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-4">
                    <PrimaryButton disabled={processing}>Save</PrimaryButton>

                    <Transition
                        show={recentlySuccessful}
                        enter="transition ease-in-out"
                        enterFrom="opacity-0"
                        leave="transition ease-in-out"
                        leaveTo="opacity-0"
                    >
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                            Saved.
                        </p>
                    </Transition>
                </div>
            </form>
        </section>
    );
}
