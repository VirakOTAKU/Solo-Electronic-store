const db = require('./db');
const bcrypt = require('bcryptjs');

(async () => {
  try {
    const hashedPassword = await bcrypt.hash('admin123', 10);
    await db.runAsync(
      'INSERT OR REPLACE INTO users (id, name, email, password) VALUES (1, ?, ?, ?)',
      ['Admin User', 'admin@chenelectronic.com', hashedPassword]
    );
    console.log('✅ Admin user created successfully!');
    console.log('📧 Email: admin@chenelectronic.com');
    console.log('🔑 Password: admin123');
    process.exit(0);
  } catch (err) {
    console.error('❌ Error creating admin:', err.message);
    process.exit(1);
  }
})();
