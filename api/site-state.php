<?php
require_once __DIR__ . '/config.php';

$path = realpath(__DIR__ . '/../data/site.json') ?: (__DIR__ . '/../data/site.json');

function defaultSiteState() {
    return [
        'openForOrders' => true,
        'updatedAt' => gmdate('c')
    ];
}

function readSiteState($path) {
    if (!file_exists($path)) {
        return defaultSiteState();
    }
    $data = json_decode(file_get_contents($path), true);
    if (!is_array($data)) {
        return defaultSiteState();
    }
    return array_merge(defaultSiteState(), $data);
}

if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    jsonResponse(readSiteState($path));
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

if (!isLocalhost()) {
    jsonResponse(['success' => false, 'error' => 'Forbidden'], 403);
}

$raw = file_get_contents('php://input');
$payload = json_decode($raw, true);
if (!is_array($payload)) {
    jsonResponse(['success' => false, 'error' => 'Invalid JSON payload'], 400);
}

$state = readSiteState($path);
$state['openForOrders'] = filter_var($payload['openForOrders'] ?? true, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE);
if ($state['openForOrders'] === null) {
    $state['openForOrders'] = true;
}
$state['updatedAt'] = gmdate('c');

$dir = dirname($path);
if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
    jsonResponse(['success' => false, 'error' => 'Unable to prepare settings folder'], 500);
}

$fp = fopen($path, 'c+');
if (!$fp) {
    jsonResponse(['success' => false, 'error' => 'Unable to open settings file'], 500);
}

if (!flock($fp, LOCK_EX)) {
    fclose($fp);
    jsonResponse(['success' => false, 'error' => 'Unable to lock settings file'], 500);
}

ftruncate($fp, 0);
rewind($fp);
fwrite($fp, json_encode($state, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES) . PHP_EOL);
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

jsonResponse([
    'success' => true,
    'openForOrders' => $state['openForOrders'],
    'updatedAt' => $state['updatedAt']
]);
