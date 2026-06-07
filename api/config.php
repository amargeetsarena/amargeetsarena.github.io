<?php
function isLocalhost() {
    $host = $_SERVER['HTTP_HOST'] ?? '';
    $addr = $_SERVER['REMOTE_ADDR'] ?? '';
    $hostName = explode(':', $host)[0];
    $localHosts = ['localhost', '127.0.0.1', '::1'];
    return in_array($hostName, $localHosts, true) && in_array($addr, $localHosts, true);
}

function jsonResponse($data, $statusCode = 200) {
    http_response_code($statusCode);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode($data, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
    exit;
}

function menuDataPath() {
    return realpath(__DIR__ . '/../data/menu.json') ?: (__DIR__ . '/../data/menu.json');
}
