<?php
/**
 * share.php — Item-specific share page for WhatsApp / social thumbnails.
 * Usage: share.php?item=<item_id>
 *
 * WhatsApp's crawler reads Open Graph meta tags from this page.
 * The page then redirects the user back to the main menu.
 */

// ── Load menu data ────────────────────────────────────────────
$menuPath = __DIR__ . '/data/menu.json';
$menuItems = [];
if (file_exists($menuPath)) {
    $raw = file_get_contents($menuPath);
    $decoded = json_decode($raw, true);
    if (is_array($decoded)) {
        $menuItems = $decoded;
    }
}

// ── Find requested item ───────────────────────────────────────
$itemId   = isset($_GET['item']) ? trim($_GET['item']) : '';
$found    = null;
foreach ($menuItems as $m) {
    if (isset($m['id']) && $m['id'] === $itemId) {
        $found = $m;
        break;
    }
}

// ── Build meta values ─────────────────────────────────────────
$siteBase = 'https://amargeetsarena.github.io';

// Fallback values (for main site share)
$ogTitle       = "Amargeet's Arena | Food Delivery";
$ogDescription = "Order delicious food online with pickup and delivery options";
$ogImage       = $siteBase . '/images/logo.png';
$ogUrl         = $siteBase . '/';
$redirectUrl   = $siteBase . '/';

if ($found) {
    $name          = htmlspecialchars($found['name'] ?? 'Menu Item', ENT_QUOTES);
    $description   = htmlspecialchars($found['description'] ?? '', ENT_QUOTES);
    $price         = isset($found['price']) ? '₹' . $found['price'] : '';
    $unit          = htmlspecialchars($found['unitLabel'] ?? '', ENT_QUOTES);

    $ogTitle       = $name . " — Amargeet's Arena";
    $ogDescription = ($description ?: 'Order delicious food online.') .
                     ($price ? " | $price" : '') .
                     ($unit ? " ($unit)" : '');
    $ogUrl         = $siteBase . '/?item=' . urlencode($itemId);
    $redirectUrl   = $siteBase . '/?item=' . urlencode($itemId);

    // Resolve image URL — if it starts with 'images/', make it absolute
    $rawImage = $found['image'] ?? '';
    if ($rawImage) {
        if (str_starts_with($rawImage, 'http')) {
            $ogImage = $rawImage;
        } else {
            // Strip leading slash/dot if any
            $ogImage = $siteBase . '/' . ltrim($rawImage, './');
        }
    }
}

$ogTitle       = htmlspecialchars($ogTitle, ENT_QUOTES);
$ogDescription = htmlspecialchars($ogDescription, ENT_QUOTES);
$ogImage       = htmlspecialchars($ogImage, ENT_QUOTES);
$ogUrl         = htmlspecialchars($ogUrl, ENT_QUOTES);
$redirectUrl   = htmlspecialchars($redirectUrl, ENT_QUOTES);
?>
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title><?php echo $ogTitle; ?></title>
  <meta name="description" content="<?php echo $ogDescription; ?>">

  <!-- Open Graph / WhatsApp -->
  <meta property="og:type"        content="website">
  <meta property="og:url"         content="<?php echo $ogUrl; ?>">
  <meta property="og:title"       content="<?php echo $ogTitle; ?>">
  <meta property="og:description" content="<?php echo $ogDescription; ?>">
  <meta property="og:image"       content="<?php echo $ogImage; ?>">
  <meta property="og:image:width"  content="1200">
  <meta property="og:image:height" content="630">
  <meta property="og:site_name"   content="Amargeet's Arena">

  <!-- Twitter Card -->
  <meta name="twitter:card"        content="summary_large_image">
  <meta name="twitter:title"       content="<?php echo $ogTitle; ?>">
  <meta name="twitter:description" content="<?php echo $ogDescription; ?>">
  <meta name="twitter:image"       content="<?php echo $ogImage; ?>">

  <!-- Immediate redirect for real users (WhatsApp bot won't follow this) -->
  <meta http-equiv="refresh" content="0;url=<?php echo $redirectUrl; ?>">
  <link rel="canonical" href="<?php echo $ogUrl; ?>">

  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Segoe UI', system-ui, sans-serif;
      background: #fff3ee;
      color: #111;
    }
    .redirect-box {
      text-align: center;
      padding: 40px 24px;
    }
    .redirect-box h1 { font-size: 1.4rem; color: #ff6b35; margin-bottom: 8px; }
    .redirect-box p  { color: #555; font-size: 0.95rem; }
    .redirect-box a  { color: #ff6b35; font-weight: 600; }
  </style>
</head>
<body>
  <div class="redirect-box">
    <h1>Amargeet's Arena</h1>
    <p>Redirecting you to the menu&hellip;<br>
    <a href="<?php echo $redirectUrl; ?>">Click here if not redirected</a></p>
  </div>
  <script>
    // Immediate JS redirect for real browsers
    window.location.replace(<?php echo json_encode($redirectUrl); ?>);
  </script>
</body>
</html>
