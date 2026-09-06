// backend/set-password.js
import bcrypt from 'bcrypt';
import pool from './lib/db.js';

async function setPasswords() {
  const users = [
    { email: 'samuel.stormzy1@gmail.com', password: 'Sam12345@' },
    { email: 'samuel@sahmtickethub.online', password: 'Admin@123' },
    { email: 'sam.davidii19@gmail.com', password: 'Sam12345@' },

  ];
  for (const user of users) {
    const hashed = await bcrypt.hash(user.password, 10);
    await pool.query(
      `UPDATE profiles SET password = ?, is_verified = 1 WHERE email = ?`,
      [hashed, user.email]
    );
    console.log(`✅ Password set for ${user.email}`);
  }
  process.exit(0);
}
setPasswords().catch(err => { console.error(err); process.exit(1); });