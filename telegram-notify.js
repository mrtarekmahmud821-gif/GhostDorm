// telegram-notify.js

// আপনার টেলিগ্রাম বট টোকেন দিয়ে রিপ্লেস করুন
const BOT_TOKEN = "YOUR_TELEGRAM_BOT_TOKEN_HERE"; 

/**
 * শুধুমাত্র একটি নির্দিষ্ট ম্যাচে জয়েন করা প্লেয়ারদের টেলিগ্রামে মেসেজ পাঠায়
 * @param {Array} playersList - ম্যাচে জয়েন করা প্লেয়ার অবজেক্ট বা টেলিগ্রাম আইডি তালিকা
 * @param {String} matchTitle - ম্যাচের নাম
 * @param {String} roomId - রুম আইডি
 * @param {String} roomPass - রুম পাসওয়ার্ড
 */
export async function notifyJoinedPlayers(playersList, matchTitle, roomId, roomPass) {
  if (!playersList || playersList.length === 0) {
    alert("এই ম্যাচে কোনো প্লেয়ার জয়েন করেনি। নোটিফিকেশন পাঠানো হয়নি।");
    return;
  }

  const messageText = `🎮 *FREE FIRE MATCH ROOM DETAILS* 🎮\n\n` +
                      `🏆 *Match:* ${matchTitle}\n` +
                      `🆔 *Room ID:* \`${roomId}\`\n` +
                      `🔑 *Password:* \`${roomPass}\`\n\n` +
                      `⚠️ *নোট:* দ্রুত গেমে জয়েন করুন! আইডি ও পাসওয়ার্ড কারও সাথে শেয়ার করবেন না।`;

  let sentCount = 0;

  for (const player of playersList) {
    // প্লেয়ারের টেলিগ্রাম চ্যাট আইডি সংগ্রহ
    const chatId = player.telegram_id || player.user_id || player.id;

    if (chatId) {
      try {
        const url = `https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`;
        await fetch(url, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: chatId,
            text: messageText,
            parse_mode: "Markdown"
          })
        });
        sentCount++;
      } catch (err) {
        console.error(`Failed to send message to ${chatId}:`, err);
      }
    }
  }

  alert(`সাফল্যের সাথে ${sentCount} জন জয়েন করা প্লেয়ারের টেলিগ্রামে রুম ডিটেইলস পাঠানো হয়েছে!`);
}
