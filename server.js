const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const bcrypt = require("bcrypt");

const app = express();
const saltRounds = 10;

app.use(cors({
    origin: ["http://localhost:5500", "http://127.0.0.1:5500", "http://localhost:3000"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

const db = new sqlite3.Database("./navigatr.db");

db.serialize(() => {
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    is_admin INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS games (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL,
    description TEXT,
    download_link TEXT,
    price DECIMAL(10,2) DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS user_favorites (
    user_id INTEGER,
    game_id INTEGER,
    added_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (game_id) REFERENCES games(id),
    PRIMARY KEY (user_id, game_id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS orders (
    order_id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    total_amount DECIMAL(10,2) DEFAULT 0,
    status TEXT DEFAULT 'pending',
    shipping_address TEXT,
    payment_method TEXT,
    payment_status TEXT DEFAULT 'pending',
    transaction_id TEXT,
    order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS order_items (
    item_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    game_id INTEGER NOT NULL,
    quantity INTEGER DEFAULT 1,
    price_at_purchase DECIMAL(10,2) NOT NULL,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (game_id) REFERENCES games(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS payments (
    payment_id INTEGER PRIMARY KEY AUTOINCREMENT,
    order_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method TEXT DEFAULT 'gcash',
    payment_status TEXT DEFAULT 'completed',
    transaction_id TEXT,
    payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(order_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  )`);

  db.run(`CREATE TABLE IF NOT EXISTS admin_logs (
    log_id INTEGER PRIMARY KEY AUTOINCREMENT,
    admin_id INTEGER NOT NULL,
    action_type TEXT NOT NULL,
    target_id INTEGER,
    details TEXT,
    log_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES users(id)
  )`);
  
  db.get("SELECT COUNT(*) as count FROM games", (err, row) => {
    if (err) {
      console.error(err);
      return;
    }
    
    if (row.count === 0) {
      const sampleGames = [
        ["Call of Duty MW3", "Action", "Military FPS combat.", "https://www.callofduty.com/", 599],
        ["God of War", "Action", "Kratos vs gods.", "https://store.playstation.com/", 699],
        ["Spider-Man", "Action", "Hero action.", "https://store.playstation.com/", 649],
        ["Devil May Cry 5", "Action", "Stylish combat.", "https://store.steampowered.com/app/601150/", 499],
        ["Sekiro", "Action", "Samurai revenge.", "https://store.steampowered.com/app/814380/", 699],
        ["Assassin Creed Mirage", "Action", "Stealth action.", "https://www.ubisoft.com/", 599],
        ["Batman Arkham Knight", "Action", "Be Batman.", "https://store.steampowered.com/app/208650/", 399],
        ["Ghost of Tsushima", "Action", "Samurai world.", "https://store.playstation.com/", 699],
        ["Far Cry 6", "Action", "Revolution shooter.", "https://www.ubisoft.com/", 549],
        ["Watch Dogs 2", "Action", "Hacker world.", "https://www.ubisoft.com/", 449],
        ["Need for Speed", "Racing", "Street racing.", "https://www.ea.com/", 549],
        ["Forza Horizon 5", "Racing", "Open world racing.", "https://store.steampowered.com/app/1551360/", 699],
        ["Gran Turismo 7", "Racing", "Real racing sim.", "https://store.playstation.com/", 699],
        ["F1 23", "Racing", "Formula racing.", "https://store.steampowered.com/app/2108330/", 599],
        ["Dirt 5", "Racing", "Off-road racing.", "https://store.steampowered.com/app/1038250/", 499],
        ["GTA V", "Open World", "Crime sandbox.", "https://store.steampowered.com/app/271590/", 699],
        ["Red Dead Redemption 2", "Open World", "Wild West story.", "https://store.steampowered.com/app/1174180/", 699],
        ["Cyberpunk 2077", "Open World", "Future RPG.", "https://store.steampowered.com/app/1091500/", 699],
        ["Minecraft", "Open World", "Sandbox survival.", "https://www.minecraft.net/", 499],
        ["Skyrim", "Open World", "Fantasy RPG world.", "https://store.steampowered.com/app/489830/", 399],
        ["Valorant", "FPS", "Tactical shooter.", "https://playvalorant.com/", 0],
        ["CSGO", "FPS", "Competitive FPS.", "https://store.steampowered.com/app/730/", 0],
        ["Overwatch 2", "FPS", "Hero shooter.", "https://overwatch.blizzard.com/", 0],
        ["Apex Legends", "FPS", "Battle royale FPS.", "https://store.steampowered.com/app/1172470/", 0],
        ["DOOM Eternal", "FPS", "Fast FPS combat.", "https://store.steampowered.com/app/782330/", 699],
        ["Elden Ring", "RPG", "Hard RPG.", "https://store.steampowered.com/app/1245620/", 699],
        ["The Witcher 3", "RPG", "Monster hunting.", "https://store.steampowered.com/app/292030/", 399],
        ["Dark Souls 3", "RPG", "Hard combat.", "https://store.steampowered.com/app/374320/", 699],
        ["Persona 5", "RPG", "School RPG.", "https://store.steampowered.com/", 499],
        ["Uncharted 4", "Adventure", "Treasure hunt.", "https://store.steampowered.com/app/1659420/", 599],
        ["Tomb Raider", "Adventure", "Explorer.", "https://store.steampowered.com/app/203160/", 399],
        ["The Last of Us", "Adventure", "Survival story.", "https://store.steampowered.com/", 699],
        ["Stray", "Adventure", "Play as cat.", "https://store.steampowered.com/app/1332010/", 499],
        ["Resident Evil 4", "Horror", "Zombie horror.", "https://store.steampowered.com/app/2050650/", 699],
        ["Outlast", "Horror", "Asylum horror.", "https://store.steampowered.com/app/238320/", 399],
        ["Phasmophobia", "Horror", "Ghost hunting.", "https://store.steampowered.com/app/739630/", 349],
        ["Dead Space", "Horror", "Space horror.", "https://store.steampowered.com/app/1693980/", 699]
      ];

      const insertStmt = db.prepare("INSERT INTO games (name, category, description, download_link, price) VALUES (?, ?, ?, ?, ?)");
      sampleGames.forEach(game => insertStmt.run(game));
      insertStmt.finalize();
      console.log("✅ Sample games inserted into database!");
    }
  });
  
  console.log("✅ Database tables ready");
});

// ================ GAMES API ================

app.get("/games", (req, res) => {
  db.all("SELECT * FROM games ORDER BY name", (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get("/games/category/:category", (req, res) => {
  const { category } = req.params;
  db.all("SELECT * FROM games WHERE category = ? ORDER BY name", [category], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

app.get("/games/:id", (req, res) => {
  const { id } = req.params;
  db.get("SELECT * FROM games WHERE id = ?", [id], (err, row) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      res.status(404).json({ error: "Game not found" });
      return;
    }
    res.json(row);
  });
});

app.post("/games", (req, res) => {
  const { name, category, description, download_link, price } = req.body;
  
  console.log("📌 [ADD GAME] Name:", name, "| Category:", category, "| Price: ₱" + price);
  
  if (!name || !category) {
    res.status(400).json({ error: "Name and category are required" });
    return;
  }
  
  db.run("INSERT INTO games (name, category, description, download_link, price) VALUES (?, ?, ?, ?, ?)",
    [name, category, description || "", download_link || "", price || 0],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      console.log("✅ [ADD GAME] Success! ID:", this.lastID, "-", name);
      res.json({ id: this.lastID, message: "Game added successfully!" });
    }
  );
});

app.delete("/games/:id", (req, res) => {
  const { id } = req.params;
  
  console.log("📌 [DELETE GAME] Attempting to delete ID:", id);
  
  db.run("DELETE FROM games WHERE id = ?", [id], function(err) {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    if (this.changes === 0) {
      res.status(404).json({ error: "Game not found" });
      return;
    }
    console.log("✅ [DELETE GAME] Success! ID:", id, "deleted");
    res.json({ message: "Game deleted successfully!" });
  });
});

app.put("/games/:id", (req, res) => {
  const { id } = req.params;
  const { name, category, description, download_link, price } = req.body;
  
  db.run("UPDATE games SET name = ?, category = ?, description = ?, download_link = ?, price = ? WHERE id = ?",
    [name, category, description, download_link, price, id],
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      if (this.changes === 0) {
        res.status(404).json({ error: "Game not found" });
        return;
      }
      res.json({ message: "Game updated successfully!" });
    }
  );
});

// ================ USER AUTHENTICATION API (WITH BCRYPT HASHING) ================

// User signup - with password hashing
app.post("/api/signup", (req, res) => {
  const { username, password } = req.body;
  
  console.log("📌 [SIGNUP] Attempt:", username);
  
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  
  // Hash the password before saving
  bcrypt.hash(password, saltRounds, (err, hash) => {
    if (err) {
      console.log("❌ [SIGNUP] Hashing error:", err.message);
      res.status(500).json({ error: "Error processing password" });
      return;
    }
    
    db.run("INSERT INTO users (username, password, is_admin) VALUES (?, ?, 0)", 
      [username, hash], 
      function(err) {
        if (err) {
          console.log("❌ [SIGNUP] Error:", err.message);
          if (err.message.includes("UNIQUE")) {
            res.status(400).json({ error: "Username already exists" });
          } else {
            res.status(500).json({ error: err.message });
          }
          return;
        }
        console.log("✅ [SIGNUP] Success! User:", username, "ID:", this.lastID);
        res.json({ id: this.lastID, username, message: "User created successfully" });
      }
    );
  });
});

// User login - with password comparison
app.post("/api/login", (req, res) => {
  const { username, password } = req.body;
  
  console.log("📌 [LOGIN] Attempt:", username);
  
  if (!username || !password) {
    res.status(400).json({ error: "Username and password required" });
    return;
  }
  
  // First get the user by username
  db.get("SELECT * FROM users WHERE username = ?", [username], (err, row) => {
    if (err) {
      console.log("❌ [LOGIN] Error:", err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    if (!row) {
      console.log("❌ [LOGIN] Failed: User not found -", username);
      res.status(401).json({ error: "Invalid username or password" });
      return;
    }
    
    // Compare the provided password with the stored hash
    bcrypt.compare(password, row.password, (err, result) => {
      if (err) {
        console.log("❌ [LOGIN] Compare error:", err.message);
        res.status(500).json({ error: "Error verifying password" });
        return;
      }
      
      if (!result) {
        console.log("❌ [LOGIN] Failed: Invalid password for", username);
        res.status(401).json({ error: "Invalid username or password" });
        return;
      }
      
      console.log("✅ [LOGIN] Success:", username, "| is_admin:", row.is_admin);
      res.json({ 
        id: row.id, 
        username: row.username, 
        is_admin: row.is_admin === 1,
        message: "Login successful" 
      });
    });
  });
});

app.post("/api/favorites", (req, res) => {
  const { user_id, game_id } = req.body;
  
  db.run("INSERT OR IGNORE INTO user_favorites (user_id, game_id) VALUES (?, ?)", 
    [user_id, game_id], 
    function(err) {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      res.json({ message: "Added to favorites" });
    }
  );
});

app.get("/api/favorites/:user_id", (req, res) => {
  const { user_id } = req.params;
  
  db.all(`
    SELECT g.* FROM games g
    JOIN user_favorites uf ON g.id = uf.game_id
    WHERE uf.user_id = ?
    ORDER BY g.name
  `, [user_id], (err, rows) => {
    if (err) {
      res.status(500).json({ error: err.message });
      return;
    }
    res.json(rows);
  });
});

// ================ ORDER AND PAYMENT API ================

app.post("/api/orders/create", (req, res) => {
  const { user_id, items, total_amount, shipping_address } = req.body;
  
  console.log("========================================");
  console.log("🛒 [NEW ORDER] User ID:", user_id);
  console.log("📦 Items:", items.length);
  console.log("💰 Total Amount: ₱" + total_amount);
  
  if (!user_id || !items || items.length === 0) {
    res.status(400).json({ error: "User ID and items are required" });
    return;
  }
  
  db.run(`INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_status) 
          VALUES (?, ?, 'pending', ?, 'pending')`, 
          [user_id, total_amount, shipping_address || ""], 
          function(err) {
    if (err) {
      res.json({ success: false, error: err.message });
      return;
    }
    
    const order_id = this.lastID;
    console.log("✅ [NEW ORDER] Order created! ID:", order_id);
    
    items.forEach(item => {
      db.run(`INSERT INTO order_items (order_id, game_id, quantity, price_at_purchase) 
              VALUES (?, ?, ?, ?)`, 
              [order_id, item.game_id, item.quantity, item.price]);
    });
    
    res.json({ success: true, order_id: order_id });
  });
});

app.post("/api/payment/gcash", (req, res) => {
  const { order_id, user_id, amount } = req.body;
  
  const transaction_id = "SIM-GCASH-" + Date.now();
  
  console.log("========================================");
  console.log("💳 [PAYMENT] Order ID:", order_id);
  console.log("👤 User ID:", user_id);
  console.log("💰 Amount: ₱" + amount);
  console.log("🆔 Transaction ID:", transaction_id);
  
  db.run(`INSERT INTO payments (order_id, user_id, amount, payment_method, payment_status, transaction_id) 
          VALUES (?, ?, ?, 'gcash', 'completed', ?)`, 
          [order_id, user_id, amount, transaction_id], 
          function(err) {
    if (err) {
      console.log("❌ [PAYMENT] Failed:", err.message);
      res.json({ success: false, error: err.message });
      return;
    }
    
    db.run(`UPDATE orders SET status = 'paid', payment_method = 'gcash', payment_status = 'completed', transaction_id = ? WHERE order_id = ?`, 
            [transaction_id, order_id]);
    
    console.log("✅ [PAYMENT] SUCCESS! Payment recorded for Order ID:", order_id);
    console.log("========================================");
    
    res.json({ 
      success: true, 
      payment_id: this.lastID,
      transaction_id: transaction_id,
      message: "Payment successful!"
    });
  });
});

app.get("/api/orders/:order_id", (req, res) => {
  const { order_id } = req.params;
  
  db.get(`SELECT o.*, u.username 
          FROM orders o
          JOIN users u ON o.user_id = u.id
          WHERE o.order_id = ?`, 
          [order_id], 
          (err, order) => {
    if (err) {
      res.json({ success: false, error: err.message });
      return;
    }
    
    db.all(`SELECT oi.*, g.name as game_name 
            FROM order_items oi
            JOIN games g ON oi.game_id = g.id
            WHERE oi.order_id = ?`, 
            [order_id], 
            (err, items) => {
      res.json({ success: true, order: order, items: items });
    });
  });
});

app.get("/api/payments/order/:order_id", (req, res) => {
  const { order_id } = req.params;
  
  db.get(`SELECT * FROM payments WHERE order_id = ?`, 
          [order_id], 
          (err, payment) => {
    res.json({ success: true, payment: payment });
  });
});

// ================ ADMIN API ================

// Get all orders (admin) - Order ID, User, Game Names, Status, Date only
app.get("/api/admin/orders", (req, res) => {
  const { admin_id } = req.query;
  
  console.log("📌 [ADMIN] Fetching orders for admin_id:", admin_id);
  
  db.get("SELECT is_admin FROM users WHERE id = ?", [admin_id], (err, user) => {
    if (err) {
      console.log("❌ [ADMIN] Error checking admin:", err.message);
      res.status(500).json({ error: err.message });
      return;
    }
    if (!user || user.is_admin !== 1) {
      console.log("❌ [ADMIN] Access denied for admin_id:", admin_id);
      res.status(403).json({ error: "Access denied. Admin only." });
      return;
    }
    
    db.all(`SELECT 
              o.order_id, 
              u.username, 
              o.status, 
              o.order_date,
              GROUP_CONCAT(g.name, ', ') as game_names
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            LEFT JOIN games g ON oi.game_id = g.id
            GROUP BY o.order_id
            ORDER BY o.order_date DESC`, 
            (err, rows) => {
      if (err) {
        console.log("❌ [ADMIN] Error fetching orders:", err.message);
        res.status(500).json({ error: err.message });
        return;
      }
      console.log("✅ [ADMIN] Found", rows.length, "orders");
      res.json(rows);
    });
  });
});

// Get all payments (admin)
app.get("/api/admin/payments", (req, res) => {
  const { admin_id } = req.query;
  
  console.log("📌 [ADMIN] Fetching payments for admin_id:", admin_id);
  
  db.get("SELECT is_admin FROM users WHERE id = ?", [admin_id], (err, user) => {
    if (err || !user || user.is_admin !== 1) {
      res.status(403).json({ error: "Access denied. Admin only." });
      return;
    }
    
    db.all(`SELECT 
              p.payment_id, 
              p.order_id, 
              u.username, 
              p.amount, 
              p.payment_method, 
              p.payment_status, 
              p.transaction_id, 
              p.payment_date
            FROM payments p
            JOIN users u ON p.user_id = u.id
            ORDER BY p.payment_date DESC`, 
            (err, rows) => {
      if (err) {
        res.status(500).json({ error: err.message });
        return;
      }
      console.log("✅ [ADMIN] Found", rows.length, "payments");
      res.json(rows);
    });
  });
});

// Get dashboard stats (admin)
app.get("/api/admin/stats", (req, res) => {
  const { admin_id } = req.query;
  
  db.get("SELECT is_admin FROM users WHERE id = ?", [admin_id], (err, user) => {
    if (err || !user || user.is_admin !== 1) {
      res.status(403).json({ error: "Access denied. Admin only." });
      return;
    }
    
    db.get(`SELECT 
      (SELECT COUNT(*) FROM users WHERE is_admin = 0) as total_users,
      (SELECT COUNT(*) FROM orders) as total_orders,
      (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'completed') as total_sales,
      (SELECT COUNT(*) FROM games) as total_games`,
      (err, stats) => {
        res.json(stats);
      });
  });
});

// Get all users (admin)
app.get("/api/admin/users", (req, res) => {
  const { admin_id } = req.query;
  
  db.get("SELECT is_admin FROM users WHERE id = ?", [admin_id], (err, user) => {
    if (err || !user || user.is_admin !== 1) {
      res.status(403).json({ error: "Access denied. Admin only." });
      return;
    }
    
    db.all("SELECT id, username, is_admin, created_at FROM users ORDER BY id", (err, rows) => {
      res.json(rows);
    });
  });
});

app.post("/api/admin/log", (req, res) => {
  const { admin_id, action_type, target_id, details } = req.body;
  
  db.run(`INSERT INTO admin_logs (admin_id, action_type, target_id, details) 
          VALUES (?, ?, ?, ?)`, 
          [admin_id, action_type, target_id, details || ""]);
  
  res.json({ success: true });
});

// ================ START SERVER ================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`========================================`);
  console.log(`NAVIGATR server running!`);
  console.log(`Server: http://localhost:${PORT}`);
  console.log(`Games API: http://localhost:${PORT}/games`);
  console.log(`========================================`);
  console.log(`✅ Games are now from SQLite database!`);
  console.log(`✅ Orders & Payment system ready!`);
  console.log(`✅ Admin dashboard ready!`);
  console.log(`✅ Password hashing with bcrypt enabled!`);
  console.log(`========================================`);
});