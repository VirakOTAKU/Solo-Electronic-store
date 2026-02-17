require('dotenv').config();
const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Function to send message to Telegram group
async function sendTelegramMessage(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('⚠️  [TELEGRAM] Missing credentials - Bot Token:', !!TELEGRAM_BOT_TOKEN, 'Chat ID:', !!TELEGRAM_CHAT_ID);
    return false;
  }

  try {
    console.log('📤 [TELEGRAM] Attempting to send message to chat:', TELEGRAM_CHAT_ID);
    
    const data = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      text: message,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    return new Promise((resolve, reject) => {
      const req = https.request(options, (res) => {
        let responseData = '';
        res.on('data', (chunk) => {
          responseData += chunk;
        });
        res.on('end', () => {
          try {
            const result = JSON.parse(responseData);
            if (result.ok) {
              console.log('✓ [TELEGRAM] Message sent successfully to chat', TELEGRAM_CHAT_ID);
              resolve(true);
            } else {
              console.error('✗ [TELEGRAM] API error:', result.description);
              reject(new Error(result.description));
            }
          } catch (e) {
            console.error('✗ [TELEGRAM] JSON parse error:', e.message);
            reject(e);
          }
        });
      });

      req.on('error', (error) => {
        console.error('✗ [TELEGRAM] Request error:', error.message);
        reject(error);
      });

      req.write(data);
      req.end();
    });
  } catch (error) {
    console.error('✗ [TELEGRAM] Catch error:', error.message);
    return false;
  }
}

// Function to format order notification
function formatOrderNotification(order) {
  try {
    const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
    const itemsList = items.map(item => 
      `• <b>${item.name}</b> x${item.quantity} - $${(item.price * item.quantity).toFixed(2)}`
    ).join('\n');

    const message = `
<b>📦 New Order Received!</b>

<b>Order ID:</b> #${order.id}
<b>Customer:</b> ${order.shipping_name}
<b>Email:</b> ${order.shipping_email}
<b>Phone:</b> ${order.shipping_phone}

<b>Shipping Address:</b>
${order.shipping_address}
${order.shipping_city}, ${order.shipping_country} ${order.shipping_zip}

<b>Items Ordered:</b>
${itemsList}

<b>Total Amount:</b> $${parseFloat(order.total).toFixed(2)}
<b>Payment Method:</b> ${order.payment_method}
<b>Status:</b> ${order.status}

<b>Date:</b> ${new Date(order.created_at).toLocaleString()}
`;

    return message;
  } catch (error) {
    console.error('✗ [FORMAT] Error formatting order:', error.message);
    throw error;
  }
}

module.exports = {
  sendTelegramMessage,
  formatOrderNotification
};
