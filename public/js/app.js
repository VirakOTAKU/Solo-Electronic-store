// Global state
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let user = JSON.parse(localStorage.getItem('user')) || null;
let currency = localStorage.getItem('currency') || 'USD';
let exchangeRate = 4100; // KHR to USD rate

// API Base URL - use relative URL to work with any domain/port
const API_URL = '/api';

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  updateCartCount();
  updateUserUI();
  handleSearch();
  updateActiveNavLink();
  initializeCurrencySelector();
});

// Initialize currency selector
function initializeCurrencySelector() {
  const header = document.querySelector('.header-top');
  if (header) {
    const currencySelector = document.createElement('div');
    currencySelector.className = 'currency-selector';
    currencySelector.style.cssText = 'margin-left: 20px;';
    currencySelector.innerHTML = `
      <select id="currency-select" style="padding: 5px 10px; border-radius: 4px; border: 1px solid #ddd;">
        <option value="USD">USD 🇺🇸</option>
        <option value="KHR">KHR 🇰🇭</option>
      </select>
    `;
    
    const firstDiv = header.querySelector('div:last-child');
    if (firstDiv) {
      firstDiv.insertBefore(currencySelector, firstDiv.firstChild);
    }
    
    const select = document.getElementById('currency-select');
    select.value = currency;
    select.addEventListener('change', (e) => {
      setCurrency(e.target.value);
    });
  }
}

// ============ NAVIGATION ============
function updateActiveNavLink() {
  const navLinks = document.querySelectorAll('nav a');
  const currentUrl = window.location.pathname + window.location.search;
  
  navLinks.forEach(link => {
    link.classList.remove('active');
    const href = link.getAttribute('href');
    
    // Check for exact URL match
    if (currentUrl === href) {
      link.classList.add('active');
    }
  });
}

// ============ CART MANAGEMENT ============
function addToCart(product) {
  const existingItem = cart.find(item => item.id === product.id);
  
  if (existingItem) {
    existingItem.quantity += 1;
  } else {
    cart.push({ ...product, quantity: 1 });
  }
  
  saveCart();
  updateCartCount();
  showNotification('Product added to cart!', 'success');
}

function removeFromCart(productId) {
  cart = cart.filter(item => item.id !== productId);
  saveCart();
  updateCartCount();
}

function updateCartQuantity(productId, quantity) {
  const item = cart.find(item => item.id === productId);
  if (item) {
    item.quantity = Math.max(1, parseInt(quantity));
    saveCart();
    updateCartCount();
  }
}

function clearCart() {
  cart = [];
  saveCart();
  updateCartCount();
}

function getCart() {
  return cart;
}

function getCartTotal() {
  return cart.reduce((total, item) => {
    const price = item.sale_price || item.price;
    return total + (price * item.quantity);
  }, 0);
}

function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
}

function updateCartCount() {
  const count = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartCountEl = document.querySelector('.cart-count');
  if (cartCountEl) {
    cartCountEl.textContent = count;
    cartCountEl.style.display = count > 0 ? 'flex' : 'none';
  }
}

// ============ USER MANAGEMENT ============
function saveUser(userData, token) {
  user = userData;
  localStorage.setItem('user', JSON.stringify(userData));
  localStorage.setItem('token', token);
  updateUserUI();
}

function logout() {
  user = null;
  localStorage.removeItem('user');
  localStorage.removeItem('token');
  updateUserUI();
  window.location.href = '/';
}

function getUser() {
  return user;
}

function getToken() {
  return localStorage.getItem('token');
}

function updateUserUI() {
  const userLinks = document.querySelectorAll('.user-link');
  userLinks.forEach(link => {
    if (user) {
      link.innerHTML = `👤 ${user.name}`;
      link.href = '/account';
    } else {
      link.innerHTML = '👤 Login';
      link.href = '/login';
    }
  });
}

// ============ API FUNCTIONS ============
async function fetchAPI(endpoint, options = {}) {
  try {
    const token = getToken();
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };
    
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...options,
      headers,
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      throw new Error(data.error || 'Request failed');
    }
    
    return data;
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
}

async function getProducts(params = {}) {
  const queryString = new URLSearchParams(params).toString();
  return await fetchAPI(`/products?${queryString}`);
}

async function getProduct(id) {
  return await fetchAPI(`/products/${id}`);
}

async function getCategories() {
  return await fetchAPI('/categories');
}

async function submitOrder(orderData) {
  return await fetchAPI('/orders', {
    method: 'POST',
    body: JSON.stringify(orderData),
  });
}

async function submitReview(reviewData) {
  return await fetchAPI('/reviews', {
    method: 'POST',
    body: JSON.stringify(reviewData),
  });
}

