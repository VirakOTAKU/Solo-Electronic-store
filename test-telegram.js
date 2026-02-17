require('dotenv').config();
const { sendTelegramMessage } = require('./telegram');

// Test Telegram connection
async function testTelegram() {
  console.log('Testing Telegram connection...');
  console.log('Bot Token:', process.env.TELEGRAM_BOT_TOKEN ? '✓ Loaded' : '✗ Missing');
  console.log('Chat ID:', process.env.TELEGRAM_CHAT_ID ? `✓ ${process.env.TELEGRAM_CHAT_ID}` : '✗ Missing');

  try {
    const testMessage = `<b>✅ Test Message</b>\n\nIf you see this in your group, Telegram notifications are working!\n\n<i>Sent at: ${new Date().toLocaleString()}</i>`;
    await sendTelegramMessage(testMessage);
    console.log('✓ Test message sent to group successfully!');
  } catch (error) {
    console.error('✗ Error sending test message:', error.message);
  }
}

testTelegram();
