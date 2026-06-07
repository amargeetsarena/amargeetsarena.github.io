<?php
require_once __DIR__ . '/config.php';

$path = menuDataPath();
if (!file_exists($path)) {
    jsonResponse([]);
}

$data = json_decode(file_get_contents($path), true);
if (!is_array($data)) {
    jsonResponse([]);
}

usort($data, function ($a, $b) {
    $sort = (int)($b['sortOrder'] ?? 0) <=> (int)($a['sortOrder'] ?? 0);
    if ($sort !== 0) {
        return $sort;
    }
    return strcmp((string)($b['updatedAt'] ?? ''), (string)($a['updatedAt'] ?? ''));
});

jsonResponse($data);
