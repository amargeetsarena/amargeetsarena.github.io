const menuItems = [
    {
      name: "Paneer Tikka",
      image: "images/paneer-tikka.jpg",
      category: "veg",
      desc: "Cottage cheese cubes marinated and grilled with spices.",
      price: "₹180",
      qty: "6 pcs",
    },
    {
      name: "Chicken Lollipop",
      image: "images/chicken-lollipop.jpg",
      category: "nonveg",
      desc: "Fried chicken drumettes tossed in spicy sauce.",
      price: "₹220",
      qty: "8 pcs",
    },
    {
      name: "Aloo Tikki (No Onion/Garlic)",
      image: "images/aloo-tikki.jpg",
      category: "withoutoniongarlic",
      desc: "Potato patties with special masala, no onion/garlic used.",
      price: "₹100",
      qty: "4 pcs",
    },
    // Add more items here...
  ];
  
  const whatsappNumber = "919876543210"; // Replace with actual number
  
  function renderMenu(filter) {
    const container = document.getElementById('menu-container');
    container.innerHTML = '';
    const items = menuItems.filter(
      item => filter === "all" || item.category === filter
    );
    items.forEach(item => {
      const waMsg = encodeURIComponent(
        `Hi! I want to order: ${item.name} (${item.qty}) for ${item.price}.`
      );
      const waUrl = `https://wa.me/${whatsappNumber}?text=${waMsg}`;
      container.innerHTML += `
        <div class="menu-item">
          <img src="${item.image}" alt="${item.name}">
          <h2>${item.name}</h2>
          <div class="desc">${item.desc}</div>
          <div class="price">${item.price}</div>
          <div class="qty">${item.qty}</div>
          <a href="${waUrl}" target="_blank">Order on WhatsApp</a>
        </div>
      `;
    });
  }
  
  function filterMenu(cat) {
    renderMenu(cat);
  }
  
  // Initial render
  renderMenu("all");
  