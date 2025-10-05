const menuItems = [
  {
    name: "Chocolate Cake",
    image: "images/chocolatecake.png",
    category: "veg",
    desc: "Delicious eggless chocolate cake, perfect for any occasion.",
    price: "₹200",
    qty: "Half kg",
    basePrice: 200,
    enabled: false,
    deliveryType: "both" // Can be 'pickup', 'delivery', or 'both'
  },
  {
    name: "Maggi Pakoda",
    image: "images/maggipakoda.png",
    category: "veg",
    desc: "Crispy Maggi noodles fried into delicious pakoda pieces.",
    price: "₹100",
    qty: "10 pieces",
    basePrice: 100,
    enabled: false,
    deliveryType: "both"
  },
  {
    name: "Cheesy Chicken Zingy Parcel",
    image: "images/cheesychickenzingyparcel.png",
    category: "nonveg",
    desc: "Spicy and cheesy chicken parcels with zingy flavors.",
    price: "₹200",
    qty: "4 pieces",
    basePrice: 200,
    enabled: false,
    deliveryType: "delivery" // Best for delivery
  },
  {
    name: "Haldi Patra Pitha",
    image: "images/pitha.jpeg",
    category: ["veg", "withoutoniongarlic"],
    desc: "Traditional Odia sweet dumplings made within turmeric leaves. Made with a delicious batter of rice flour, sabudana, urad dal, poha, and filled with sweet coconut jaggery stuffing.",
    price: "₹150",
    qty: "6 pieces",
    basePrice: 150,
    enabled: true,
    deliveryType: "pickup" // Best served fresh
  }
];

