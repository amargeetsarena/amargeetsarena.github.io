let menuItems = [];
let siteState = { openForOrders: true };

const whatsappNumber = "917899417495";

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
    return matchesCategory && item.enabled !== false;
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
      <img src="${item.image}" alt="${item.name}" onerror="this.src='images/logo.png'">
      <div class="menu-item-content">
        <h2>${item.name}</h2>
        <div class="price-qty-row">
          <div class="price">Price: ${item.price}</div>
          <div class="qty">${item.qty}</div>
        </div>
        <div class="desc">${item.desc}</div>

        <div class="qty-total-row">
          <div class="quantity-selector">
            <button type="button" class="qty-btn minus" data-item="${item.name}">−</button>
            <span class="quantity">1</span>
            <button type="button" class="qty-btn plus" data-item="${item.name}">+</button>
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
                       ${item.deliveryType === 'pickup' ? 'onclick="return false;" style="cursor: not-allowed;"' : ''}>
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
                       ${item.deliveryType === 'delivery' ? 'onclick="return false;" style="cursor: not-allowed;"' : ''}>
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
                    required>
              <option value="" selected>Select Time</option>
            </select>
          </div>

          <div class="form-group delivery-only" id="wing-group-${safeId}">
            <label for="${wingId}">
              <i class="fas fa-building"></i> Wing
            </label>
            <select id="${wingId}"
                    class="delivery-wing"
                    data-item="${item.name}" required>
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
                   required>
          </div>

          <button type="submit" class="order-btn" data-item="${item.name}">
            <i class="fab fa-whatsapp"></i> Order Now
          </button>
        </div>
        </form>
      </div>
    `;

    container.appendChild(itemElement);

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
          <div class="modal-details">
            <div>
              <div class="modal-price">${item.price}</div>
              <div class="modal-quantity">${item.qty}</div>
            </div>
            <button class="order-btn" onclick="closeModalAndScroll('${item.name}')">
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
