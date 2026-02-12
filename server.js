require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');
const apiRoutes = require('./routes/api');

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));
app.use('/img', express.static(path.join(__dirname, 'img')));
app.use('/uploads', express.static(path.join(__dirname, 'public', 'uploads')));

// API Routes
app.use('/api', apiRoutes);

// Serve HTML pages
app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'public', 'index.html')));
app.get('/shop', (req, res) => res.sendFile(path.join(__dirname, 'public', 'shop.html')));
app.get('/product/:id', (req, res) => res.sendFile(path.join(__dirname, 'public', 'product.html')));
app.get('/cart', (req, res) => res.sendFile(path.join(__dirname, 'public', 'cart.html')));
app.get('/checkout', (req, res) => res.sendFile(path.join(__dirname, 'public', 'checkout.html')));
app.get('/about', (req, res) => res.sendFile(path.join(__dirname, 'public', 'about.html')));
app.get('/contact', (req, res) => res.sendFile(path.join(__dirname, 'public', 'contact.html')));
app.get('/privacy', (req, res) => res.sendFile(path.join(__dirname, 'public', 'privacy.html')));
app.get('/terms', (req, res) => res.sendFile(path.join(__dirname, 'public', 'terms.html')));
app.get('/dmca', (req, res) => res.sendFile(path.join(__dirname, 'public', 'dmca.html')));
app.get('/rss', (req, res) => res.sendFile(path.join(__dirname, 'public', 'rss.html')));
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/register', (req, res) => res.sendFile(path.join(__dirname, 'public', 'register.html')));
app.get('/profile-picture', (req, res) => res.sendFile(path.join(__dirname, 'public', 'profile-picture.html')));
app.get('/account', (req, res) => res.sendFile(path.join(__dirname, 'public', 'account.html')));
app.get('/admin', (req, res) => res.sendFile(path.join(__dirname, 'public', 'admin.html')));

// RSS XML Feed
app.get('/feed.xml', async (req, res) => {
  const products = await db.allAsync('SELECT * FROM products ORDER BY created_at DESC LIMIT 20');
  let rss = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>Chen Electronic - Electronics &amp; Gadgets</title>
    <link>http://localhost:${PORT}</link>
    <description>Latest electronics and gadgets from Chen Electronic</description>
    <language>en-us</language>
    <lastBuildDate>${new Date().toUTCString()}</lastBuildDate>
    <atom:link href="http://localhost:${PORT}/feed.xml" rel="self" type="application/rss+xml"/>`;

  products.forEach(p => {
    rss += `
    <item>
      <title>${p.name}</title>
      <link>http://localhost:${PORT}/product/${p.id}</link>
      <description><![CDATA[${p.description}]]></description>
      <pubDate>${new Date(p.created_at).toUTCString()}</pubDate>
      <guid>http://localhost:${PORT}/product/${p.id}</guid>
      <category>${p.category}</category>
    </item>`;
  });

  rss += `
  </channel>
</rss>`;

  res.set('Content-Type', 'application/xml');
  res.send(rss);
});

// Initialize database and start server
(async () => {
  try {
    // Create tables
    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS products (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        slug TEXT UNIQUE,
        description TEXT,
        price REAL NOT NULL,
        sale_price REAL,
        category TEXT,
        brand TEXT,
        image TEXT,
        images TEXT,
        stock INTEGER DEFAULT 0,
        rating REAL DEFAULT 0,
        reviews_count INTEGER DEFAULT 0,
        featured INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        phone TEXT,
        address TEXT,
        city TEXT,
        country TEXT,
        profile_pic TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER,
        items TEXT NOT NULL,
        total REAL NOT NULL,
        status TEXT DEFAULT 'pending',
        shipping_name TEXT,
        shipping_email TEXT,
        shipping_phone TEXT,
        shipping_address TEXT,
        shipping_city TEXT,
        shipping_country TEXT,
        shipping_zip TEXT,
        payment_method TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id)
      )
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        product_id INTEGER NOT NULL,
        user_name TEXT NOT NULL,
        rating INTEGER NOT NULL,
        comment TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (product_id) REFERENCES products(id)
      )
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.runAsync(`
      CREATE TABLE IF NOT EXISTS newsletter (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Add profile_pic column to users table if it doesn't exist (migration)
    try {
      await db.runAsync(`ALTER TABLE users ADD COLUMN profile_pic TEXT`);
    } catch (err) {
      // Column already exists, ignore error
      if (!err.message.includes('duplicate column name')) {
        console.warn('Migration note:', err.message);
      }
    }

    // Auto-create admin account if it doesn't exist
    const bcrypt = require('bcryptjs');
    const adminUser = await db.getAsync('SELECT id FROM users WHERE email = ?', ['admin@chenelectronic.com']);
    if (!adminUser) {
      const hashedPassword = await bcrypt.hash('admin123', 10);
      await db.runAsync(
        'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
        ['Admin User', 'admin@chenelectronic.com', hashedPassword]
      );
      console.log('✅ Admin account auto-created:');
      console.log('   Email: admin@chenelectronic.com');
      console.log('   Password: admin123');
    }

    // Check if products exist, if not seed them
    const row = await db.getAsync('SELECT COUNT(*) as count FROM products');
    if (row.count === 0) {
      console.log('No products found. Running seed...');
      require('./seed');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Chen Electronic server running at http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  }
})();
