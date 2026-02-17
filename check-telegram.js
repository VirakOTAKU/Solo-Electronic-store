require('dotenv').config();

console.log('=================================');
console.log('🔧 ENVIRONMENT CHECK');
console.log('=================================');
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('PORT:', process.env.PORT);
console.log('BASE_URL:', process.env.BASE_URL);
console.log('TELEGRAM_BOT_TOKEN:', process.env.TELEGRAM_BOT_TOKEN ? '✓ SET' : '✗ MISSING');
console.log('TELEGRAM_CHAT_ID:', process.env.TELEGRAM_CHAT_ID ? `✓ ${process.env.TELEGRAM_CHAT_ID}` : '✗ MISSING');
console.log('=================================\n');

const { sendTelegramMessage, formatOrderNotification } = require('./telegram');

// Create a test order object
const testOrder = {
  id: 999,
  shipping_name: 'Test User',
  shipping_email: 'test@example.com',
  shipping_phone: '123456789',
  shipping_address: 'Test Street',
  shipping_city: 'Test City',
  shipping_country: 'Test Country',
  shipping_zip: '12345',
  items: JSON.stringify([
    { id: 1, name: 'Test Product', quantity: 1, price: 100 }
  ]),
  total: 100,
  payment_method: 'test_payment',
  status: 'pending',
  created_at: new Date().toISOString()
};

async function test() {
  console.log('📤 Sending test Telegram message...\n');
  try {
    const message = formatOrderNotification(testOrder);
    console.log('Message preview:');
    console.log(message);
    console.log('\n');
    
    await sendTelegramMessage(message);
    console.log('✅ TEST PASSED - Message sent to Telegram!');
  } catch (error) {
    console.error('❌ TEST FAILED:', error.message);
  }
}

test();
