let menuItems = [];
let siteState = { openForOrders: true };

const whatsappNumber = "917899417495";

/**
 * Share a menu item via WhatsApp.
 * On PHP (XAMPP) the share.php page serves proper OG tags so WhatsApp
 * will show the item image + details as a rich thumbnail.
 * On GitHub Pages (static) we fall back to a descriptive text share.
 */
function shareItem(item) {
  const isPhp = window.location.pathname.endsWith('.php') ||
                window.location.hostname === 'localhost' ||
                window.location.hostname === '127.0.0.1';

  let shareUrl;
  let waText;

  if (isPhp) {
    // PHP server — use share.php for rich OG thumbnail
    const base = window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '');
    shareUrl = `${base}/share.php?item=${encodeURIComponent(item.id)}`;
    waText = encodeURIComponent(`Check out *${item.name}* from Amargeet's Arena!\n\n${shareUrl}`);
  } else {
    // Static / GitHub Pages — text-only share with site link
    const base = window.location.origin + (window.location.pathname.replace(/\/[^/]*$/, '') || '');
    shareUrl = base + '/';
    const desc = item.desc ? `\n${item.desc}` : '';
    waText = encodeURIComponent(
      `🍽️ *${item.name}*${desc}\n` +
      `💰 Price: ₹${item.basePrice}` + (item.qty ? ` (${item.qty})` : '') + `\n\n` +
      `Order here: ${shareUrl}`
    );
  }

  // Use Web Share API if available (shows native share sheet on mobile)
  if (navigator.share) {
    navigator.share({
      title: `${item.name} — Amargeet's Arena`,
      text: item.desc || 'Check out this item from Amargeet\'s Arena!',
      url: isPhp
        ? (window.location.origin + window.location.pathname.replace(/\/[^/]*$/, '') + `/share.php?item=${encodeURIComponent(item.id)}`)
        : window.location.origin + '/'
    }).catch(() => {
      // Fallback to WhatsApp if share is dismissed / not supported
      window.open(`https://wa.me/?text=${waText}`, '_blank');
    });
  } else {
    window.open(`https://wa.me/?text=${waText}`, '_blank');
  }
}

function adaptItem(item) {
  const categories = [];
  if (item.foodType) categories.push(item.foodType);
  if (Array.isArray(item.tags) && item.tags.length) categories.push(...item.tags);
  const category = categories.length === 1 ? categories[0] : categories;
  return {
    ...item,
    category,
    desc: item.description || '',
    price: `₹${item.price}`,
    qty: item.unitLabel || '',
    basePrice: Number(item.price) || 0
  };
}

async function loadMenu() {
  const sources = ['api/menu-read.php', 'data/menu.json'];
  for (const source of sources) {
    try {
      const res = await fetch(source, { cache: 'no-store' });
      if (!res.ok) continue;
      const data = await res.json();
      menuItems = Array.isArray(data) ? data.map(adaptItem).sort((a, b) => {
        const aOrder = Number(a.sortOrder ?? 0);
        const bOrder = Number(b.sortOrder ?? 0);
        if (aOrder !== bOrder) return bOrder - aOrder;
        const aUpdated = String(a.updatedAt || '');
        const bUpdated = String(b.updatedAt || '');
        if (aUpdated !== bUpdated) return bUpdated.localeCompare(aUpdated);
        return String(a.name || '').localeCompare(String(b.name || ''));
      }) : [];
      return;
    } catch (error) {
      console.warn(`Failed to load menu from ${source}:`, error);
    }
  }
  console.error('Failed to load menu from all sources');
  menuItems = [];
}
window.loadMenu = loadMenu;

async function loadSiteState() {
  try {
    const res = await fetch('api/site-state.php', { cache: 'no-store' });
    if (!res.ok) return;
    const data = await res.json();
    siteState = {
      openForOrders: data.openForOrders !== false
    };
  } catch (error) {
    console.warn('Failed to load site state:', error);
  }
}
window.loadSiteState = loadSiteState;

