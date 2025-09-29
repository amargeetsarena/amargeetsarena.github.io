const menuItems = [
    {
      name: "Paneer Tikka",
      image: "https://images.pexels.com/photos/958546/pexels-photo-958546.jpeg",
      category: "veg",
      desc: "Cottage cheese cubes marinated and grilled with spices.",
      price: "₹180",
      qty: "6 pcs",
      basePrice: 180
    },
    {
      name: "Chicken Lollipop",
      image: "https://images.pexels.com/photos/106343/pexels-photo-106343.jpeg",
      category: "nonveg",
      desc: "Fried chicken drumettes tossed in spicy sauce.",
      price: "₹220",
      qty: "8 pcs",
      basePrice: 220
    },
    {
      name: "Aloo Tikki (No Onion/Garlic)",
      image: "https://images.pexels.com/photos/1059905/pexels-photo-1059905.jpeg",
      category: "withoutoniongarlic",
      desc: "Potato patties with special masala, no onion/garlic used.",
      price: "₹100",
      qty: "4 pcs",
      basePrice: 100
    },
    {
      name: "Butter Naan",
      image: "https://images.pexels.com/photos/12737656/pexels-photo-12737656.jpeg",
      category: "veg",
      desc: "Soft and buttery leavened bread, freshly baked in tandoor.",
      price: "₹50",
      qty: "2 pcs",
      basePrice: 50
    },
    {
      name: "Chicken Biryani",
      image: "https://images.pexels.com/photos/12737660/pexels-photo-12737660.jpeg",
      category: "nonveg",
      desc: "Fragrant basmati rice cooked with succulent chicken pieces and aromatic spices.",
      price: "₹250",
      qty: "1 plate",
      basePrice: 250
    },
    {
      name: "Gulab Jamun",
      image: "https://images.pexels.com/photos/4110006/pexels-photo-4110006.jpeg",
      category: "withoutoniongarlic",
      desc: "Sweet fried dumplings soaked in sugar syrup, best served warm.",
      price: "₹120",
      qty: "4 pcs",
      basePrice: 120
    }
  ];
  
  const whatsappNumber = "917899417495"; // Replace with actual number
  
  function updateQuantity(button, delta, item, quantityElement, priceElement) {
    let quantity = parseInt(quantityElement.textContent) || 1;
    quantity += delta;
    if (quantity < 1) quantity = 1;
    if (quantity > 10) quantity = 10; // Optional: set max quantity
    
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
    message += `💰 Total: ₹${totalPrice}\n`;
    if (orderDate && orderDate !== '') {
        const formattedDate = new Date(orderDate).toLocaleDateString('en-IN', {
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
        message += `📅 Date: ${formattedDate}\n`;
    }
    if (orderTime && orderTime !== '') {
        message += `⏰ Time: ${orderTime}\n`;
    }
    if (wing && wing !== '') {
        message += `🏢 ${wing}\n`;
    }
    if (flat && flat !== '') {
        message += `🏠 Flat: ${flat}\n`;
    }
    message += `\nThank you!`;
    
    return `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(message)}`;
}
  
  function renderMenu(filter) {
    const container = document.getElementById('menu-container');
    container.innerHTML = '';
    const items = menuItems.filter(
      item => filter === "all" || item.category === filter
    );
    
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
        
        <div class="delivery-options">
          <div class="form-group">
            <label for="delivery-date-${item.name.replace(/\s+/g, '-').toLowerCase()}">
              <i class="far fa-calendar-alt"></i> Delivery Date
            </label>
            <input type="date" 
                   id="delivery-date-${item.name.replace(/\s+/g, '-').toLowerCase()}" 
                   class="delivery-date" 
                   min="${minDate}" 
                   value="${defaultDate}"
                   data-item="${item.name}"
                   required>
          </div>
          
          <div class="form-group">
            <label for="delivery-time-${item.name.replace(/\s+/g, '-').toLowerCase()}">
              <i class="far fa-clock"></i> Delivery Time
            </label>
            <select id="delivery-time-${item.name.replace(/\s+/g, '-').toLowerCase()}" 
                    class="delivery-time" 
                    data-item="${item.name}"
                    required>
              <option value="">Select Time</option>
              <option value="Morning (9 AM - 12 PM)">Morning (9 AM - 12 PM)</option>
              <option value="Afternoon (12 PM - 3 PM)" selected>Afternoon (12 PM - 3 PM)</option>
              <option value="Evening (3 PM - 6 PM)">Evening (3 PM - 6 PM)</option>
              <option value="Night (6 PM - 9 PM)">Night (6 PM - 9 PM)</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="wing-${item.name.replace(/\s+/g, '-').toLowerCase()}">
              <i class="fas fa-building"></i> Wing (1-4)
            </label>
            <select id="wing-${item.name.replace(/\s+/g, '-').toLowerCase()}" 
                    class="delivery-wing" 
                    data-item="${item.name}"
                    required>
              <option value="">Select Wing</option>
              <option value="Wing 1">Wing 1</option>
              <option value="Wing 2">Wing 2</option>
              <option value="Wing 3">Wing 3</option>
              <option value="Wing 4">Wing 4</option>
            </select>
          </div>
          
          <div class="form-group">
            <label for="flat-${item.name.replace(/\s+/g, '-').toLowerCase()}">
              <i class="fas fa-home"></i> Flat Number
            </label>
            <input type="text" 
                   id="flat-${item.name.replace(/\s+/g, '-').toLowerCase()}" 
                   class="delivery-flat" 
                   placeholder="e.g. 501"
                   data-item="${item.name}"
                   pattern="[0-9]{3,4}"
                   title="Please enter a valid flat number"
                   required>
          </div>
        </div>
        
        <button type="button" class="order-btn" data-item="${item.name}" data-view="grid">
          <i class="fab fa-whatsapp"></i> Order on WhatsApp
        </button>
        <button type="button" class="order-btn list-view-btn" data-item="${item.name}" data-view="list">
          <i class="fab fa-whatsapp"></i> Order
        </button>
      `;
      
      container.appendChild(itemElement);
    });
    
    // Add event listeners after rendering
    document.querySelectorAll('.qty-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        const itemName = e.target.dataset.item;
        const item = menuItems.find(i => i.name === itemName);
        const menuItem = e.target.closest('.menu-item');
        const quantityElement = menuItem.querySelector('.quantity');
        const priceElement = menuItem.querySelector('.total-price');
        const delta = e.target.classList.contains('plus') ? 1 : -1;
        updateQuantity(button, delta, item, quantityElement, priceElement);
      });
    });
    
    document.querySelectorAll('.order-btn').forEach(button => {
      button.addEventListener('click', (e) => {
        try {
          e.preventDefault();
          const orderButton = e.target.closest('.order-btn');
          if (!orderButton) {
            console.error('Could not find order button element');
            return;
          }
          
          const itemName = orderButton.dataset.item;
          const item = menuItems.find(i => i.name === itemName);
          if (!item) {
            console.error('Item not found:', itemName);
            return;
          }
          
          const menuItem = orderButton.closest('.menu-item');
          if (!menuItem) {
            console.error('Could not find menu item container');
            return;
          }
          
          const quantityElement = menuItem.querySelector('.quantity');
          const dateElement = menuItem.querySelector('.delivery-date');
          const timeElement = menuItem.querySelector('.delivery-time');
          const wingElement = menuItem.querySelector('.delivery-wing');
          const flatElement = menuItem.querySelector('.delivery-flat');
          
          if (!quantityElement || !dateElement || !timeElement || !wingElement || !flatElement) {
            console.error('Missing required elements:', { 
              quantityElement, 
              dateElement, 
              timeElement, 
              wingElement, 
              flatElement 
            });
            return;
          }
          
          // Form validation
          if (!dateElement.value) {
            alert('Please select a delivery date');
            dateElement.focus();
            return;
          }
          
          if (!timeElement.value) {
            alert('Please select a delivery time');
            timeElement.focus();
            return;
          }
          
          if (!wingElement.value) {
            alert('Please select your wing');
            wingElement.focus();
            return;
          }
          
          if (!flatElement.value) {
            alert('Please enter your flat number');
            flatElement.focus();
            return;
          }
          
          const waUrl = setupOrderButton(
            item, 
            quantityElement, 
            dateElement, 
            timeElement, 
            wingElement, 
            flatElement
          );
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
    renderMenu(cat);
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
  
  // Load saved view preference
  document.addEventListener('DOMContentLoaded', () => {
    const savedView = localStorage.getItem('menuView') || 'grid';
    setView(savedView);
    
    // Add event listeners for view toggle buttons
    gridViewBtn.addEventListener('click', () => setView('grid'));
    listViewBtn.addEventListener('click', () => setView('list'));
  });
  
  // Initial render
  renderMenu("all");
  