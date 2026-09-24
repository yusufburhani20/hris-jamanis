<?php
require 'vendor/autoload.php';
$vapid = Minishlink\WebPush\VAPID::createVapidKeys();
echo 'VAPID_PUBLIC_KEY="' . $vapid['publicKey'] . '"' . PHP_EOL;
echo 'VAPID_PRIVATE_KEY="' . $vapid['privateKey'] . '"' . PHP_EOL;
