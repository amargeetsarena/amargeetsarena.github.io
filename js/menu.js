const menuItems = [
  {
    name: "Chocolate Cake",
    image: "images/chocolatecake.png",
    category: "veg",
    desc: "Delicious eggless chocolate cake, perfect for any occasion.",
    price: "₹200",
    qty: "Half kg",
    basePrice: 200
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

function setupOrderButton(item, quantityElement, dateElement, timeElement, wingElement, flatElement) {
  const quantity = parseInt(quantityElement.textContent);
  const totalPrice = item.basePrice * quantity;
  const orderDate = dateElement ? dateElement.value : 'ASAP';
  const orderTime = timeElement ? timeElement.value : '';
  const wing = wingElement ? wingElement.value : '';
  const flat = flatElement ? flatElement.value : '';
  
  let message = `Hi! I want to order:\n`;
  message += `🍽️ *${item.name}* (${item.qty})\n`;
  message += `🔢 Quantity: ${quantity}\n`;
  message += `💰 Total Price: ₹${totalPrice}\n`;
  message += `📅 Date: ${orderDate}\n`;
  if (orderTime) message += `⏰ Time: ${orderTime}\n`;
  if (wing) message += `🏢 Wing: ${wing}\n`;
  if (flat) message += `🏠 Flat: ${flat}\n\n`;
  message += `Please confirm my order. Thank you!`;
  
  return encodeURIComponent(message);
}

function renderMenu(filter) {
  const container = document.getElementById('menu-container');
  if (!container) return;
  
  container.innerHTML = '';
  const items = menuItems.filter(
    item => filter === "all" || item.category === filter
  );
  
  if (items.length === 0) {
    container.innerHTML = '<div class="no-items">No items found in this category.</div>';
    return;
  }
  
  items.forEach(item => {
    const itemElement = document.createElement('div');
    itemElement.className = 'menu-item';
    
    // Get current date and time
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    // Format date for input field (YYYY-MM-DD)
    const minDate = today.toISOString().split('T')[0];
    const defaultDate = tomorrow.toISOString().split('T')[0];
    
    itemElement.innerHTML = `
      <img src="${item.image}" alt="${item.name}">
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
          <div class="form-group">
            <label for="delivery-date-${item.name.replace(/\s+/g, '-').toLowerCase()}">
              <i class="far fa-calendar-alt"></i> Delivery Date
            </label>
            <input type="date" 
                   id="delivery-date-${item.name.replace(/\s+/g, '-').toLowerCase()}" 
                   class="delivery-date" 
                   min="${minDate}" 
                   data-item="${item.name}"
                   required
                   oninvalid="this.setCustomValidity('Please select a delivery date')"
                   oninput="this.setCustomValidity('')">
          </div>
          
          <div class="form-group">
            <label for="delivery-time-${item.name.replace(/\s+/g, '-').toLowerCase()}">
              <i class="far fa-clock"></i> Delivery Time
            </label>
            <select id="delivery-time-${item.name.replace(/\s+/g, '-').toLowerCase()}" 
                    class="delivery-time" 
                    data-item="${item.name}"
                    required>
              <option value="" selected>Select Time</option>
              <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
              <option value="Afternoon (12 PM - 3 PM)">Afternoon (12 PM - 3 PM)</option>
              <option value="Evening (3 PM - 6 PM)">Evening (3 PM - 6 PM)</option>
            </select>
          </div>
          
          <div class="form-group">
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
          
          <div class="form-group">
            <label for="flat-${item.name.replace(/\s+/g, '-').toLowerCase()}">
              <i class="fas fa-home"></i> Flat No.
            </label>
            <input type="text" 
                   id="flat-${item.name.replace(/\s+/g, '-').toLowerCase()}" 
                   class="delivery-flat" 
                   placeholder="e.g. 101"
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
    
    // Add event listener for order form
    const orderForm = itemElement.querySelector('.order-form');
    const dateInput = itemElement.querySelector('.delivery-date');
    const timeSelect = itemElement.querySelector('.delivery-time');
    const wingSelect = itemElement.querySelector('.delivery-wing');
    const flatInput = itemElement.querySelector('.delivery-flat');
    
    orderForm.addEventListener('submit', (e) => {
      e.preventDefault();
      try {
        // Validate form (additional checks for user experience)
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
        
        if (!flatInput.value) {
          alert('Please enter your flat number');
          flatInput.focus();
          return;
        }
        
        // Prepare WhatsApp message
        const message = setupOrderButton(
          item,
          quantityEl,
          dateInput,
          timeSelect,
          wingSelect,
          flatInput
        );
        
        // Open WhatsApp
        const waUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
        console.log('Opening WhatsApp URL:', waUrl);
        window.open(waUrl, '_blank');
        
      } catch (error) {
        console.error('Error processing order:', error);
        alert('There was an error processing your order. Please try again.');
      }
    });
  });
}

function filterMenu(cat) {
  // Remove active class from all buttons
  document.querySelectorAll('nav button').forEach(btn => {
    btn.classList.remove('active');
  });

  // Add active class to clicked button
  const activeBtn = document.querySelector(`nav button[data-category="${cat}"]`);
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
  document.querySelectorAll('nav button').forEach(button => {
    button.addEventListener('click', (e) => {
      const category = e.currentTarget.getAttribute('data-category');
      filterMenu(category);
    });
  });
  
  console.log('Menu initialized');
});
