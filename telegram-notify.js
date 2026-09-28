// telegram-notify.js

/**
 * শুধুমাত্র নির্দিষ্ট ম্যাচে জয়েন করা প্লেয়ারদের নোটিফিকেশন পাঠাতে
 */
export async function notifyJoinedPlayers(playersList, matchTitle, roomId, roomPass, adminUser) {
  if (!playersList || playersList.length === 0) {
    alert("এই ম্যাচে কোনো প্লেয়ার জয়েন করেনি।");
    return;
  }

  if (!roomId || !roomPass) {
    alert("রুম আইডি এবং পাসওয়ার্ড পূরণ করুন!");
    return;
  }

  try {
    // Vercel Serverless API কল করা
    const response = await fetch('/api/send-room-details', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        adminUid: adminUser?.uid || 'pLzFxDLJHAQHkjkLRZahcFIcCLD2',
        adminEmail: adminUser?.email || 'tarekmahmud821@gmail.com',
        playersList: playersList, // শুধু ওই নির্দিষ্ট ম্যাচের প্লেয়ারদের লিস্ট
        matchTitle: matchTitle,
        roomId: roomId,
        roomPass: roomPass
      })
    });

    const data = await response.json();

    if (response.ok) {
      alert(`সাফল্যের সাথে ${data.count} জন জয়েন করা প্লেয়ারের টেলিগ্রামে রুম ডিটেইলস পাঠানো হয়েছে!`);
    } else {
      alert(`এরর: ${data.error}`);
    }
  } catch (error) {
    console.error("Notification Error:", error);
    alert("মেসেজ পাঠাতে সমস্যা হয়েছে। ইন্টারনেট চেক করুন।");
  }
}