function updateQuantity(button, delta, item, quantityElement, priceElement) {
  let quantity = parseInt(quantityElement.textContent) || 1;
  quantity += delta;
  if (quantity < 1) quantity = 1;
  if (quantity > 10) quantity = 10;

  quantityElement.textContent = quantity;
  const totalPrice = item.basePrice * quantity;
  priceElement.textContent = `Total: ₹${totalPrice}`;
}

function setupOrderButton(item, quantityElement, dateElement, timeElement, orderTypeElement, wingElement, flatElement) {
  const quantity = parseInt(quantityElement.textContent);
  const totalPrice = item.basePrice * quantity;
  const orderDate = dateElement ? dateElement.value : 'ASAP';
  const orderTime = timeElement ? timeElement.value : '';

  let defaultOrderType = 'delivery';
  if (item.deliveryType === 'pickup') {
    defaultOrderType = 'pickup';
  } else if (item.deliveryType === 'delivery') {
    defaultOrderType = 'delivery';
  }

  const orderType = orderTypeElement ? orderTypeElement.value : defaultOrderType;
  const wing = wingElement ? wingElement.value : '';
  const flat = flatElement ? flatElement.value : '';

  let message = `Hi! I want to order:\n`;
  message += `🍽️ *${item.name}* (${item.qty})\n`;
  message += `🔢 Quantity: ${quantity}\n`;
  message += `💰 Total Price: ₹${totalPrice}\n`;
  message += `📋 Order Type: ${orderType === 'pickup' ? 'Pickup' : 'Delivery'}\n`;
  message += `📅 Date: ${orderDate}\n`;
  if (orderTime) message += `⏰ Time: ${orderTime}\n`;
  if (orderType === 'pickup') {
    message += `📍 Pick up from: Wing 3, Flat 1010\n`;
  } else if (orderType === 'delivery') {
    if (wing) message += `🏢 Wing: ${wing}\n`;
    if (flat) message += `🏠 Flat: ${flat}\n`;
  }
  message += `\nPlease confirm my order. Thank you!`;
  return encodeURIComponent(message);
}

