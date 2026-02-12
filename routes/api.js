const express = require('express');
const router = express.Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Setup multer for profile picture uploads
const uploadDir = path.join(__dirname, '..', 'public', 'uploads', 'profiles');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    const uniqueName = `${Date.now()}-${Math.round(Math.random() * 1E9)}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

const upload = multer({ 
  storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'));
    }
  }
});

// Admin middleware
const isAdmin = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    if (decoded.email !== 'admin@chenelectronic.com') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// ============ ADMIN ROUTES ============
router.get('/admin/stats', isAdmin, async (req, res) => {
  try {
    const products = await db.getAsync('SELECT COUNT(*) as count FROM products');
    const orders = await db.getAsync('SELECT COUNT(*) as count FROM orders');
    const users = await db.getAsync('SELECT COUNT(*) as count FROM users');
    const newsletter = await db.getAsync('SELECT COUNT(*) as count FROM newsletter');
    
    res.json({
      products: products.count,
      orders: orders.count,
      users: users.count,
      newsletter: newsletter.count
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/products', isAdmin, async (req, res) => {
  try {
    const { name, slug, description, price, sale_price, category, brand, image, stock, featured } = req.body;
    const result = await db.runAsync(
      `INSERT INTO products (name, slug, description, price, sale_price, category, brand, image, stock, featured)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [name, slug, description, price, sale_price || null, category, brand, image, stock, featured || 0]
    );
    res.json({ success: true, id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/products/:id', isAdmin, async (req, res) => {
  try {
    const { name, description, price, sale_price, category, brand, image, stock, featured } = req.body;
    await db.runAsync(
      `UPDATE products SET name=?, description=?, price=?, sale_price=?, category=?, brand=?, image=?, stock=?, featured=?
       WHERE id=?`,
      [name, description, price, sale_price || null, category, brand, image, stock, featured || 0, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/products/:id', isAdmin, async (req, res) => {
  try {
    await db.runAsync('DELETE FROM products WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/orders', isAdmin, async (req, res) => {
  try {
    const orders = await db.allAsync('SELECT * FROM orders ORDER BY created_at DESC');
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/orders/:id', isAdmin, async (req, res) => {
  try {
    const order = await db.getAsync('SELECT * FROM orders WHERE id=?', [req.params.id]);
    if (!order) return res.status(404).json({ error: 'Order not found' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/orders', isAdmin, async (req, res) => {
  try {
    const { shipping_name, shipping_email, shipping_phone, shipping_address, shipping_city, 
            shipping_country, shipping_zip, total, payment_method, status, items } = req.body;
    const result = await db.runAsync(
      `INSERT INTO orders (items, total, status, shipping_name, shipping_email, shipping_phone,
                          shipping_address, shipping_city, shipping_country, shipping_zip, payment_method)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [items || '[]', total, status || 'pending', shipping_name, shipping_email, shipping_phone,
       shipping_address, shipping_city, shipping_country, shipping_zip, payment_method]
    );
    res.json({ success: true, id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/orders/:id', isAdmin, async (req, res) => {
  try {
    const { status } = req.body;
    await db.runAsync('UPDATE orders SET status=? WHERE id=?', [status, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/orders/:id/full', isAdmin, async (req, res) => {
  try {
    const { shipping_name, shipping_email, shipping_phone, shipping_address, shipping_city,
            shipping_country, shipping_zip, total, payment_method, status } = req.body;
    await db.runAsync(
      `UPDATE orders SET shipping_name=?, shipping_email=?, shipping_phone=?, shipping_address=?,
                        shipping_city=?, shipping_country=?, shipping_zip=?, total=?, payment_method=?, status=?
       WHERE id=?`,
      [shipping_name, shipping_email, shipping_phone, shipping_address, shipping_city,
       shipping_country, shipping_zip, total, payment_method, status, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/orders/:id', isAdmin, async (req, res) => {
  try {
    await db.runAsync('DELETE FROM orders WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/users', isAdmin, async (req, res) => {
  try {
    const users = await db.allAsync('SELECT id, name, email, phone, address, city, country, created_at FROM users ORDER BY created_at DESC');
    res.json(users);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/users/:id', isAdmin, async (req, res) => {
  try {
    const user = await db.getAsync('SELECT id, name, email, phone, address, city, country FROM users WHERE id=?', [req.params.id]);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.post('/admin/users', isAdmin, async (req, res) => {
  try {
    const { name, email, password, phone, address, city, country } = req.body;
    const hashedPassword = await bcrypt.hash(password, 10);
    const result = await db.runAsync(
      'INSERT INTO users (name, email, password, phone, address, city, country) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [name, email, hashedPassword, phone, address, city, country]
    );
    res.json({ success: true, id: result.lastID });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/users/:id', isAdmin, async (req, res) => {
  try {
    const { name, email, phone, address, city, country } = req.body;
    await db.runAsync(
      'UPDATE users SET name=?, email=?, phone=?, address=?, city=?, country=? WHERE id=?',
      [name, email, phone, address, city, country, req.params.id]
    );
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/users/:id', isAdmin, async (req, res) => {
  try {
    await db.runAsync('DELETE FROM users WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/reviews', isAdmin, async (req, res) => {
  try {
    const reviews = await db.allAsync(`
      SELECT r.*, p.name as product_name 
      FROM reviews r 
      LEFT JOIN products p ON r.product_id = p.id 
      ORDER BY r.created_at DESC
    `);
    res.json(reviews);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/reviews/:id', isAdmin, async (req, res) => {
  try {
    const review = await db.getAsync('SELECT * FROM reviews WHERE id=?', [req.params.id]);
    if (!review) return res.status(404).json({ error: 'Review not found' });
    res.json(review);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/admin/reviews/:id', isAdmin, async (req, res) => {
  try {
    const { product_id, user_name, rating, comment } = req.body;
    await db.runAsync(
      'UPDATE reviews SET product_id=?, user_name=?, rating=?, comment=? WHERE id=?',
      [product_id, user_name, rating, comment, req.params.id]
    );
    
    // Update product rating
    const reviews = await db.getAsync('SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE product_id = ?', [product_id]);
    await db.runAsync('UPDATE products SET rating = ?, reviews_count = ? WHERE id = ?', [reviews.avg_rating, reviews.count, product_id]);
    
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/reviews/:id', isAdmin, async (req, res) => {
  try {
    await db.runAsync('DELETE FROM reviews WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/contacts', isAdmin, async (req, res) => {
  try {
    const contacts = await db.allAsync('SELECT * FROM contacts ORDER BY created_at DESC');
    res.json(contacts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/contacts/:id', isAdmin, async (req, res) => {
  try {
    await db.runAsync('DELETE FROM contacts WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.get('/admin/newsletter', isAdmin, async (req, res) => {
  try {
    const subscribers = await db.allAsync('SELECT * FROM newsletter ORDER BY created_at DESC');
    res.json(subscribers);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/newsletter/:id', isAdmin, async (req, res) => {
  try {
    await db.runAsync('DELETE FROM newsletter WHERE id=?', [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.delete('/admin/categories/:category', isAdmin, async (req, res) => {
  try {
    await db.runAsync('DELETE FROM products WHERE category=?', [req.params.category]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ PRODUCTS ============
router.get('/products', async (req, res) => {
  const { category, search, featured, limit = 50, page = 1 } = req.query;
  let query = 'SELECT * FROM products WHERE 1=1';
  const params = [];

  if (category) {
    query += ' AND category = ?';
    params.push(category);
  }
  if (search) {
    query += ' AND (name LIKE ? OR description LIKE ?)';
    params.push(`%${search}%`, `%${search}%`);
  }
  if (featured) {
    query += ' AND featured = 1';
  }

  query += ' ORDER BY created_at DESC LIMIT ? OFFSET ?';
  params.push(parseInt(limit), (parseInt(page) - 1) * parseInt(limit));

  const products = await db.allAsync(query, params);
  
  const countQuery = 'SELECT COUNT(*) as total FROM products WHERE 1=1' +
    (category ? ' AND category = ?' : '') +
    (search ? ' AND (name LIKE ? OR description LIKE ?)' : '') +
    (featured ? ' AND featured = 1' : '');
  
  const countParams = [];
  if (category) countParams.push(category);
  if (search) countParams.push(`%${search}%`, `%${search}%`);
  
  const { total } = await db.getAsync(countQuery, countParams);

  res.json({ products, total, page: parseInt(page), totalPages: Math.ceil(total / parseInt(limit)) });
});

router.get('/products/:id', async (req, res) => {
  const product = await db.getAsync('SELECT * FROM products WHERE id = ?', [req.params.id]);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  
  const reviews = await db.allAsync('SELECT * FROM reviews WHERE product_id = ? ORDER BY created_at DESC', [req.params.id]);
  const relatedProducts = await db.allAsync('SELECT * FROM products WHERE category = ? AND id != ? LIMIT 4', [product.category, product.id]);
  
  res.json({ product, reviews, relatedProducts });
});

router.get('/categories', async (req, res) => {
  const categories = await db.allAsync('SELECT DISTINCT category, COUNT(*) as count FROM products GROUP BY category');
  res.json(categories);
});

// ============ REVIEWS ============
router.post('/reviews', async (req, res) => {
  const { product_id, user_name, rating, comment } = req.body;
  
  if (!product_id || !user_name || !rating) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const result = await db.runAsync('INSERT INTO reviews (product_id, user_name, rating, comment) VALUES (?, ?, ?, ?)', 
    [product_id, user_name, rating, comment]);

  // Update product rating
  const reviews = await db.getAsync('SELECT AVG(rating) as avg_rating, COUNT(*) as count FROM reviews WHERE product_id = ?', [product_id]);
  await db.runAsync('UPDATE products SET rating = ?, reviews_count = ? WHERE id = ?', [reviews.avg_rating, reviews.count, product_id]);

  res.json({ success: true, id: result.lastID });
});

// ============ ORDERS ============
router.post('/orders', async (req, res) => {
  const { user_id, items, total, shipping, payment_method } = req.body;
  
  if (!items || !total || !shipping) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const result = await db.runAsync(`
    INSERT INTO orders (user_id, items, total, shipping_name, shipping_email, shipping_phone, 
                       shipping_address, shipping_city, shipping_country, shipping_zip, payment_method)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `, [
    user_id || null,
    JSON.stringify(items),
    total,
    shipping.name,
    shipping.email,
    shipping.phone,
    shipping.address,
    shipping.city,
    shipping.country,
    shipping.zip,
    payment_method
  ]);

  res.json({ success: true, order_id: result.lastID });
});

router.get('/orders/:id', async (req, res) => {
  const order = await db.getAsync('SELECT * FROM orders WHERE id = ?', [req.params.id]);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  
  order.items = JSON.parse(order.items);
  res.json(order);
});

// ============ USERS ============
router.post('/auth/register', async (req, res) => {
  const { name, email, password } = req.body;
  
  if (!name || !email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const existing = await db.getAsync('SELECT * FROM users WHERE email = ?', [email]);
  if (existing) {
    return res.status(400).json({ error: 'Email already registered' });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  const result = await db.runAsync('INSERT INTO users (name, email, password) VALUES (?, ?, ?)', [name, email, hashedPassword]);

  const token = jwt.sign({ id: result.lastID, email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: { id: result.lastID, name, email, profile_pic: null } });
});

router.post('/auth/login', async (req, res) => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const user = await db.getAsync('SELECT * FROM users WHERE email = ?', [email]);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '7d' });
  res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, profile_pic: user.profile_pic } });
});

router.get('/auth/me', async (req, res) => {
  const token = req.headers.authorization?.split(' ')[1];
  
  if (!token) {
    return res.status(401).json({ error: 'No token provided' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await db.getAsync('SELECT id, name, email, profile_pic FROM users WHERE id = ?', [decoded.id]);
    res.json({ success: true, user });
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
});

// ============ CONTACT ============
router.post('/contact', async (req, res) => {
  const { name, email, subject, message } = req.body;
  
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  await db.runAsync('INSERT INTO contacts (name, email, subject, message) VALUES (?, ?, ?, ?)', [name, email, subject || '', message]);

  res.json({ success: true, message: 'Message sent successfully!' });
});

// ============ PROFILE PICTURE UPLOAD ============
router.post('/profile-picture/upload', upload.single('profile_pic'), async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const userId = decoded.id;

    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Get old profile picture if exists and delete it
    const user = await db.getAsync('SELECT profile_pic FROM users WHERE id = ?', [userId]);
    if (user && user.profile_pic) {
      const oldPath = path.join(__dirname, '..', 'public', user.profile_pic);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    // Save new profile picture path to database
    const profilePicPath = `/uploads/profiles/${req.file.filename}`;
    await db.runAsync('UPDATE users SET profile_pic = ? WHERE id = ?', [profilePicPath, userId]);

    res.json({ success: true, profile_pic: profilePicPath });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ============ NEWSLETTER ============
router.post('/newsletter', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email is required' });
  }

  try {
    await db.runAsync('INSERT INTO newsletter (email) VALUES (?)', [email]);
    res.json({ success: true, message: 'Subscribed successfully!' });
  } catch (err) {
    if (err.message.includes('UNIQUE')) {
      res.status(400).json({ error: 'Email already subscribed' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

module.exports = router;
