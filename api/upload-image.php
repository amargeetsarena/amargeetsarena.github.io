<?php
require_once __DIR__ . '/config.php';

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    jsonResponse(['success' => false, 'error' => 'Method not allowed'], 405);
}

if (!isLocalhost()) {
    jsonResponse(['success' => false, 'error' => 'Forbidden'], 403);
}

if (!isset($_FILES['image']) || !is_uploaded_file($_FILES['image']['tmp_name'])) {
    jsonResponse(['success' => false, 'error' => 'No image uploaded'], 400);
}

$file = $_FILES['image'];
if (($file['error'] ?? UPLOAD_ERR_OK) !== UPLOAD_ERR_OK) {
    jsonResponse(['success' => false, 'error' => 'Upload failed'], 400);
}

$maxBytes = 10 * 1024 * 1024;
if (($file['size'] ?? 0) > $maxBytes) {
    jsonResponse(['success' => false, 'error' => 'Image too large'], 400);
}

$original = (string)($file['name'] ?? 'image');
$ext = strtolower(pathinfo($original, PATHINFO_EXTENSION));
$allowed = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
if (!in_array($ext, $allowed, true)) {
    jsonResponse(['success' => false, 'error' => 'Unsupported image type'], 400);
}

$base = pathinfo($original, PATHINFO_FILENAME);
$slug = strtolower(preg_replace('/[^a-z0-9]+/', '_', $base));
$slug = trim($slug, '_');
if ($slug === '') {
    $slug = 'image';
}

$imagesDir = realpath(__DIR__ . '/../images');
if ($imagesDir === false) {
    jsonResponse(['success' => false, 'error' => 'Images folder not found'], 500);
}

$targetName = $slug . '_' . date('YmdHis') . '.' . $ext;
$targetPath = $imagesDir . DIRECTORY_SEPARATOR . $targetName;
if (!move_uploaded_file($file['tmp_name'], $targetPath) && !copy($file['tmp_name'], $targetPath)) {
    jsonResponse(['success' => false, 'error' => 'Could not save image'], 500);
}

jsonResponse([
    'success' => true,
    'path' => 'images/' . $targetName,
    'name' => $targetName
]);