function renderMenu(filter) {
  const container = document.getElementById('menu-container');
  if (!container) return;

  container.innerHTML = '';

  if (!siteState.openForOrders) {
    container.innerHTML = `
      <div class="no-items no-items--closed">
        <div class="no-items__icon">
          <i class="fas fa-store-slash"></i>
        </div>
        <h2>We’re closed right now</h2>
        <p>Orders are temporarily paused. Please check back soon.</p>
      </div>
    `;
    return;
  }

  const filteredItems = menuItems.filter(item => {
    const isArray = Array.isArray(item.category);
    const matchesCategory = filter === "all" ||
      (isArray ? item.category.includes(filter) : item.category === filter);
    return matchesCategory && item.visible !== false;
  });

  if (filteredItems.length === 0) {
    container.innerHTML = `
      <div class="no-items">
        <div class="no-items__icon">
          <i class="fas fa-utensils"></i>
        </div>
        <h2>No items found</h2>
        <p>Please try a different category or check back soon for updates.</p>
      </div>
    `;
    return;
  }

  filteredItems.forEach(item => {
    const itemElement = document.createElement('div');
    const categoryClasses = Array.isArray(item.category)
      ? item.category.join(' ')
      : String(item.category || '');
    itemElement.className = `menu-item ${categoryClasses}`.trim();
    const isOrderable = item.enabled !== false;

    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    let minDate = todayStr;

    const safeId = (item.id || item.name || 'item').replace(/\s+/g, '-').toLowerCase().replace(/[^a-z0-9-_]/g, '');
    const orderTypeName = `order-type-${safeId}`;
    const dateId = `delivery-date-${safeId}`;
    const timeId = `delivery-time-${safeId}`;
    const wingId = `wing-${safeId}`;
    const flatId = `flat-${safeId}`;

    itemElement.innerHTML = `
      <div class="menu-item__img-wrap">
        <img src="${item.image}" alt="${item.name}" onerror="this.src='images/logo.png'">
        <button type="button" class="menu-item__share-btn" data-item-id="${item.id}" title="Share this item" aria-label="Share ${item.name}">
          <i class="fas fa-share-alt"></i>
        </button>
      </div>
      <div class="menu-item-content">
        <h2>${item.name}</h2>
        <div class="price-qty-row">
          <div class="price">Price: ${item.price}</div>
          <div class="qty">${item.qty}</div>
        </div>
        <div class="desc">${item.desc}</div>

        <div class="qty-total-row">
          <div class="quantity-selector">
            <button type="button" class="qty-btn minus" data-item="${item.name}" ${isOrderable ? '' : 'disabled aria-disabled="true"'}>−</button>
            <span class="quantity">1</span>
            <button type="button" class="qty-btn plus" data-item="${item.name}" ${isOrderable ? '' : 'disabled aria-disabled="true"'}>+</button>
          </div>
          <div class="total-price">Total: ${item.price}</div>
        </div>

        <form class="order-form">
        <div class="delivery-options">
          <div class="form-group pickup-delivery-group">
            <label><i class="fas fa-truck"></i> Order Type</label>
            <div class="pickup-delivery-options">
              <label class="radio-label">
                <input type="radio"
                       name="${orderTypeName}"
                       value="pickup"
                       class="order-type"
                       data-item="${item.name}"
                       ${item.deliveryType === 'pickup' || item.deliveryType === 'both' ? '' : 'disabled'}
                       ${item.deliveryType === 'delivery' ? '' : 'required'}
                       ${item.deliveryType === 'pickup' ? 'checked' : ''}
                       ${item.deliveryType === 'pickup' ? 'onclick="return false;" style="cursor: not-allowed;"' : ''}
                       ${isOrderable ? '' : 'disabled aria-disabled="true"'}>
                <span>Pickup${item.deliveryType === 'pickup' ? ' Only' : ''}</span>
              </label>

              <label class="radio-label">
                <input type="radio"
                       name="${orderTypeName}"
                       value="delivery"
                       class="order-type"
                       data-item="${item.name}"
                       ${item.deliveryType === 'delivery' || item.deliveryType === 'both' ? '' : 'disabled'}
                       ${item.deliveryType === 'pickup' ? '' : 'required'}
                       ${item.deliveryType === 'delivery' ? 'checked' : ''}
                       ${item.deliveryType === 'delivery' ? 'onclick="return false;" style="cursor: not-allowed;"' : ''}
                       ${isOrderable ? '' : 'disabled aria-disabled="true"'}>
                <span>Delivery${item.deliveryType === 'delivery' ? ' Only' : ''}</span>
              </label>
            </div>
          </div>

          <div class="form-group">
            <label for="${dateId}">
              <i class="far fa-calendar-alt"></i> Date
            </label>
            <div class="date-input-wrapper">
              <input type="date"
                     id="${dateId}"
                     class="delivery-date"
                     min="${minDate}"
                     value="${tomorrowStr}"
                     data-item="${item.name}"
                     required
                     ${isOrderable ? '' : 'disabled aria-disabled="true"'}
                     oninvalid="this.setCustomValidity('Please select a delivery date')"
                     oninput="this.setCustomValidity('')">
              <button type="button" class="calendar-btn" data-input-id="${dateId}">
                <i class="far fa-calendar-alt"></i>
              </button>
            </div>
          </div>

          <div class="form-group">
            <label for="${timeId}">
              <i class="far fa-clock"></i> Time
            </label>
            <select id="${timeId}"
                    class="delivery-time"
                    data-item="${item.name}"
                    required
                    ${isOrderable ? '' : 'disabled aria-disabled="true"'}>
              <option value="" selected>Select Time</option>
            </select>
          </div>

          <div class="form-group delivery-only" id="wing-group-${safeId}">
            <label for="${wingId}">
              <i class="fas fa-building"></i> Wing
            </label>
            <select id="${wingId}"
                    class="delivery-wing"
                    data-item="${item.name}" required
                    ${isOrderable ? '' : 'disabled aria-disabled="true"'}>
              <option value="">Select Wing</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>

          <div class="form-group delivery-only" id="flat-group-${safeId}">
            <label for="${flatId}">
              <i class="fas fa-home"></i> Flat No.
            </label>
            <input type="text"
                   id="${flatId}"
                   class="delivery-flat"
                   placeholder="e.g. 101"
                   pattern="[0-9]{1,4}"
                   maxlength="4"
                   title="Please enter a flat number (1-4 digits)"
                   data-item="${item.name}"
                   required
                   ${isOrderable ? '' : 'disabled aria-disabled="true"'}>
          </div>

          <button type="submit" class="order-btn" data-item="${item.name}" ${isOrderable ? '' : 'disabled aria-disabled="true"'}>
            <i class="fab fa-whatsapp"></i> Order Now
          </button>
          <button type="button" class="add-to-cart-btn" data-item="${item.name}" ${isOrderable ? '' : 'disabled aria-disabled="true"'}>
            <i class="fas fa-cart-plus"></i> Add to Cart
          </button>
        </div>
        </form>
      </div>
    `;

    if (!isOrderable) {
      itemElement.classList.add('disabled');
      const content = itemElement.querySelector('.menu-item-content');
      if (content) {
        const banner = document.createElement('div');
        banner.className = 'menu-item__disabled-banner';
        banner.innerHTML = '<i class="fas fa-lock"></i> Ordering disabled';
        content.insertBefore(banner, content.firstChild);
      }
    }

    container.appendChild(itemElement);

    // Share button
    const shareBtn = itemElement.querySelector('.menu-item__share-btn');
    if (shareBtn) {
      shareBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        shareItem(item);
      });
    }

    itemElement.addEventListener('click', (e) => {
    if (e.target.closest('form') || e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
      return;
    }
    openItemModal(item);
    });

    const minusBtn = itemElement.querySelector('.minus');
    const plusBtn = itemElement.querySelector('.plus');
    const quantityEl = itemElement.querySelector('.quantity');
    const priceEl = itemElement.querySelector('.total-price');

    minusBtn.addEventListener('click', () => {
      updateQuantity(minusBtn, -1, item, quantityEl, priceEl);
    });

    plusBtn.addEventListener('click', () => {
      updateQuantity(plusBtn, 1, item, quantityEl, priceEl);
    });

    const addToCartBtn = itemElement.querySelector('.add-to-cart-btn');
    if (addToCartBtn) {
      addToCartBtn.addEventListener('click', () => {
        if (item.enabled === false) {
          alert('This item is currently not available for ordering.');
          return;
        }

        if (orderForm && !orderForm.checkValidity()) {
          orderForm.reportValidity();
          return;
        }

        const selectedOrderType = itemElement.querySelector('.order-type:checked');
        if (!selectedOrderType) {
          alert('Please select pickup or delivery');
          return;
        }

        if (dateInput && !dateInput.value) {
          alert('Please select a delivery date');
          dateInput.focus();
          return;
        }

        if (timeSelect && !timeSelect.value) {
          alert('Please select a delivery time');
          timeSelect.focus();
          return;
        }

        if (selectedOrderType.value === 'delivery') {
          if (wingSelect && !wingSelect.value) {
            alert('Please select your wing');
            wingSelect.focus();
            return;
          }

          if (flatInput && !flatInput.value) {
            alert('Please enter your flat number');
            flatInput.focus();
            return;
          }
        }

        const qty = parseInt(quantityEl.textContent) || 1;
        
        addToCart({
          ...item,
          orderType: selectedOrderType.value,
          date: dateInput ? dateInput.value : '',
          time: timeSelect ? timeSelect.value : '',
          wing: (selectedOrderType.value === 'delivery' && wingSelect) ? wingSelect.value : '',
          flat: (selectedOrderType.value === 'delivery' && flatInput) ? flatInput.value : ''
        }, qty);
      });
    }

    const orderTypeRadios = itemElement.querySelectorAll('.order-type');
    orderTypeRadios.forEach(radio => {
      radio.addEventListener('change', toggleDeliveryFields);
    });

    function toggleDeliveryFields() {
      try {
        const selectedOrderType = itemElement.querySelector('.order-type:checked');
        if (!selectedOrderType) return;

        const deliveryOnlyFields = itemElement.querySelectorAll('.delivery-only');
        const wingInput = itemElement.querySelector('.delivery-wing');
        const flatInput = itemElement.querySelector('.delivery-flat');

        const isPickup = selectedOrderType.value === 'pickup';

        deliveryOnlyFields.forEach(field => {
          if (field) field.style.display = isPickup ? 'none' : 'block';
        });

        if (wingInput) wingInput.required = !isPickup;
        if (flatInput) flatInput.required = !isPickup;
      } catch (error) {
        console.error('Error in toggleDeliveryFields:', error);
      }
    }

    toggleDeliveryFields();

    const timeSelect = itemElement.querySelector('.delivery-time');
    const dateInput = itemElement.querySelector('.delivery-date');

    function updateMinDate() {
      if (timeSelect && dateInput) {
        const selectedTime = timeSelect.value;
        const selectedDate = dateInput.value;

        if (selectedTime.includes('Morning') || selectedTime.includes('Afternoon')) {
          dateInput.min = tomorrowStr;
          if (dateInput.value === todayStr) {
            dateInput.value = tomorrowStr;
          }
        } else {
          dateInput.min = todayStr;
        }

        updateAvailableTimeSlots(selectedDate);
      }
    }

    function updateAvailableTimeSlots(selectedDate) {
      if (!timeSelect) return;

      const now = new Date();
      const currentHour = now.getHours();
      const isToday = selectedDate === todayStr;

      const allSlots = [
        { value: 'Morning (9 AM - 12 PM)', hour: 9, minute: 0, endHour: 12, endMinute: 0 },
        { value: 'Afternoon (12 PM - 4 PM)', hour: 12, minute: 0, endHour: 16, endMinute: 0 },
        { value: 'Evening (4 PM - 8 PM)', hour: 16, minute: 0, endHour: 20, endMinute: 0 }
      ];

      let availableSlots;
      if (isToday) {
        availableSlots = allSlots.filter(slot => currentHour < slot.endHour);
      } else {
        availableSlots = allSlots;
      }

      const currentValue = timeSelect.value;
      timeSelect.innerHTML = '<option value="" selected>Select Time</option>';

      availableSlots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot.value;
        option.textContent = slot.value;
        timeSelect.appendChild(option);
      });

      if (currentValue && availableSlots.some(slot => slot.value === currentValue)) {
        timeSelect.value = currentValue;
      } else {
        timeSelect.value = '';
      }
    }

    updateMinDate();

    timeSelect.addEventListener('change', updateMinDate);

    dateInput.addEventListener('change', () => {
      const selectedDate = dateInput.value;
      updateAvailableTimeSlots(selectedDate);
    });

    const calendarBtn = itemElement.querySelector('.calendar-btn');
    if (calendarBtn) {
      calendarBtn.addEventListener('click', () => {
        const inputId = calendarBtn.getAttribute('data-input-id');
        const dateInput = document.getElementById(inputId);
        if (dateInput) {
          dateInput.focus();
          dateInput.showPicker && dateInput.showPicker();
        }
      });
    }

    const orderForm = itemElement.querySelector('.order-form');
    const wingSelect = itemElement.querySelector('.delivery-wing');
    const flatInput = itemElement.querySelector('.delivery-flat');

    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (item.enabled === false) {
        alert('This item is currently not available for ordering.');
        return;
      }
      try {
        const selectedOrderType = itemElement.querySelector('.order-type:checked');
        if (!selectedOrderType) {
          alert('Please select pickup or delivery');
          return;
        }

        if (!dateInput.value) {
          alert('Please select a delivery date');
          dateInput.focus();
          return;
        }

        if (!timeSelect.value) {
          alert('Please select a delivery time');
          timeSelect.focus();
          return;
        }

        if (selectedOrderType.value === 'delivery') {
          if (!wingSelect.value) {
            alert('Please select your wing');
            wingSelect.focus();
            return;
          }

          if (!flatInput.value) {
            alert('Please enter your flat number');
            flatInput.focus();
            return;
          }
        }

        const message = setupOrderButton(
          item,
          quantityEl,
          dateInput,
          timeSelect,
          selectedOrderType,
          wingSelect,
          flatInput
        );

        const waUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
        window.open(waUrl, '_blank');

        quantityEl.textContent = '1';
        priceEl.textContent = `Total: ₹${item.basePrice}`;

        const pickupRadio = itemElement.querySelector('input[name*="order-type"][value="pickup"]');
        if (pickupRadio) pickupRadio.checked = true;

        dateInput.value = tomorrowStr;
        timeSelect.value = '';

        if (wingSelect) wingSelect.value = '';
        if (flatInput) flatInput.value = '';

        toggleDeliveryFields();
      } catch (error) {
        console.error('Error processing order:', error);
        alert('There was an error processing your order. Please try again.');
      }
    });
  });
}
window.renderMenu = renderMenu;