const whatsappNumber = "917899417495";

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
  
  // Set default order type based on item's deliveryType
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
  
  // Filter items based on category and enabled status
  const filteredItems = menuItems.filter(item => {
    const isArray = Array.isArray(item.category);
    const matchesCategory = filter === "all" || 
                         (isArray ? item.category.includes(filter) : item.category === filter);
    return matchesCategory && item.enabled !== false;
  });
  
  if (filteredItems.length === 0) {
    container.innerHTML = `
      <div class="no-items">
        <i class="fas fa-utensils-slash"></i>
        <p>No menu items available in this category.</p>
      </div>
    `;
    return;
  }
  filteredItems.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = `menu-item ${item.category}`;
    
    // Get current date and time
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Format date for input field (YYYY-MM-DD)
    const todayStr = today.toISOString().split('T')[0];
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    // Default minDate is today for evening/night deliveries
    let minDate = todayStr;
    
    itemElement.innerHTML = `
      <img src="${item.image}" alt="${item.name}" onerror="this.src='images/logo.png'">
      <div class="menu-item-content">
        <h2>${item.name}</h2>
        <div class="desc">${item.desc}</div>
        <div class="price">Price: ${item.price}</div>
        <div class="qty">${item.qty}</div>
        
        <div class="quantity-selector">
          <button type="button" class="qty-btn minus" data-item="${item.name}">-</button>
          <span class="quantity">1</span>
          <button type="button" class="qty-btn plus" data-item="${item.name}">+</button>
        </div>
        <div class="total-price">Total: ${item.price}</div>
      
        <form class="order-form">
        <div class="delivery-options">
          <div class="form-group pickup-delivery-group">
            <label><i class="fas fa-truck"></i> Order Type</label>
            <div class="pickup-delivery-options">
              <label class="radio-label">
                <input type="radio" 
                       name="order-type-${item.name.replace(/\s+/g, '-').toLowerCase()}" 
                       value="pickup" 
                       class="order-type" 
                       data-item="${item.name}" 
                       required 
                       ${item.deliveryType === 'pickup' ? 'checked' : ''}
                       ${item.deliveryType === 'pickup' ? 'onclick="return false;" style="cursor: not-allowed;"' : ''}>
                <span>Pickup${item.deliveryType === 'pickup' ? ' Only' : ''}</span>
              </label>
              ${item.deliveryType !== 'pickup' ? `
              <label class="radio-label">
                <input type="radio" 
                       name="order-type-${item.name.replace(/\s+/g, '-').toLowerCase()}" 
                       value="delivery" 
                       class="order-type" 
                       data-item="${item.name}" 
                       ${item.deliveryType === 'delivery' ? 'checked' : ''}
                       ${item.deliveryType === 'delivery' ? 'onclick="return false;" style="cursor: not-allowed;"' : ''}
                       required>
                <span>Delivery${item.deliveryType === 'delivery' ? ' Only' : ''}</span>
              </label>
              ` : ''}
            </div>
          </div>
          
          <div class="form-group">
            <label for="delivery-date-${item.name.replace(/\s+/g, '-').toLowerCase()}">
              <i class="far fa-calendar-alt"></i> Date
            </label>
            <div class="date-input-wrapper">
              <input type="date" 
                     id="delivery-date-${item.name.replace(/\s+/g, '-').toLowerCase()}" 
                     class="delivery-date" 
                     min="${minDate}" 
                     value="${tomorrowStr}"
                     data-item="${item.name}"
                     required
                     oninvalid="this.setCustomValidity('Please select a delivery date')"
                     oninput="this.setCustomValidity('')">
              <button type="button" class="calendar-btn" data-input-id="delivery-date-${item.name.replace(/\s+/g, '-').toLowerCase()}">
                <i class="far fa-calendar-alt"></i>
              </button>
            </div>
          </div>
          
          <div class="form-group">
            <label for="delivery-time-${item.name.replace(/\s+/g, '-').toLowerCase()}">
              <i class="far fa-clock"></i> Time
            </label>
            <select id="delivery-time-${item.name.replace(/\s+/g, '-').toLowerCase()}" 
                    class="delivery-time" 
                    data-item="${item.name}"
                    required>
              <option value="" selected>Select Time</option>
            </select>
          </div>
          
          <div class="form-group delivery-only" id="wing-group-${item.name.replace(/\s+/g, '-').toLowerCase()}">
            <label for="wing-${item.name.replace(/\s+/g, '-').toLowerCase()}">
              <i class="fas fa-building"></i> Wing
            </label>
            <select id="wing-${item.name.replace(/\s+/g, '-').toLowerCase()}" 
                    class="delivery-wing" 
                    data-item="${item.name}" required>
              <option value="">Select Wing</option>
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="4">4</option>
            </select>
          </div>
          
          <div class="form-group delivery-only" id="flat-group-${item.name.replace(/\s+/g, '-').toLowerCase()}">
            <label for="flat-${item.name.replace(/\s+/g, '-').toLowerCase()}">
              <i class="fas fa-home"></i> Flat No.
            </label>
            <input type="text" 
                   id="flat-${item.name.replace(/\s+/g, '-').toLowerCase()}" 
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
    
    // Add click handler to open modal (prevent when clicking on form elements)
    itemElement.addEventListener('click', (e) => {
      // Don't open modal if clicking on form elements
      if (e.target.closest('form') || e.target.closest('button') || e.target.closest('input') || e.target.closest('select')) {
        return;
      }
      openItemModal(item);
    });
    
    // Add event listeners for quantity buttons
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
    
    // Add event listeners for pickup/delivery toggle
    const orderTypeRadios = itemElement.querySelectorAll('.order-type');
    const wingGroup = itemElement.querySelector('.delivery-only');
    const flatGroup = itemElement.querySelector('.delivery-only');
    
    function toggleDeliveryFields() {
      const selectedOrderType = itemElement.querySelector('.order-type:checked').value;
      const deliveryOnlyFields = itemElement.querySelectorAll('.delivery-only');
      const wingInput = itemElement.querySelector('.delivery-wing');
      const flatInput = itemElement.querySelector('.delivery-flat');
      
      if (selectedOrderType === 'pickup') {
        deliveryOnlyFields.forEach(field => {
          field.style.display = 'none';
        });
        // Remove required attribute for delivery fields
        if (wingInput) wingInput.required = false;
        if (flatInput) flatInput.required = false;
      } else {
        deliveryOnlyFields.forEach(field => {
          field.style.display = 'block';
        });
        // Add required attribute for delivery fields
        if (wingInput) wingInput.required = true;
        if (flatInput) flatInput.required = true;
      }
    }
    
    orderTypeRadios.forEach(radio => {
      radio.addEventListener('change', toggleDeliveryFields);
    });
    
    // Initialize delivery fields visibility
    toggleDeliveryFields();
    
    // Add event listener for delivery time changes to update min date
    const timeSelect = itemElement.querySelector('.delivery-time');
    const dateInput = itemElement.querySelector('.delivery-date');
    
    function updateMinDate() {
      if (timeSelect && dateInput) {
        const selectedTime = timeSelect.value;
        const selectedDate = dateInput.value;
        
        // For morning and afternoon deliveries, minimum date is tomorrow
        if (selectedTime.includes('Morning') || selectedTime.includes('Afternoon')) {
          dateInput.min = tomorrowStr;
          // If current value is today, change it to tomorrow
          if (dateInput.value === todayStr) {
            dateInput.value = tomorrowStr;
          }
        } else {
          // For evening, night, and late night deliveries, minimum date is today
          dateInput.min = todayStr;
        }
        
        // Update available time slots based on selected date
        updateAvailableTimeSlots(selectedDate);
      }
    }
    
    function updateAvailableTimeSlots(selectedDate) {
      if (!timeSelect) return;
      
      const now = new Date();
      const currentHour = now.getHours();
      const isToday = selectedDate === todayStr;
      
      const allSlots = [
        { value: "Morning (9 AM - 12 PM)", startHour: 9, endHour: 12 },
        { value: "Afternoon (12 PM - 3 PM)", startHour: 12, endHour: 15 },
        { value: "Evening (3 PM - 6 PM)", startHour: 15, endHour: 18 },
        { value: "Night (7 PM - 10 PM)", startHour: 19, endHour: 22 },
        { value: "Late Night (10 PM - 12 AM)", startHour: 22, endHour: 24 }
      ];
      
      let availableSlots;
      if (isToday) {
        // For today, only show slots that haven't started yet
        availableSlots = allSlots.filter(slot => currentHour < slot.startHour);
      } else {
        // For future dates, show all slots
        availableSlots = allSlots;
      }
      
      // Update the select options
      const currentValue = timeSelect.value;
      timeSelect.innerHTML = '<option value="" selected>Select Time</option>';
      
      availableSlots.forEach(slot => {
        const option = document.createElement('option');
        option.value = slot.value;
        option.textContent = slot.value;
        timeSelect.appendChild(option);
      });
      
      // Restore previously selected value if it's still available
      if (currentValue && availableSlots.some(slot => slot.value === currentValue)) {
        timeSelect.value = currentValue;
      } else {
        timeSelect.value = '';
      }
    }
    
    // Initial update
    updateMinDate();
    
    // Update when time selection changes
    timeSelect.addEventListener('change', updateMinDate);
    
    // Update when date selection changes
    dateInput.addEventListener('change', () => {
      const selectedDate = dateInput.value;
      updateAvailableTimeSlots(selectedDate);
    });
    
    // Add event listener for calendar button
    const calendarBtn = itemElement.querySelector('.calendar-btn');
    if (calendarBtn) {
      calendarBtn.addEventListener('click', () => {
        const inputId = calendarBtn.getAttribute('data-input-id');
        const dateInput = document.getElementById(inputId);
        if (dateInput) {
          dateInput.focus();
          // Try to open the calendar picker if supported
          dateInput.showPicker && dateInput.showPicker();
        }
      });
    }
    
    // Add event listener for order form
    const orderForm = itemElement.querySelector('.order-form');
    const orderTypeInput = itemElement.querySelector('.order-type:checked');
    const wingSelect = itemElement.querySelector('.delivery-wing');
    const flatInput = itemElement.querySelector('.delivery-flat');
    
    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        // Validate form (additional checks for user experience)
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
        
        // Prepare WhatsApp message
        const message = setupOrderButton(
          item,
          quantityEl,
          dateInput,
          timeSelect,
          selectedOrderType,
          wingSelect,
          flatInput
        );
        
        // Open WhatsApp
        const waUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
        console.log('Opening WhatsApp URL:', waUrl);
        window.open(waUrl, '_blank');
        
        // Reset form fields after successful order submission
        quantityEl.textContent = '1';
        priceEl.textContent = `Total: ₹${item.basePrice}`;
        
        // Reset order type to pickup (default)
        const pickupRadio = itemElement.querySelector('input[name*="order-type"][value="pickup"]');
        if (pickupRadio) pickupRadio.checked = true;
        
        // Reset date to tomorrow
        dateInput.value = tomorrowStr;
        
        // Reset time selection
        timeSelect.value = '';
        
        // Clear wing and flat inputs
        if (wingSelect) wingSelect.value = '';
        if (flatInput) flatInput.value = '';
        
        // Re-initialize delivery fields visibility
        toggleDeliveryFields();
        
      } catch (error) {
        console.error('Error processing order:', error);
        alert('There was an error processing your order. Please try again.');
      }
    });
  });
}

function filterMenu(cat) {
  // Remove active class from all buttons
  document.querySelectorAll('.categories-nav button').forEach(btn => {
    btn.classList.remove('active');
  });

  // Add active class to clicked button
  const activeBtn = document.querySelector(`.categories-nav button[data-category="${cat}"]`);
  if (activeBtn) {
    activeBtn.classList.add('active');
  }

  // Filter and render menu
  renderMenu(cat === 'all' ? 'all' : cat);
}

// View Toggle Functionality
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

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOM fully loaded');
  
  // Initial render
  renderMenu('all');
  
  // Set up view toggle buttons
  gridViewBtn.addEventListener('click', () => setView('grid'));
  listViewBtn.addEventListener('click', () => setView('list'));
  
  // Set initial view
  const savedView = localStorage.getItem('menuView') || 'grid';
  setView(savedView);
  
  // Set up category filter buttons
  document.querySelectorAll('.categories-nav button').forEach(button => {
    button.addEventListener('click', (e) => {
      const category = e.currentTarget.getAttribute('data-category');
      filterMenu(category);
    });
  });
  
  console.log('Menu initialized');
});
function openItemModal(item) {
  // Remove existing modal if any
  const existingModal = document.querySelector('.modal');
  if (existingModal) {
    existingModal.remove();
  }
  
  // Create modal HTML
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
  
  // Add modal to body
  document.body.insertAdjacentHTML('beforeend', modalHTML);
  
  // Show modal
  const modal = document.getElementById('item-modal');
  modal.style.display = 'block';
  
  // Add close event listeners
  const closeBtn = modal.querySelector('.close-btn');
  closeBtn.addEventListener('click', closeModal);
  
  // Close modal when clicking outside
  modal.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });
  
  // Close modal on Escape key
  document.addEventListener('keydown', handleEscape);
  function handleEscape(e) {
    if (e.key === 'Escape') {
      closeModal();
      document.removeEventListener('keydown', handleEscape);
    }
  }
}

function closeModal() {
  const modal = document.getElementById('item-modal');
  if (modal) {
    modal.style.display = 'none';
    setTimeout(() => modal.remove(), 300); // Remove after animation
  }
}

function closeModalAndScroll(itemName) {
  closeModal();
  // Scroll to the item and highlight it
  const itemElement = document.querySelector(`[data-item="${itemName}"]`);
  if (itemElement) {
    itemElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
    itemElement.style.boxShadow = '0 0 20px rgba(255, 112, 67, 0.6)';
    setTimeout(() => {
      itemElement.style.boxShadow = '';
    }, 2000);
  }
}
