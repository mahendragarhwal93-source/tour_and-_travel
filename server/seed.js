const bcrypt = require('bcryptjs');
const db = require('./db');

const img = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=70`;

const destinations = [
  ['Goa', 'India', 'Beach', 'Sun, sand and Portuguese heritage. Lively beaches, seafood shacks and old churches.', img('photo-1512343879784-a960bf40e7f2'), 3500, 4.6, 'Nov - Feb', 'Baga Beach,Fort Aguada,Old Goa Churches,Water sports'],
  ['Manali', 'India', 'Mountain', 'Himalayan valley town with snow peaks, adventure sports and apple orchards.', img('photo-1626621341517-bbf3d9990a23'), 3000, 4.5, 'Mar - Jun', 'Solang Valley,Rohtang Pass,Hadimba Temple,Paragliding'],
  ['Jaipur', 'India', 'Heritage', 'The Pink City: grand forts, palaces and vibrant bazaars of Rajasthan.', img('photo-1477587458883-47145ed94245'), 2800, 4.4, 'Oct - Mar', 'Amer Fort,Hawa Mahal,City Palace,Jantar Mantar'],
  ['Kerala Backwaters', 'India', 'Nature', 'Houseboat cruises through calm backwaters, coconut groves and spice gardens.', img('photo-1602216056096-3b40cc0c9944'), 3800, 4.7, 'Sep - Mar', 'Alleppey houseboat,Munnar tea hills,Ayurveda spa,Kathakali'],
  ['Leh Ladakh', 'India', 'Adventure', 'High-altitude desert with monasteries, blue lakes and epic road trips.', img('photo-1506038634487-60a69ae4b7b1'), 4500, 4.8, 'Jun - Sep', 'Pangong Lake,Nubra Valley,Khardung La,Thiksey Monastery'],
  ['Rishikesh', 'India', 'Adventure', 'Yoga capital of the world with Ganga rafting, bungee and evening aarti.', img('photo-1545126178-862cdb469409'), 2200, 4.3, 'Sep - Apr', 'River rafting,Laxman Jhula,Ganga Aarti,Yoga retreats'],
  ['Bali', 'Indonesia', 'Beach', 'Island of temples, rice terraces, surf beaches and wellness retreats.', img('photo-1537996194471-e657df975ab4'), 6500, 4.7, 'Apr - Oct', 'Ubud,Tanah Lot,Uluwatu,Nusa Penida'],
  ['Dubai', 'UAE', 'City', 'Futuristic skyline, desert safaris, luxury shopping and golden beaches.', img('photo-1512453979798-5ea266f8880c'), 9000, 4.6, 'Nov - Mar', 'Burj Khalifa,Desert Safari,Dubai Mall,Palm Jumeirah'],
  ['Paris', 'France', 'City', 'City of Light: art, cafes, the Eiffel Tower and romantic Seine walks.', img('photo-1502602898657-3e91760cbb34'), 12000, 4.7, 'Apr - Jun', 'Eiffel Tower,Louvre,Montmartre,Seine cruise'],
  ['Swiss Alps', 'Switzerland', 'Mountain', 'Fairytale villages, scenic trains and glacier-capped peaks.', img('photo-1531366936337-7c912a4589a7'), 16000, 4.9, 'Dec - Mar', 'Jungfraujoch,Interlaken,Lucerne,Matterhorn'],
  ['Maldives', 'Maldives', 'Beach', 'Overwater villas, turquoise lagoons and world-class snorkelling.', img('photo-1514282401047-d79a71a590e8'), 15000, 4.9, 'Nov - Apr', 'Overwater villa,Snorkelling,Sunset cruise,Spa'],
  ['Kyoto', 'Japan', 'Heritage', 'Ancient temples, geisha districts and spectacular cherry blossoms.', img('photo-1493976040374-85c8e12f0c0e'), 11000, 4.8, 'Mar - May', 'Fushimi Inari,Kinkaku-ji,Arashiyama,Gion'],
  ['Santorini', 'Greece', 'Beach', 'White-washed cliffside villages, blue domes and legendary sunsets.', img('photo-1570077188670-e3a8d69ac5ff'), 13000, 4.8, 'May - Oct', 'Oia sunset,Red Beach,Wine tasting,Caldera cruise'],
  ['Singapore', 'Singapore', 'City', 'Clean, green city-state with gardens, hawker food and theme parks.', img('photo-1525625293386-3f8f99389edd'), 8500, 4.5, 'Feb - Apr', 'Gardens by the Bay,Sentosa,Marina Bay Sands,Night Safari'],
  ['Andaman Islands', 'India', 'Beach', 'Pristine beaches, coral reefs and scuba diving in the Bay of Bengal.', img('photo-1589308078059-be1415eab4c3'), 5000, 4.6, 'Oct - May', 'Radhanagar Beach,Scuba diving,Cellular Jail,Havelock'],
  ['Varanasi', 'India', 'Heritage', 'One of the oldest living cities, famed for ghats and the Ganga aarti.', img('photo-1561359313-0639aad49ca6'), 2000, 4.4, 'Oct - Mar', 'Dashashwamedh Ghat,Boat ride,Kashi Vishwanath,Sarnath'],
];

function seedIfEmpty() {
  const count = db.prepare('SELECT COUNT(*) c FROM destinations').get().c;
  if (!count) {
    const ins = db.prepare(`INSERT INTO destinations (name, country, category, description, image, price_per_day, rating, best_season, highlights)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`);
    db.transaction(() => destinations.forEach(d => ins.run(...d)))();
    console.log(`Seeded ${destinations.length} destinations`);
  }
  if (!db.prepare("SELECT id FROM users WHERE email = 'admin@travel.com'").get()) {
    db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'admin')")
      .run('Admin', 'admin@travel.com', bcrypt.hashSync('admin123', 10));
    console.log('Created admin user: admin@travel.com / admin123');
  }
  if (!db.prepare("SELECT id FROM users WHERE email = 'demo@travel.com'").get()) {
    db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, 'user')")
      .run('Demo User', 'demo@travel.com', bcrypt.hashSync('demo123', 10));
    console.log('Created demo user: demo@travel.com / demo123');
  }
}

module.exports = { seedIfEmpty };

if (require.main === module) seedIfEmpty();