function filterMenu(cat) {
  document.querySelectorAll('.categories-nav button').forEach(btn => {
    btn.classList.remove('active');
  });

  const activeBtn = document.querySelector(`.categories-nav button[data-category="${cat}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }

  renderMenu(cat === 'all' ? 'all' : cat);
}
window.filterMenu = filterMenu;

const gridViewBtn = document.getElementById('grid-view-btn');
const listViewBtn = document.getElementById('list-view-btn');
const menuContainer = document.getElementById('menu-container');

function setView(view) {
  if (view === 'list') {
    menuContainer.classList.add('list-view');
    listViewBtn.classList.add('active');
    gridViewBtn.classList.remove('active');
    localStorage.setItem('menuView', 'list');
  } else {
    menuContainer.classList.remove('list-view');
    gridViewBtn.classList.add('active');
    listViewBtn.classList.remove('active');
    localStorage.setItem('menuView', 'grid');
  }
}
window.setView = setView;

document.addEventListener('DOMContentLoaded', async function() {
  await loadSiteState();
  await loadMenu();

  renderMenu('all');

  gridViewBtn.addEventListener('click', () => setView('grid'));
  listViewBtn.addEventListener('click', () => setView('list'));

  const savedView = localStorage.getItem('menuView') || 'grid';
  setView(savedView);

  document.querySelectorAll('.categories-nav button').forEach(button => {
    button.addEventListener('click', (e) => {
      const category = e.currentTarget.getAttribute('data-category');
      filterMenu(category);
    });
  });

  loadCart();
  renderCart();
  initCartControls();
});

function openItemModal(item) {
  const existingModal = document.querySelector('.modal');
  if (existingModal) {
    existingModal.remove();
  }

  const modalHTML = `
    <div class="modal" id="item-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2>${item.name}</h2>
          <span class="close-btn">&times;</span>
        </div>
        <div class="modal-body">
          <img src="${item.image}" alt="${item.name}" class="modal-image" onerror="this.src='images/logo.png'">
          <div class="modal-description">${item.desc}</div>
          ${item.enabled === false ? '<div class="menu-item__disabled-banner"><i class="fas fa-lock"></i> Ordering disabled for this item</div>' : ''}
          <div class="modal-details">
            <div>
              <div class="modal-price">${item.price}</div>
              <div class="modal-quantity">${item.qty}</div>
            </div>
            <button class="order-btn" ${item.enabled === false ? 'disabled aria-disabled="true"' : ''} onclick="${item.enabled === false ? 'return false;' : `closeModalAndScroll('${item.name}')`}">
              <i class="fab fa-whatsapp"></i> Order Now
            </button>
          </div>
        </div>
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML('beforeend', modalHTML);

  const modal = document.getElementById('item-modal');
  modal.style.display = 'block';

  const closeBtn = modal.querySelector('.close-btn');
  closeBtn.addEventListener('click', closeModal);

  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  document.addEventListener('keydown', handleEscape);
  function handleEscape(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  }
}
window.openItemModal = openItemModal;

function closeModal() {
  const modal = document.getElementById('item-modal');
  if (modal) {
    modal.style.display = 'none';
    setTimeout(() => modal.remove(), 300);
  }
}
window.closeModal = closeModal;

function closeModalAndScroll(itemName) {
  closeModal();
  const itemElement = document.querySelector(`[data-item="${itemName}"]`);
  if (itemElement) {
    itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    itemElement.style.boxShadow = '0 0 20px rgba(255, 112, 67, 0.6)';
    setTimeout(() => {
      itemElement.style.boxShadow = '';
    }, 2000);
  }
}
window.closeModalAndScroll = closeModalAndScroll;

// ── Shopping Cart & Checkout ──────────────────────────────────
let cart = [];

function loadCart() {
  try {
    cart = JSON.parse(localStorage.getItem('cart') || '[]');
    updateCartBadge();
  } catch (error) {
    console.error('Error loading cart:', error);
    cart = [];
  }
}

function saveCart() {
  try {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
    renderCart();
  } catch (error) {
    console.error('Error saving cart:', error);
  }
}

function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  if (count > 0) {
    badge.textContent = count;
    badge.style.display = 'block';
  } else {
    badge.style.display = 'none';
  }
}

