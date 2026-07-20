import { readDb } from '../db-adapter.js';

async function check() {
  const db = await readDb();
  console.log("=== Admins in db.admins ===");
  console.log(db.admins);

  console.log("=== Players with isAdmin flag ===");
  const adminPlayers = (db.players || []).filter(p => p.isAdmin === true);
  console.log(adminPlayers);

  console.log("=== Players matching admin emails ===");
  const adminEmails = ['halilfarhat102@gmail.com', 'management135790@gmail.com'];
  const emailPlayers = (db.players || []).filter(p => adminEmails.includes(p.email));
  console.log(emailPlayers);
}

check();
