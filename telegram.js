require('dotenv').config();
const https = require('https');

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

// Function to send message to Telegram group
async function sendTelegramMessage(message) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    console.warn('Telegram credentials not configured');
    return false;
  }

  try {
    const url = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
    
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
              console.log('✓ Telegram message sent successfully');
              resolve(true);
            } else {
              console.error('Telegram error:', result.description);
              reject(new Error(result.description));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (error) => {
        console.error('Telegram request error:', error);
        reject(error);
      });

      req.write(data);
      req.end();
    });
  } catch (error) {
    console.error('Error sending Telegram message:', error);
    return false;
  }
}

// Function to format order notification
function formatOrderNotification(order) {
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
}

module.exports = {
  sendTelegramMessage,
  formatOrderNotification
};