function addToCart(item, quantity) {
  const existingIndex = cart.findIndex(cartItem => 
    cartItem.name === item.name &&
    cartItem.orderType === item.orderType &&
    cartItem.date === item.date &&
    cartItem.time === item.time &&
    cartItem.wing === item.wing &&
    cartItem.flat === item.flat
  );
  if (existingIndex > -1) {
    cart[existingIndex].quantity = Math.min(10, cart[existingIndex].quantity + quantity);
  } else {
    cart.push({
      id: item.id,
      name: item.name,
      price: item.basePrice,
      qtyLabel: item.qty,
      image: item.image,
      quantity: quantity,
      orderType: item.orderType,
      date: item.date,
      time: item.time,
      wing: item.wing,
      flat: item.flat
    });
  }
  saveCart();
  
  const panel = document.getElementById('cart-panel');
  if (panel) panel.classList.add('open');
}

function updateCartQuantityByIndex(index, delta) {
  if (index < 0 || index >= cart.length) return;
  cart[index].quantity += delta;
  if (cart[index].quantity < 1) {
    cart.splice(index, 1);
  } else if (cart[index].quantity > 10) {
    cart[index].quantity = 10;
  }
  saveCart();
}

function removeFromCartByIndex(index) {
  if (index < 0 || index >= cart.length) return;
  cart.splice(index, 1);
  saveCart();
}