async function submitContact(contactData) {
  return await fetchAPI('/contact', {
    method: 'POST',
    body: JSON.stringify(contactData),
  });
}

async function subscribeNewsletter(email) {
  return await fetchAPI('/newsletter', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

async function register(userData) {
  return await fetchAPI('/auth/register', {
    method: 'POST',
    body: JSON.stringify(userData),
  });
}

async function login(credentials) {
  return await fetchAPI('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

// ============ UI HELPERS ============
function showNotification(message, type = 'info') {
  const notification = document.createElement('div');
  notification.className = `alert alert-${type}`;
  notification.textContent = message;
  notification.style.position = 'fixed';
  notification.style.top = '20px';
  notification.style.right = '20px';
  notification.style.zIndex = '9999';
  notification.style.minWidth = '250px';
  notification.style.animation = 'slideIn 0.3s ease';
  
  document.body.appendChild(notification);
  
  setTimeout(() => {
    notification.style.animation = 'slideOut 0.3s ease';
    setTimeout(() => notification.remove(), 300);
  }, 3000);
}

function renderStars(rating) {
  const fullStars = Math.floor(rating);
  const hasHalfStar = rating % 1 >= 0.5;
  let stars = '';
  
  for (let i = 0; i < fullStars; i++) {
    stars += '⭐';
  }
  if (hasHalfStar) {
    stars += '⭐';
  }
  
  return stars || '☆☆☆☆☆';
}

function formatPrice(price) {
  if (currency === 'KHR') {
    const khrPrice = parseFloat(price) * exchangeRate;
    return `${khrPrice.toFixed(0)} ៛`;
  }
  return `$${parseFloat(price).toFixed(2)}`;
}

function setCurrency(newCurrency) {
  if (['USD', 'KHR'].includes(newCurrency)) {
    currency = newCurrency;
    localStorage.setItem('currency', newCurrency);
    
    // Update all price displays by calling updatePagePrices
    updatePagePrices();
    
    // Dispatch custom event for pages to listen to
    const event = new CustomEvent('currencyChanged', { detail: { currency } });
    document.dispatchEvent(event);
  }
}

function getCurrentCurrency() {
  return currency;
}

function updatePagePrices() {
  // Update all elements with data-price attribute
  document.querySelectorAll('[data-price]').forEach(el => {
    el.textContent = formatPrice(el.getAttribute('data-price'));
  });
  
  // Update cart display if on cart or checkout page
  const cartCountEl = document.querySelector('.cart-count');
  if (cartCountEl) {
    updateCartCount();
  }
  
  // Trigger page-specific updates (for shop, product, cart pages)
  if (typeof reloadPricesOnPage === 'function') {
    reloadPricesOnPage();
  }
}

function formatDate(dateString) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

// ============ SEARCH ============
function handleSearch() {
  const searchForm = document.querySelector('.search-bar');
  if (searchForm) {
    searchForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const searchInput = searchForm.querySelector('input');
      const query = searchInput.value.trim();
      if (query) {
        window.location.href = `/shop?search=${encodeURIComponent(query)}`;
      }
    });
  }
}

// ============ NEWSLETTER ============
async function handleNewsletterSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const email = form.querySelector('input[type="email"]').value;
  
  try {
    await subscribeNewsletter(email);
    showNotification('Successfully subscribed to newsletter!', 'success');
    form.reset();
  } catch (error) {
    showNotification(error.message, 'error');
  }
}

// Add newsletter form handlers
document.addEventListener('DOMContentLoaded', () => {
  const newsletterForms = document.querySelectorAll('.newsletter-form');
  newsletterForms.forEach(form => {
    form.addEventListener('submit', handleNewsletterSubmit);
  });
});

// ============ ANIMATIONS ============
const style = document.createElement('style');
style.textContent = `
  @keyframes slideIn {
    from {
      transform: translateX(400px);
      opacity: 0;
    }
    to {
      transform: translateX(0);
      opacity: 1;
    }
  }
  
  @keyframes slideOut {
    from {
      transform: translateX(0);
      opacity: 1;
    }
    to {
      transform: translateX(400px);
      opacity: 0;
    }
  }
`;
document.head.appendChild(style);

// ============ PAGE TRANSITION HELPER ============
function animateProductsTransition(callback) {
  const productsGrid = document.getElementById('products-grid');
  if (productsGrid) {
    // Fade out current products
    productsGrid.classList.add('fade-out');
    
    // Execute callback and fade in new products after a short delay
    setTimeout(() => {
      productsGrid.classList.remove('fade-out');
      callback();
    }, 250);
  } else {
    callback();
  }
}
