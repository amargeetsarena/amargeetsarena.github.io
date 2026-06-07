<?php
require_once __DIR__ . '/config.php';

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

$action = $payload['action'] ?? '';
$path = menuDataPath();
$fp = fopen($path, 'c+');
if (!$fp) {
    jsonResponse(['success' => false, 'error' => 'Unable to open menu file'], 500);
}

if (!flock($fp, LOCK_EX)) {
    fclose($fp);
    jsonResponse(['success' => false, 'error' => 'Unable to lock menu file'], 500);
}

rewind($fp);
$contents = stream_get_contents($fp);
$items = json_decode($contents ?: '[]', true);
if (!is_array($items)) {
    $items = [];
}

function normalizeItem($item, $existing = null) {
    $now = gmdate('c');
    $id = trim((string)($item['id'] ?? ''));
    if ($id === '') {
        $slug = strtolower(trim((string)($item['name'] ?? 'item')));
        $id = preg_replace('/[^a-z0-9]+/', '_', $slug);
        $id = trim($id, '_');
        if ($id === '') {
            $id = 'item_' . bin2hex(random_bytes(4));
        }
    }

    $tags = $item['tags'] ?? [];
    if (!is_array($tags)) {
        $tags = [];
    }

    $normalized = [
        'id' => $id,
        'name' => trim((string)($item['name'] ?? '')),
        'description' => trim((string)($item['description'] ?? '')),
        'image' => trim((string)($item['image'] ?? '')),
        'price' => (int)($item['price'] ?? 0),
        'unitLabel' => trim((string)($item['unitLabel'] ?? '')),
        'foodType' => ($item['foodType'] ?? 'veg') === 'nonveg' ? 'nonveg' : 'veg',
        'tags' => array_values(array_filter(array_map('trim', $tags), fn($v) => $v !== '')),
        'enabled' => filter_var($item['enabled'] ?? true, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE),
        'visible' => filter_var($item['visible'] ?? true, FILTER_VALIDATE_BOOL, FILTER_NULL_ON_FAILURE),
        'deliveryType' => in_array(($item['deliveryType'] ?? 'both'), ['pickup', 'delivery', 'both'], true) ? $item['deliveryType'] : 'both',
        'sortOrder' => (int)($item['sortOrder'] ?? 0),
        'createdAt' => $existing['createdAt'] ?? $now,
        'updatedAt' => $now
    ];

    if ($normalized['name'] === '' || $normalized['description'] === '' || $normalized['image'] === '' || $normalized['unitLabel'] === '' || $normalized['price'] <= 0) {
        return null;
    }

    if ($normalized['enabled'] === null) {
        $normalized['enabled'] = true;
    }
    if ($normalized['visible'] === null) {
        $normalized['visible'] = true;
    }

    return $normalized;
}

if ($action === 'create') {
    $item = normalizeItem($payload['item'] ?? []);
    if (!$item) {
        flock($fp, LOCK_UN);
        fclose($fp);
        jsonResponse(['success' => false, 'error' => 'Invalid item data'], 400);
    }

    foreach ($items as $existing) {
        if (($existing['id'] ?? '') === $item['id']) {
            flock($fp, LOCK_UN);
            fclose($fp);
            jsonResponse(['success' => false, 'error' => 'Duplicate item id'], 400);
        }
    }

    $item['sortOrder'] = (int) round(microtime(true) * 1000);

    $items[] = $item;
} elseif ($action === 'update') {
    $item = normalizeItem($payload['item'] ?? []);
    if (!$item || empty($item['id'])) {
        flock($fp, LOCK_UN);
        fclose($fp);
        jsonResponse(['success' => false, 'error' => 'Invalid item data'], 400);
    }

    $found = false;
    foreach ($items as $index => $existing) {
        if (($existing['id'] ?? '') === $item['id']) {
            $item['createdAt'] = $existing['createdAt'] ?? $item['createdAt'];
            $item['sortOrder'] = (int) round(microtime(true) * 1000);
            $items[$index] = $item;
            $found = true;
            break;
        }
    }

    if (!$found) {
        flock($fp, LOCK_UN);
        fclose($fp);
        jsonResponse(['success' => false, 'error' => 'Item not found'], 404);
    }
} elseif ($action === 'toggle') {
    $id = trim((string)($payload['id'] ?? ''));
    if ($id === '') {
        flock($fp, LOCK_UN);
        fclose($fp);
        jsonResponse(['success' => false, 'error' => 'Missing id'], 400);
    }

    $found = false;
    foreach ($items as $index => $existing) {
        if (($existing['id'] ?? '') === $id) {
            $items[$index]['enabled'] = !($existing['enabled'] ?? true);
            $items[$index]['updatedAt'] = gmdate('c');
            $found = true;
            break;
        }
    }

    if (!$found) {
        flock($fp, LOCK_UN);
        fclose($fp);
        jsonResponse(['success' => false, 'error' => 'Item not found'], 404);
    }
} elseif ($action === 'delete') {
    $id = trim((string)($payload['id'] ?? ''));
    if ($id === '') {
        flock($fp, LOCK_UN);
        fclose($fp);
        jsonResponse(['success' => false, 'error' => 'Missing id'], 400);
    }

    $before = count($items);
    $items = array_values(array_filter($items, fn($existing) => ($existing['id'] ?? '') !== $id));
    if (count($items) === $before) {
        flock($fp, LOCK_UN);
        fclose($fp);
        jsonResponse(['success' => false, 'error' => 'Item not found'], 404);
    }
} else {
    flock($fp, LOCK_UN);
    fclose($fp);
    jsonResponse(['success' => false, 'error' => 'Unsupported action'], 400);
}

usort($items, function ($a, $b) {
    $sort = (int)($b['sortOrder'] ?? 0) <=> (int)($a['sortOrder'] ?? 0);
    if ($sort !== 0) {
        return $sort;
    }
    return strcmp((string)($b['updatedAt'] ?? ''), (string)($a['updatedAt'] ?? ''));
});

$json = json_encode($items, JSON_PRETTY_PRINT | JSON_UNESCAPED_SLASHES);
ftruncate($fp, 0);
rewind($fp);
fwrite($fp, $json . PHP_EOL);
fflush($fp);
flock($fp, LOCK_UN);
fclose($fp);

jsonResponse([
    'success' => true,
    'items' => $items
]);