function renderCart() {
  const container = document.getElementById('cart-items-container');
  const checkoutContainer = document.getElementById('cart-checkout-container');
  const totalPriceEl = document.getElementById('cart-total-price');
  if (!container || !checkoutContainer) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <i class="fas fa-shopping-basket"></i>
        <p>Your cart is empty.<br>Add some delicious items!</p>
      </div>
    `;
    checkoutContainer.style.display = 'none';
    return;
  }

  checkoutContainer.style.display = 'block';
  let total = 0;

  container.innerHTML = `
    <div class="cart-items-list">
      ${cart.map((item, index) => {
        const itemTotal = item.price * item.quantity;
        total += itemTotal;
        const detailsStr = item.orderType === 'pickup'
          ? `Pickup · ${item.date} · ${item.time}`
          : `Delivery · ${item.date} · ${item.time} · Wing ${item.wing} · Flat ${item.flat}`;
        return `
          <div class="cart-item" style="flex-wrap: wrap; gap: 8px 12px;">
            <img src="${item.image}" alt="${item.name}" onerror="this.src='images/logo.png'">
            <div class="cart-item__details" style="flex: 1; min-width: 150px;">
              <div class="cart-item__name">${item.name}</div>
              <div class="cart-item__price">₹${item.price} (${item.qtyLabel})</div>
              <div style="font-size: 0.72rem; color: var(--text-muted); margin-top: 4px; line-height: 1.3;">${detailsStr}</div>
            </div>
            <div class="cart-item__qty-controls">
              <button type="button" class="cart-item__qty-btn minus" data-index="${index}">−</button>
              <span class="cart-item__qty">${item.quantity}</span>
              <button type="button" class="cart-item__qty-btn plus" data-index="${index}">+</button>
            </div>
            <button type="button" class="cart-item__remove" data-index="${index}" aria-label="Remove item">
              <i class="fas fa-trash-alt"></i>
            </button>
          </div>
        `;
      }).join('')}
    </div>
  `;

  if (totalPriceEl) {
    totalPriceEl.textContent = `₹${total}`;
  }

  container.querySelectorAll('.cart-item__qty-btn.minus').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-index'));
      updateCartQuantityByIndex(index, -1);
    });
  });

  container.querySelectorAll('.cart-item__qty-btn.plus').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-index'));
      updateCartQuantityByIndex(index, 1);
    });
  });

  container.querySelectorAll('.cart-item__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = parseInt(btn.getAttribute('data-index'));
      removeFromCartByIndex(index);
    });
  });
}

function initCartControls() {
  const cartFab = document.getElementById('cart-fab');
  const cartPanel = document.getElementById('cart-panel');
  const cartCloseBtn = document.getElementById('cart-panel-close');
  
  if (cartFab && cartPanel) {
    cartFab.addEventListener('click', () => {
      cartPanel.classList.add('open');
    });
  }
  
  if (cartCloseBtn && cartPanel) {
    cartCloseBtn.addEventListener('click', () => {
      cartPanel.classList.remove('open');
    });
  }

  const checkoutForm = document.getElementById('cart-checkout-form');

  if (checkoutForm) {
    checkoutForm.addEventListener('submit', (e) => {
      e.preventDefault();
      if (cart.length === 0) return;

      let grandTotal = 0;
      let message = `Hi! I want to order:\n\n`;
      cart.forEach((item, index) => {
        const itemTotal = item.price * item.quantity;
        grandTotal += itemTotal;
        message += `${index + 1}. *${item.name}* (${item.qtyLabel})\n`;
        message += `   🔢 Qty: ${item.quantity} · 💰 Price: ₹${itemTotal}\n`;
        if (item.orderType === 'pickup') {
          message += `   📋 Pickup (Date: ${item.date}, Time: ${item.time})\n`;
        } else {
          message += `   📋 Delivery (Date: ${item.date}, Time: ${item.time}, Wing: ${item.wing}, Flat: ${item.flat})\n`;
        }
      });
      message += `\n💵 *Grand Total: ₹${grandTotal}*\n`;
      message += `\nPlease confirm my order. Thank you!`;

      const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
      window.open(waUrl, '_blank');

      cart = [];
      saveCart();
      cartPanel.classList.remove('open');
    });
  }
}
