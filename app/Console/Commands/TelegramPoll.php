<?php

namespace App\Console\Commands;

use Illuminate\Console\Command;
use Illuminate\Support\Facades\Http;
use App\Http\Controllers\TelegramController;
use Illuminate\Http\Request;

class TelegramPoll extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'telegram:poll';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Poll Telegram for updates (Local Testing Only)';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $token = config('services.telegram.bot_token');
        if (empty($token)) {
            $this->error('TELEGRAM_BOT_TOKEN tidak ditemukan di .env');
            return;
        }

        $this->info('Memulai pemantauan Bot Telegram... (Tekan Ctrl+C untuk berhenti)');
        
        $offset = 0;
        $baseUrl = "https://api.telegram.org/bot{$token}";

        // Hapus Webhook jika ada (karena Poll tidak jalan jika Webhook aktif)
        Http::get("{$baseUrl}/deleteWebhook");

        while (true) {
            try {
                $response = Http::get("{$baseUrl}/getUpdates", [
                    'offset' => $offset,
                    'timeout' => 30
                ]);

                if ($response->successful()) {
                    $updates = $response->json()['result'];

                    foreach ($updates as $update) {
                        $this->info('Pesan baru diterima: ID ' . $update['update_id']);
                        
                        // Gunakan Request::create agar data benar-benar terbaca oleh controller
                        $request = Request::create('/webhook/telegram', 'POST', $update);
                        
                        // Bind request ke container agar controller bisa mengambilnya
                        app()->instance('request', $request);

                        $controller = app(TelegramController::class);
                        $controller->handle($request);

                        $offset = $update['update_id'] + 1;
                    }
                }
            } catch (\Exception $e) {
                $this->error('Terjadi kesalahan: ' . $e->getMessage());
                sleep(2);
            }
        }
    }
}
