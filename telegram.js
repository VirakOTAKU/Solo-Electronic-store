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
      `💳 ${item.name}\nQty: ${item.quantity} | Price: $${(item.price * item.quantity).toFixed(2)}`
    ).join('\n\n');

    const message = `📦 <b>New Order Received!</b>

<b>Order #${order.id}</b>

👤 <b>Customer:</b> ${order.shipping_name}
📧 <b>Email:</b> ${order.shipping_email}
📞 <b>Phone:</b> ${order.shipping_phone}

📍 <b>Shipping Address:</b>
${order.shipping_address}
${order.shipping_city}, ${order.shipping_country} ${order.shipping_zip}

🛒 <b>Items:</b>
${itemsList}

💰 <b>Total:</b> $${parseFloat(order.total).toFixed(2)}
💳 <b>Payment:</b> ${order.payment_method.replace(/_/g, ' ').toUpperCase()}
✅ <b>Status:</b> ${order.status}
📅 <b>Date:</b> ${new Date(order.created_at).toLocaleString()}`;

    if (!message || message.trim().length === 0) {
      throw new Error('Message is empty after formatting');
    }
    
    return message;
  } catch (error) {
    console.error('✗ [FORMAT] Error formatting order:', error.message);
    throw error;
  }
}

module.exports = {
  sendTelegramMessage,
  formatOrderNotification,
  sendOrderWithImages: async function(order) {
    try {
      // FIRST: Send main order notification (text) - most important
      const message = formatOrderNotification(order);
      await sendTelegramMessage(message);
      console.log('✓ [TELEGRAM] Order message sent');
      
      // THEN: Try to send product images (optional, won't block if fails)
      try {
        const items = typeof order.items === 'string' ? JSON.parse(order.items) : order.items;
        for (const item of items) {
          if (item.image) {
            try {
              // Construct full image URL
              const imageUrl = item.image.startsWith('http') 
                ? item.image 
                : `${process.env.BASE_URL || 'https://chenelectronic.vercel.app'}${item.image}`;
              
              const caption = `📸 <b>${item.name}</b>\nQty: ${item.quantity}\nPrice: $${(item.price * item.quantity).toFixed(2)}`;
              await sendProductImage(imageUrl, caption);
              
              // Add small delay between images
              await new Promise(resolve => setTimeout(resolve, 300));
            } catch (imgErr) {
              console.warn('⚠️  [TELEGRAM] Couldn\'t send image for ' + item.name + ':', imgErr.message);
              // Continue with other images even if one fails
            }
          }
        }
      } catch (imgError) {
        console.warn('⚠️  [TELEGRAM] Image sending failed, but main message was sent:', imgError.message);
      }
    } catch (error) {
      console.error('✗ [TELEGRAM] Critical error sending order:', error.message);
      throw error;
    }
  }
};

// Function to send product image
async function sendProductImage(imageUrl, caption) {
  if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
    return false;
  }

  try {
    const data = JSON.stringify({
      chat_id: TELEGRAM_CHAT_ID,
      photo: imageUrl,
      caption: caption,
      parse_mode: 'HTML'
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${TELEGRAM_BOT_TOKEN}/sendPhoto`,
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
              console.log('✓ [TELEGRAM] Product image sent');
              resolve(true);
            } else {
              console.error('✗ [TELEGRAM] Image error:', result.description);
              reject(new Error(result.description));
            }
          } catch (e) {
            reject(e);
          }
        });
      });

      req.on('error', (error) => {
        console.error('✗ [TELEGRAM] Image request error:', error.message);
        reject(error);
      });

      req.write(data);
      req.end();
    });
  } catch (error) {
    console.error('✗ [TELEGRAM] Error sending image:', error.message);
    return false;
  }
}
