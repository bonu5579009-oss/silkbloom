document.addEventListener('DOMContentLoaded', () => {
    // --- Global State & Data ---
    const defaultProducts = [
        { id: 'p1', name: 'Qirollik Atirguli', price: 45000, icon: 'рџЊ№', desc: 'Klassik qizil atirgul, 50sm' },
        { id: 'p2', name: 'Bahor Lolasi', price: 35000, icon: 'рџЊ·', desc: 'Yumshoq pushti lolalar, 5 dona' },
        { id: 'p3', name: 'Oq Orxideya', price: 85000, icon: 'рџЊє', desc: 'Ekzotik oq orxideya, idishda' },
        { id: 'p4', name: 'Pion (Peony)', price: 55000, icon: 'рџ’ђ', desc: 'Katta va yumshoq pion gullari' }
    ];

    // Initialize LocalStorage if empty
    if (!localStorage.getItem('products')) {
        localStorage.setItem('products', JSON.stringify(defaultProducts));
    }
    if (!localStorage.getItem('orders')) {
        localStorage.setItem('orders', JSON.stringify([]));
    }
    if (!localStorage.getItem('users')) {
        localStorage.setItem('users', JSON.stringify([{ email: 'admin@silkbloom.uz', pass: 'admin123', name: 'Admin', role: 'admin' }]));
    }

    let cart = [];
    let currentUser = JSON.parse(localStorage.getItem('currentUser')) || null;

    // --- DOM Elements ---
    // Common
    const overlay = document.getElementById('overlay');
    const header = document.querySelector('header');

    // Index Page Elements
    const productGrid = document.querySelector('.product-grid');
    const cartToggle = document.getElementById('cart-toggle');
    const cartDrawer = document.getElementById('cart-drawer');
    const cartItemsContainer = document.getElementById('cart-items');
    const cartTotalElement = document.getElementById('cart-total');
    const cartCountElement = document.querySelector('.cart-count');
    const checkoutBtn = document.getElementById('checkout-btn');
    const loginToggle = document.getElementById('login-toggle');
    const authModal = document.getElementById('auth-modal');
    const orderModal = document.getElementById('order-modal');

    // Auth Modal Toggles
    const loginView = document.getElementById('login-view');
    const registerView = document.getElementById('register-view');
    const toRegister = document.getElementById('to-register');
    const toLogin = document.getElementById('to-login');
    const hamburger = document.getElementById('hamburger');
    const navLinks = document.querySelector('.nav-links');

    // Admin Page Elements
    const adminProductList = document.getElementById('admin-product-list');
    const adminOrderList = document.getElementById('admin-order-list');
    const statProducts = document.getElementById('stat-products');
    const statOrders = document.getElementById('stat-orders');
    const statUsers = document.getElementById('stat-users');

    // --- Core Functions ---
    const formatPrice = (price) => Number(price).toLocaleString('uz-UZ') + ' UZS';

    const getProducts = () => JSON.parse(localStorage.getItem('products'));
    const getOrders = () => JSON.parse(localStorage.getItem('orders'));
    const getUsers = () => JSON.parse(localStorage.getItem('users'));

    // --- Render Functions ---
    const renderProducts = () => {
        if (!productGrid) return;
        const products = getProducts();
        productGrid.innerHTML = products.map(p => `
            <div class="product-card glass">
                <div class="product-img" id="${p.id}">${p.icon}</div>
                <div class="product-info">
                    <h3>${p.name}</h3>
                    <p>${p.desc || ''}</p>
                    <div class="price-row">
                        <span class="price">${formatPrice(p.price)}</span>
                        <button class="add-to-cart" data-id="${p.id}">+</button>
                    </div>
                </div>
            </div>
        `).join('');

        // Re-attach add-to-cart listeners
        document.querySelectorAll('.add-to-cart').forEach(btn => {
            btn.addEventListener('click', () => addToCart(btn.dataset.id));
        });

        // Re-observe for animations
        document.querySelectorAll('.product-card').forEach(el => {
            el.classList.add('reveal');
            intersectionObserver.observe(el);
        });
    };

    const renderAdminDashboard = () => {
        if (!adminProductList) return;
        const products = getProducts();
        const orders = getOrders();
        const users = getUsers();

        statProducts.textContent = products.length;
        statOrders.textContent = orders.length;
        statUsers.textContent = users.length;

        adminProductList.innerHTML = products.map(p => `
            <tr>
                <td style="font-size: 2rem;">${p.icon}</td>
                <td>${p.name}</td>
                <td>${formatPrice(p.price)}</td>
                <td class="action-btns">
                    <button class="btn-delete" onclick="deleteProduct('${p.id}')">O'chirish</button>
                </td>
            </tr>
        `).join('');

        adminOrderList.innerHTML = orders.map(o => `
            <tr>
                <td>${o.date}</td>
                <td>${o.customer}</td>
                <td>${o.phone}</td>
                <td style="font-size: 0.8rem;">${o.items.map(i => i.name + ' (' + i.qty + ')').join(', ')}</td>
                <td><b>${formatPrice(o.total)}</b></td>
            </tr>
        `).sort((a, b) => new Date(b.date) - new Date(a.date)).join('');
    };

    // --- Cart Actions ---
    const updateCartUI = () => {
        if (!cartDrawer) return;
        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCountElement.textContent = totalItems;

        if (cart.length === 0) {
            cartItemsContainer.innerHTML = '<p class="empty-msg">Savat bo\'sh</p>';
            checkoutBtn.disabled = true;
        } else {
            cartItemsContainer.innerHTML = cart.map(item => `
                <div class="cart-item">
                    <div class="item-img">${item.icon}</div>
                    <div class="item-details">
                        <h4>${item.name}</h4>
                        <p>${formatPrice(item.price)} x ${item.quantity}</p>
                    </div>
                </div>
            `).join('');
            checkoutBtn.disabled = false;
        }

        const totalAmount = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotalElement.textContent = formatPrice(totalAmount);
    };

    const addToCart = (id) => {
        const product = getProducts().find(p => p.id === id);
        const existing = cart.find(item => item.id === id);
        if (existing) {
            existing.quantity++;
        } else {
            cart.push({ ...product, quantity: 1 });
        }
        updateCartUI();
        cartDrawer.classList.add('active');
        overlay.classList.add('active');
    };

    // --- Authentication ---
    const updateHeaderAuth = () => {
        const adminLink = document.getElementById('admin-link');
        const userDisplay = document.getElementById('user-display');
        const userNameEl = document.getElementById('user-name');
        const loginLi = document.getElementById('login-li');

        if (currentUser) {
            if (loginLi) loginLi.style.display = 'none';
            if (userDisplay) {
                userDisplay.style.display = 'block';
                userNameEl.textContent = currentUser.name;
            }
            if (adminLink && currentUser.role === 'admin') {
                adminLink.style.display = 'block';
            }
        }
    };

    // --- Modal Controls ---
    const closeAllModals = () => {
        [authModal, orderModal, cartDrawer, document.getElementById('add-product-modal')].forEach(m => {
            if (m) m.classList.remove('active');
        });
        if (navLinks) navLinks.classList.remove('active');
        if (hamburger) hamburger.classList.remove('active');
        overlay.classList.remove('active');
    };

    // --- Event Listeners ---

    // Auth Toggles
    if (loginToggle) loginToggle.onclick = () => {
        authModal.classList.add('active');
        overlay.classList.add('active');
    };
    if (toRegister) toRegister.onclick = () => {
        loginView.style.display = 'none';
        registerView.style.display = 'block';
    };
    if (toLogin) toLogin.onclick = () => {
        registerView.style.display = 'none';
        loginView.style.display = 'block';
    };

    // Login Form
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.onsubmit = (e) => {
        e.preventDefault();
        const id = document.getElementById('login-id').value;
        const pass = document.getElementById('login-pass').value;
        const users = getUsers();
        const user = users.find(u => (u.email === id || u.phone === id) && u.pass === pass);

        if (user) {
            currentUser = user;
            localStorage.setItem('currentUser', JSON.stringify(user));
            updateHeaderAuth();
            closeAllModals();
            alert('Xush kelibsiz, ' + user.name + '!');
        } else {
            alert('Email yoki parol noto\'g\'ri!');
        }
    };

    // Order Form
    const orderForm = document.getElementById('order-form');
    if (orderForm) orderForm.onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const phone = document.getElementById('phone').value;
        const total = cart.reduce((sum, i) => sum + (i.price * i.quantity), 0);

        const newOrder = {
            id: Date.now(),
            date: new Date().toLocaleString(),
            customer: name,
            phone: phone,
            items: cart.map(i => ({ name: i.name, qty: i.quantity })),
            total: total
        };

        const orders = getOrders();
        orders.push(newOrder);
        localStorage.setItem('orders', JSON.stringify(orders));

        alert(`Rahmat, ${name}! Buyurtmangiz qabul qilindi.`);
        cart = [];
        updateCartUI();
        closeAllModals();
        orderForm.reset();
    };

    // Admin - Section Toggles
    document.querySelectorAll('.admin-nav').forEach(nav => {
        nav.onclick = (e) => {
            e.preventDefault();
            document.querySelectorAll('.admin-nav').forEach(n => n.classList.remove('active'));
            document.querySelectorAll('.admin-section').forEach(s => s.classList.remove('active'));
            nav.classList.add('active');
            document.getElementById(nav.dataset.target).classList.add('active');
        };
    });

    // Admin - Add Product
    const addProductForm = document.getElementById('add-product-form');
    if (addProductForm) addProductForm.onsubmit = (e) => {
        e.preventDefault();
        const name = document.getElementById('p-name').value;
        const price = document.getElementById('p-price').value;
        const icon = document.getElementById('p-icon').value;
        const desc = document.getElementById('p-desc').value;

        const products = getProducts();
        products.push({ id: 'p' + Date.now(), name, price, icon, desc });
        localStorage.setItem('products', JSON.stringify(products));

        renderAdminDashboard();
        closeAllModals();
        addProductForm.reset();
    };

    if (document.getElementById('open-add-product')) {
        document.getElementById('open-add-product').onclick = () => {
            document.getElementById('add-product-modal').classList.add('active');
            overlay.classList.add('active');
        };
    }

    // Global delete helper (attached to window for ease with inline onclick)
    window.deleteProduct = (id) => {
        if (!confirm('Ushbu mahsulotni o\'chirmoqchimisiz?')) return;
        const products = getProducts().filter(p => p.id !== id);
        localStorage.setItem('products', JSON.stringify(products));
        renderAdminDashboard();
    };

    // Close controls
    document.querySelectorAll('.close-btn').forEach(btn => btn.onclick = closeAllModals);
    if (overlay) overlay.onclick = closeAllModals;
    if (document.getElementById('close-cart')) document.getElementById('close-cart').onclick = closeAllModals;
    if (document.getElementById('close-modal')) document.getElementById('close-modal').onclick = closeAllModals;
    if (document.getElementById('close-auth')) document.getElementById('close-auth').onclick = closeAllModals;
    if (document.getElementById('checkout-btn')) document.getElementById('checkout-btn').onclick = () => {
        document.getElementById('order-modal').classList.add('active');
        overlay.classList.add('active');
        document.getElementById('summary-items').textContent = cart.reduce((s, i) => s + i.quantity, 0) + 'ta mahsulot';
        document.getElementById('summary-total').textContent = formatPrice(cart.reduce((s, i) => s + (i.price * i.quantity), 0));
    };

    // Hamburger Toggle
    if (hamburger) {
        hamburger.onclick = () => {
            hamburger.classList.toggle('active');
            navLinks.classList.toggle('active');
            // Overlay only on mobile if menu is active
            if (navLinks.classList.contains('active')) {
                overlay.classList.add('active');
            } else {
                overlay.classList.remove('active');
            }
        };
    }

    // Close menu on link click
    document.querySelectorAll('.nav-links a').forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('active');
            navLinks.classList.remove('active');
            overlay.classList.remove('active');
        });
    });

    // --- Misc & Initialization ---
    const intersectionObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                intersectionObserver.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1 });

    document.querySelectorAll('.about-text, .about-img, .testimonial-card').forEach(el => {
        el.classList.add('reveal');
        intersectionObserver.observe(el);
    });

    // Initialize
    renderProducts();
    renderAdminDashboard();
    updateHeaderAuth();
    updateCartUI();

    // Smooth scroll for nav
    document.querySelectorAll('.nav-links a:not(.login-btn), .hero-btns a').forEach(anchor => {
        anchor.addEventListener('click', function (e) {
            const href = this.getAttribute('href');
            if (href.startsWith('#')) {
                e.preventDefault();
                const target = document.querySelector(href);
                if (target) target.scrollIntoView({ behavior: 'smooth' });
            }
        });
    });

    // Header scroll
    window.addEventListener('scroll', () => {
        if (window.scrollY > 50) {
            header.style.background = 'rgba(254, 250, 224, 0.95)';
            header.style.padding = '0.5rem 0';
        } else {
            header.style.background = 'rgba(254, 250, 224, 0.8)';
            header.style.padding = '1rem 0';
        }
    });

    const logout = () => {
        localStorage.removeItem('currentUser');
        location.reload();
    };
});
