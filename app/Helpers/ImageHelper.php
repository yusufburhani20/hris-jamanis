<?php

namespace App\Helpers;

use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Exception;

class ImageHelper
{
    /**
     * Compress and store an uploaded image or raw binary data.
     * Converts to JPEG, resizes to max width 1000px, and applies quality compression (65%).
     *
     * @param UploadedFile|string $fileOrData
     * @param string $directory
     * @param string $disk
     * @param int $quality
     * @param int $maxWidth
     * @return string
     */
    public static function compressAndStore($fileOrData, string $directory, string $disk = 'public', int $quality = 65, int $maxWidth = 1000): string
    {
        // Generate a unique filename
        $filename = md5(uniqid() . microtime()) . '.jpg';
        $targetPath = rtrim($directory, '/') . '/' . $filename;

        // If GD is not loaded, fallback to default saving methods
        if (!extension_loaded('gd')) {
            return self::fallbackStore($fileOrData, $directory, $filename, $disk);
        }

        try {
            $imageData = null;
            if ($fileOrData instanceof UploadedFile) {
                $mime = $fileOrData->getMimeType();
                // If the uploaded file is not an image (e.g. PDF), store normally
                if (!str_starts_with($mime, 'image/')) {
                    return $fileOrData->store($directory, $disk);
                }
                $imageData = file_get_contents($fileOrData->getRealPath());
            } elseif (is_string($fileOrData)) {
                $imageData = $fileOrData;
            }

            if (!$imageData) {
                return self::fallbackStore($fileOrData, $directory, $filename, $disk);
            }

            // Create GD image resource from data string (auto-detects PNG, JPEG, WEBP, etc.)
            $image = @imagecreatefromstring($imageData);
            if (!$image) {
                return self::fallbackStore($fileOrData, $directory, $filename, $disk);
            }

            // Read original dimensions
            $width = imagesx($image);
            $height = imagesy($image);

            // Resize image if width exceeds maxWidth
            if ($width > $maxWidth) {
                $newWidth = $maxWidth;
                $newHeight = (int) ($height * ($maxWidth / $width));
                
                $resizedImage = imagecreatetruecolor($newWidth, $newHeight);
                
                // Preserve white background for transparency conversion to JPG
                $white = imagecolorallocate($resizedImage, 255, 255, 255);
                imagefill($resizedImage, 0, 0, $white);
                
                imagecopyresampled($resizedImage, $image, 0, 0, 0, 0, $newWidth, $newHeight, $width, $height);
                imagedestroy($image);
                $image = $resizedImage;
            }

            // Output buffering to capture compressed JPEG byte data
            ob_start();
            imagejpeg($image, null, $quality);
            $compressedData = ob_get_clean();
            imagedestroy($image);

            // Write to configured disk using Storage facade
            Storage::disk($disk)->put($targetPath, $compressedData);

            return $targetPath;
        } catch (Exception $e) {
            return self::fallbackStore($fileOrData, $directory, $filename, $disk);
        }
    }

    /**
     * Fallback file saving when GD is disabled or an error occurs.
     */
    private static function fallbackStore($fileOrData, string $directory, string $filename, string $disk): string
    {
        $targetPath = rtrim($directory, '/') . '/' . $filename;
        if ($fileOrData instanceof UploadedFile) {
            return $fileOrData->store($directory, $disk);
        } elseif (is_string($fileOrData)) {
            Storage::disk($disk)->put($targetPath, $fileOrData);
            return $targetPath;
        }
        return '';
    }
}
