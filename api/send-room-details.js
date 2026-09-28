// api/send-room-details.js

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { adminUid, adminEmail, playersList, matchTitle, roomId, roomPass } = req.body;

  // ১. এডমিন সিকিউরিটি ভেরিফিকেশন
  if (adminEmail !== 'tarekmahmud821@gmail.com' || adminUid !== 'pLzFxDLJHAQHkjkLRZahcFIcCLD2') {
    return res.status(403).json({ error: 'শুধুমাত্র এডমিন এই মেসেজ পাঠাতে পারবে!' });
  }

  // ২. Vercel Environment Variable থেকে টোকেন সংগ্রহ
  const BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
  if (!BOT_TOKEN) {
    return res.status(500).json({ error: 'Vercel এ TELEGRAM_BOT_TOKEN সেটিং করা নেই।' });
  }

  if (!playersList || playersList.length === 0) {
    return res.status(400).json({ error: 'এই ম্যাচে কোনো প্লেয়ার জয়েন করেনি।' });
  }

  const messageText = `🎮 *FREE FIRE MATCH ROOM DETAILS* 🎮\n\n` +
                      `🏆 *Match:* ${matchTitle}\n` +
                      `🆔 *Room ID:* \`${roomId}\`\n` +
                      `🔑 *Password:* \`${roomPass}\`\n\n` +
                      `⚠️ *নোট:* দ্রুত গেমে জয়েন করুন! আইডি ও পাসওয়ার্ড কারও সাথে শেয়ার করবেন না।`;

  let sentCount = 0;

  // ৩. শুধু নির্দিষ্ট ম্যাচে জয়েন করা প্লেয়ারদের আইডি ফিল্টার করে মেসেজ পাঠানো
  for (const player of playersList) {
    const chatId = player.telegram_id || player.user_id || player.id;

    if (chatId) {
      try {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageText,
            parse_mode: 'Markdown'
          })
        });
        sentCount++;
      } catch (err) {
        console.error(`Failed to send to ${chatId}:`, err);
      }
    }
  }

  return res.status(200).json({ success: true, count: sentCount });
}
