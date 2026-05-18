<?php

namespace App\Services;

use App\Models\Bill;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class MidtransService
{
    protected $serverKey;
    protected $isProduction;
    protected $baseUrl;

    /**
     * Payment method groups with their enabled_payments codes and fee structure.
     * Fee source: Midtrans official price list (Indonesia).
     */
    public const PAYMENT_METHODS = [
        'qris' => [
            'label'            => 'QRIS',
            'description'      => 'Bayar dengan scan QR — semua e-wallet & m-banking',
            'enabled_payments' => ['qris'],
            'fee_type'         => 'percent',
            'fee_value'        => 0.7,
            'icon'             => 'qris',
        ],
        'gopay' => [
            'label'            => 'GoPay',
            'description'      => 'Bayar menggunakan saldo GoPay / Gojek',
            'enabled_payments' => ['gopay'],
            'fee_type'         => 'percent',
            'fee_value'        => 2.0,
            'icon'             => 'gopay',
        ],
        'shopeepay' => [
            'label'            => 'ShopeePay',
            'description'      => 'Bayar menggunakan saldo ShopeePay',
            'enabled_payments' => ['shopeepay'],
            'fee_type'         => 'percent',
            'fee_value'        => 2.0,
            'icon'             => 'shopeepay',
        ],
        'bank_transfer' => [
            'label'            => 'Transfer Bank (VA)',
            'description'      => 'BCA, BNI, BRI, Mandiri, Permata Virtual Account',
            'enabled_payments' => ['bca_va', 'bni_va', 'bri_va', 'other_va', 'permata_va', 'echannel'],
            'fee_type'         => 'fixed',
            'fee_value'        => 4000,
            'icon'             => 'bank',
        ],
        'cstore' => [
            'label'            => 'Gerai (Alfamart / Indomaret)',
            'description'      => 'Bayar tunai di kasir Alfamart atau Indomaret terdekat',
            'enabled_payments' => ['alfamart', 'indomaret'],
            'fee_type'         => 'fixed',
            'fee_value'        => 5000,
            'icon'             => 'store',
        ],
    ];

    public function __construct()
    {
        $this->serverKey   = env('MIDTRANS_SERVER_KEY');
        $this->isProduction = env('MIDTRANS_IS_PRODUCTION', false);
        $this->baseUrl     = $this->isProduction
            ? 'https://app.midtrans.com/snap/v1/transactions'
            : 'https://app.sandbox.midtrans.com/snap/v1/transactions';
    }

    /**
     * Calculate fee for a given method group and bill amount.
     * Returns ['amount' => int, 'label' => string] or null if no fee.
     */
    public function calculateFeeForMethod(string $methodGroup, int $billAmount): ?array
    {
        $method = self::PAYMENT_METHODS[$methodGroup] ?? null;
        if (!$method) return null;

        if ($method['fee_type'] === 'percent') {
            $baseFee = $billAmount * $method['fee_value'] / 100;
        } else {
            $baseFee = $method['fee_value'];
        }

        // Add 11% tax (VAT/PPN)
        $tax = $baseFee * 0.11;
        $feeAmount = (int) ceil($baseFee + $tax);

        if ($method['fee_type'] === 'percent') {
            $label = "Biaya {$method['label']} ({$method['fee_value']}%+PPN)";
        } else {
            $label = "Biaya {$method['label']} (+PPN)";
        }

        // Pastikan max 50 karakter untuk Midtrans API
        $label = substr($label, 0, 50);

        return ['amount' => $feeAmount, 'label' => $label];
    }

    /**
     * Get all payment methods with their calculated fees for a given bill amount.
     * Used to display options on invoice page.
     */
    public function getPaymentMethodsWithFees(int $billAmount): array
    {
        $methods = [];
        foreach (self::PAYMENT_METHODS as $key => $method) {
            $fee = $this->calculateFeeForMethod($key, $billAmount);
            $methods[$key] = array_merge($method, [
                'key'        => $key,
                'fee_amount' => $fee ? $fee['amount'] : 0,
                'fee_label'  => $fee ? $fee['label'] : null,
                'total'      => $billAmount + ($fee ? $fee['amount'] : 0),
            ]);
        }
        return $methods;
    }

    /**
     * Create snap token for a specific payment method group.
     * This locks the payment popup to the selected method(s) and charges the correct fee.
     */
    public function getSnapTokenForMethod(Bill $bill, string $methodGroup): ?array
    {
        if (empty($this->serverKey)) {
            Log::warning('Midtrans Server Key is not set.');
            return null;
        }

        $student   = $bill->student;
        $method    = self::PAYMENT_METHODS[$methodGroup] ?? null;

        if (!$method) {
            Log::error("Invalid Midtrans payment method group: {$methodGroup}");
            return null;
        }

        $sppAmount = (int) $bill->amount;
        $fee       = $this->calculateFeeForMethod($methodGroup, $sppAmount);
        $feeAmount = $fee ? $fee['amount'] : 0;
        $total     = $sppAmount + $feeAmount;

        // Build item_details
        $itemDetails = [
            [
                'id'       => 'SPP-' . $bill->month . '-' . $bill->year,
                'price'    => $sppAmount,
                'quantity' => 1,
                'name'     => $bill->title,
            ]
        ];

        if ($feeAmount > 0) {
            $itemDetails[] = [
                'id'       => 'ADMIN-FEE',
                'price'    => $feeAmount,
                'quantity' => 1,
                'name'     => $fee['label'],
            ];
        }

        $orderId = $bill->bill_number . '-' . time();
        $params = [
            'transaction_details' => [
                'order_id'     => $orderId,
                'gross_amount' => $total,
            ],
            'customer_details' => [
                'first_name' => substr($student->name, 0, 50),
                'email'      => $student->parent_email ?? 'nomail@example.com',
                'phone'      => $student->parent_phone ?? '08111111111',
            ],
            'item_details'      => $itemDetails,
            'enabled_payments'  => $method['enabled_payments'],
        ];

        // Hanya tambahkan config e-wallet khusus jika diperlukan (GoPay web)
        if ($methodGroup === 'gopay') {
            $params['gopay'] = [
                'enable_callback' => true,
                'callback_url'    => route('invoice.show', $bill->bill_number),
            ];
        }

        try {
            $response = Http::withBasicAuth($this->serverKey, '')->post($this->baseUrl, $params);

            if ($response->successful()) {
                $snapToken = $response->json('token');
                $bill->update([
                    'snap_token'            => $snapToken,
                    'snap_token_expires_at' => now()->addHours(24),
                    'admin_fee'             => $feeAmount,
                    'midtrans_order_id'     => $orderId,
                ]);
                return [
                    'snap_token'    => $snapToken,
                    'admin_fee'     => $fee,
                    'total'         => $total,
                ];
            }

            Log::error('Midtrans API Error: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('Midtrans API Exception: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Legacy: Calculate admin fee based on flat settings (used as fallback).
     */
    public function calculateAdminFee(int $billAmount): ?array
    {
        $feeType  = \App\Models\Setting::get('midtrans_fee_type', 'none');
        $feeValue = (float) \App\Models\Setting::get('midtrans_fee_value', 0);
        $feeLabel = \App\Models\Setting::get('midtrans_fee_label', 'Biaya Layanan Pembayaran');

        if ($feeType === 'none' || $feeValue <= 0) return null;

        if ($feeType === 'fixed') {
            return ['amount' => (int) $feeValue, 'label' => $feeLabel];
        }
        if ($feeType === 'percent') {
            return ['amount' => (int) round($billAmount * $feeValue / 100), 'label' => "{$feeLabel} ({$feeValue}%)"];
        }

        return null;
    }

    /**
     * Regenerate snap token (clear old one and create new, without method lock).
     */
    public function regenerateSnapToken(Bill $bill): ?string
    {
        $bill->update(['snap_token' => null, 'snap_token_expires_at' => null]);

        if (empty($this->serverKey)) {
            Log::warning('Midtrans Server Key is not set.');
            return null;
        }

        $student   = $bill->student;
        $sppAmount = (int) $bill->amount;

        $params = [
            'transaction_details' => [
                'order_id'     => $bill->bill_number . '-' . time(),
                'gross_amount' => $sppAmount,
            ],
            'customer_details' => [
                'first_name' => $student->name,
                'email'      => $student->parent_email ?? 'nomail@example.com',
                'phone'      => $student->parent_phone ?? '08111111111',
            ],
            'item_details' => [
                [
                    'id'       => 'SPP-' . $bill->month . '-' . $bill->year,
                    'price'    => $sppAmount,
                    'quantity' => 1,
                    'name'     => $bill->title,
                ]
            ],
        ];

        try {
            $response = Http::withBasicAuth($this->serverKey, '')->post($this->baseUrl, $params);
            if ($response->successful()) {
                $snapToken = $response->json('token');
                $bill->update([
                    'snap_token'            => $snapToken,
                    'snap_token_expires_at' => now()->addHours(24),
                    'admin_fee'             => 0,
                ]);
                return $snapToken;
            }
            Log::error('Midtrans API Error: ' . $response->body());
        } catch (\Exception $e) {
            Log::error('Midtrans API Exception: ' . $e->getMessage());
        }

        return null;
    }

    /**
     * Check transaction status directly to Midtrans API.
     */
    public function checkTransactionStatus(Bill $bill)
    {
        if (empty($this->serverKey)) return false;

        // PROTEKSI: Jika tagihan sudah PAID, jangan pernah diubah lagi
        // Di sandbox Midtrans, transaksi expire setelah ~15 menit walaupun sudah dibayar
        if ($bill->status === 'paid') {
            return 'paid';
        }

        $orderId = $bill->midtrans_order_id ?: $bill->bill_number;

        $apiUrl = $this->isProduction
            ? "https://api.midtrans.com/v2/{$orderId}/status"
            : "https://api.sandbox.midtrans.com/v2/{$orderId}/status";

        try {
            $response = Http::withBasicAuth($this->serverKey, '')->get($apiUrl);
            if ($response->successful()) {
                $payload           = $response->json();
                $transactionStatus = $payload['transaction_status'] ?? null;
                $fraudStatus       = $payload['fraud_status'] ?? null;

                if ($transactionStatus == 'capture') {
                    if ($fraudStatus == 'challenge') {
                        $bill->update(['status' => 'pending']);
                    } elseif ($fraudStatus == 'accept') {
                        return 'paid';
                    }
                } elseif ($transactionStatus == 'settlement') {
                    return 'paid';
                } elseif (in_array($transactionStatus, ['cancel', 'deny', 'expire'])) {
                    // Hanya ubah ke expired jika tagihan memang belum pernah dibayar
                    if ($bill->status !== 'paid') {
                        $bill->update(['status' => 'expired']);
                    }
                    return 'expired';
                } elseif ($transactionStatus == 'pending') {
                    if ($bill->status !== 'paid') {
                        $bill->update(['status' => 'pending']);
                    }
                    return 'pending';
                }
            }
        } catch (\Exception $e) {
            Log::error('Midtrans Status Check Exception: ' . $e->getMessage());
        }

        return false;
    }
}
