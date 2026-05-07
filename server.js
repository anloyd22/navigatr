const express = require("express");
const cors = require("cors");
const { Pool } = require('pg');
const bcrypt = require("bcrypt");
const path = require("path");

const app = express();
const saltRounds = 10;

app.use(cors({
    origin: ["http://localhost:5500", "http://127.0.0.1:5500", "https://*.railway.app"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type"]
}));
app.use(express.json());

// Serve HTML file
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "index.html"));
});

// PostgreSQL connection
const db = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

// Create tables
const createTables = async () => {
    await db.query(`
        CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            is_admin INTEGER DEFAULT 0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS games (
            id SERIAL PRIMARY KEY,
            name TEXT NOT NULL,
            category TEXT NOT NULL,
            description TEXT,
            download_link TEXT,
            price DECIMAL(10,2) DEFAULT 0,
            image_url TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS user_favorites (
            user_id INTEGER,
            game_id INTEGER,
            added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (game_id) REFERENCES games(id),
            PRIMARY KEY (user_id, game_id)
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS orders (
            order_id SERIAL PRIMARY KEY,
            user_id INTEGER NOT NULL,
            total_amount DECIMAL(10,2) DEFAULT 0,
            status TEXT DEFAULT 'pending',
            shipping_address TEXT,
            payment_method TEXT,
            payment_status TEXT DEFAULT 'pending',
            transaction_id TEXT,
            order_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS order_items (
            item_id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL,
            game_id INTEGER NOT NULL,
            quantity INTEGER DEFAULT 1,
            price_at_purchase DECIMAL(10,2) NOT NULL,
            FOREIGN KEY (order_id) REFERENCES orders(order_id),
            FOREIGN KEY (game_id) REFERENCES games(id)
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS payments (
            payment_id SERIAL PRIMARY KEY,
            order_id INTEGER NOT NULL,
            user_id INTEGER NOT NULL,
            amount DECIMAL(10,2) NOT NULL,
            payment_method TEXT DEFAULT 'gcash',
            payment_status TEXT DEFAULT 'completed',
            transaction_id TEXT,
            payment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (order_id) REFERENCES orders(order_id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);
    await db.query(`
        CREATE TABLE IF NOT EXISTS admin_logs (
            log_id SERIAL PRIMARY KEY,
            admin_id INTEGER NOT NULL,
            action_type TEXT NOT NULL,
            target_id INTEGER,
            details TEXT,
            log_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (admin_id) REFERENCES users(id)
        )
    `);
    console.log("✅ Database tables ready");
};

createTables();

// ================ GAMES API ================

app.get("/games", async (req, res) => {
    try {
        const result = await db.query("SELECT * FROM games ORDER BY name");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/games/category/:category", async (req, res) => {
    const { category } = req.params;
    try {
        const result = await db.query("SELECT * FROM games WHERE category = $1 ORDER BY name", [category]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/games/:id", async (req, res) => {
    const { id } = req.params;
    try {
        const result = await db.query("SELECT * FROM games WHERE id = $1", [id]);
        if (result.rows.length === 0) {
            res.status(404).json({ error: "Game not found" });
            return;
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/games", async (req, res) => {
    const { name, category, description, download_link, price, image_url } = req.body;
    
    console.log("📌 [ADD GAME] Name:", name, "| Category:", category, "| Price: ₱" + price);
    
    if (!name || !category) {
        res.status(400).json({ error: "Name and category are required" });
        return;
    }
    
    try {
        const result = await db.query(
            "INSERT INTO games (name, category, description, download_link, price, image_url) VALUES ($1, $2, $3, $4, $5, $6) RETURNING id",
            [name, category, description || "", download_link || "", price || 0, image_url || ""]
        );
        console.log("✅ [ADD GAME] Success! ID:", result.rows[0].id, "-", name);
        res.json({ id: result.rows[0].id, message: "Game added successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.delete("/games/:id", async (req, res) => {
    const { id } = req.params;
    
    console.log("📌 [DELETE GAME] Attempting to delete ID:", id);
    
    try {
        const result = await db.query("DELETE FROM games WHERE id = $1", [id]);
        if (result.rowCount === 0) {
            res.status(404).json({ error: "Game not found" });
            return;
        }
        console.log("✅ [DELETE GAME] Success! ID:", id, "deleted");
        res.json({ message: "Game deleted successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.put("/games/:id", async (req, res) => {
    const { id } = req.params;
    const { name, category, description, download_link, price, image_url } = req.body;
    
    try {
        await db.query(
            "UPDATE games SET name = $1, category = $2, description = $3, download_link = $4, price = $5, image_url = $6 WHERE id = $7",
            [name, category, description, download_link, price, image_url, id]
        );
        res.json({ message: "Game updated successfully!" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================ USER AUTHENTICATION API ================

app.post("/api/signup", async (req, res) => {
    const { username, password } = req.body;
    
    console.log("📌 [SIGNUP] Attempt:", username);
    
    if (!username || !password) {
        res.status(400).json({ error: "Username and password required" });
        return;
    }
    
    try {
        const hash = await bcrypt.hash(password, saltRounds);
        const result = await db.query(
            "INSERT INTO users (username, password, is_admin) VALUES ($1, $2, 0) RETURNING id",
            [username, hash]
        );
        console.log("✅ [SIGNUP] Success! User:", username, "ID:", result.rows[0].id);
        res.json({ id: result.rows[0].id, username, message: "User created successfully" });
    } catch (err) {
        if (err.message.includes("duplicate")) {
            res.status(400).json({ error: "Username already exists" });
        } else {
            res.status(500).json({ error: err.message });
        }
    }
});

app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;
    
    console.log("📌 [LOGIN] Attempt:", username);
    
    try {
        const result = await db.query("SELECT * FROM users WHERE username = $1", [username]);
        
        if (result.rows.length === 0) {
            console.log("❌ [LOGIN] Failed: User not found -", username);
            res.status(401).json({ error: "Invalid username or password" });
            return;
        }
        
        const user = result.rows[0];
        const passwordMatch = await bcrypt.compare(password, user.password);
        
        if (!passwordMatch) {
            console.log("❌ [LOGIN] Failed: Invalid password for", username);
            res.status(401).json({ error: "Invalid username or password" });
            return;
        }
        
        console.log("✅ [LOGIN] Success:", username, "| is_admin:", user.is_admin);
        res.json({ 
            id: user.id, 
            username: user.username, 
            is_admin: user.is_admin === 1,
            message: "Login successful" 
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/favorites", async (req, res) => {
    const { user_id, game_id } = req.body;
    
    try {
        await db.query(
            "INSERT INTO user_favorites (user_id, game_id) VALUES ($1, $2) ON CONFLICT DO NOTHING",
            [user_id, game_id]
        );
        res.json({ message: "Added to favorites" });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/favorites/:user_id", async (req, res) => {
    const { user_id } = req.params;
    
    try {
        const result = await db.query(`
            SELECT g.* FROM games g
            JOIN user_favorites uf ON g.id = uf.game_id
            WHERE uf.user_id = $1
            ORDER BY g.name
        `, [user_id]);
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================ ORDER AND PAYMENT API ================

app.post("/api/orders/create", async (req, res) => {
    const { user_id, items, total_amount, shipping_address } = req.body;
    
    console.log("========================================");
    console.log("🛒 [NEW ORDER] User ID:", user_id);
    console.log("📦 Items:", items.length);
    console.log("💰 Total Amount: ₱" + total_amount);
    
    try {
        const orderResult = await db.query(
            "INSERT INTO orders (user_id, total_amount, status, shipping_address, payment_status) VALUES ($1, $2, 'pending', $3, 'pending') RETURNING order_id",
            [user_id, total_amount, shipping_address || ""]
        );
        
        const order_id = orderResult.rows[0].order_id;
        console.log("✅ [NEW ORDER] Order created! ID:", order_id);
        
        for (const item of items) {
            await db.query(
                "INSERT INTO order_items (order_id, game_id, quantity, price_at_purchase) VALUES ($1, $2, $3, $4)",
                [order_id, item.game_id, item.quantity, item.price]
            );
        }
        
        res.json({ success: true, order_id: order_id });
    } catch (err) {
        console.log("❌ [NEW ORDER] Error:", err.message);
        res.json({ success: false, error: err.message });
    }
});

app.post("/api/payment/gcash", async (req, res) => {
    const { order_id, user_id, amount } = req.body;
    const transaction_id = "SIM-GCASH-" + Date.now();
    
    console.log("========================================");
    console.log("💳 [PAYMENT] Order ID:", order_id);
    console.log("👤 User ID:", user_id);
    console.log("💰 Amount: ₱" + amount);
    console.log("🆔 Transaction ID:", transaction_id);
    
    try {
        await db.query(
            "INSERT INTO payments (order_id, user_id, amount, payment_method, payment_status, transaction_id) VALUES ($1, $2, $3, 'gcash', 'completed', $4)",
            [order_id, user_id, amount, transaction_id]
        );
        
        await db.query(
            "UPDATE orders SET status = 'paid', payment_method = 'gcash', payment_status = 'completed', transaction_id = $1 WHERE order_id = $2",
            [transaction_id, order_id]
        );
        
        console.log("✅ [PAYMENT] SUCCESS! Payment recorded for Order ID:", order_id);
        console.log("========================================");
        
        res.json({ success: true, transaction_id: transaction_id, message: "Payment successful!" });
    } catch (err) {
        console.log("❌ [PAYMENT] Failed:", err.message);
        res.json({ success: false, error: err.message });
    }
});

app.get("/api/orders/:order_id", async (req, res) => {
    const { order_id } = req.params;
    
    try {
        const orderResult = await db.query(
            "SELECT o.*, u.username FROM orders o JOIN users u ON o.user_id = u.id WHERE o.order_id = $1",
            [order_id]
        );
        
        const itemsResult = await db.query(
            "SELECT oi.*, g.name as game_name FROM order_items oi JOIN games g ON oi.game_id = g.id WHERE oi.order_id = $1",
            [order_id]
        );
        
        res.json({ success: true, order: orderResult.rows[0], items: itemsResult.rows });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

app.get("/api/payments/order/:order_id", async (req, res) => {
    const { order_id } = req.params;
    
    try {
        const result = await db.query("SELECT * FROM payments WHERE order_id = $1", [order_id]);
        res.json({ success: true, payment: result.rows[0] });
    } catch (err) {
        res.json({ success: false, error: err.message });
    }
});

// ================ ADMIN API ================

app.get("/api/admin/orders", async (req, res) => {
    const { admin_id } = req.query;
    
    try {
        const adminCheck = await db.query("SELECT is_admin FROM users WHERE id = $1", [admin_id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].is_admin !== 1) {
            res.status(403).json({ error: "Access denied. Admin only." });
            return;
        }
        
        const result = await db.query(`
            SELECT 
                o.order_id, 
                u.username, 
                o.status, 
                o.order_date,
                STRING_AGG(g.name, ', ') as game_names
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            LEFT JOIN games g ON oi.game_id = g.id
            GROUP BY o.order_id, u.username, o.status, o.order_date
            ORDER BY o.order_date DESC
        `);
        
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/admin/payments", async (req, res) => {
    const { admin_id } = req.query;
    
    try {
        const adminCheck = await db.query("SELECT is_admin FROM users WHERE id = $1", [admin_id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].is_admin !== 1) {
            res.status(403).json({ error: "Access denied. Admin only." });
            return;
        }
        
        const result = await db.query(`
            SELECT 
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
            ORDER BY p.payment_date DESC
        `);
        
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/admin/stats", async (req, res) => {
    const { admin_id } = req.query;
    
    try {
        const adminCheck = await db.query("SELECT is_admin FROM users WHERE id = $1", [admin_id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].is_admin !== 1) {
            res.status(403).json({ error: "Access denied. Admin only." });
            return;
        }
        
        const statsResult = await db.query(`
            SELECT 
                (SELECT COUNT(*) FROM users WHERE is_admin = 0) as total_users,
                (SELECT COUNT(*) FROM orders) as total_orders,
                (SELECT COALESCE(SUM(amount), 0) FROM payments WHERE payment_status = 'completed') as total_sales,
                (SELECT COUNT(*) FROM games) as total_games
        `);
        
        res.json(statsResult.rows[0]);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.get("/api/admin/users", async (req, res) => {
    const { admin_id } = req.query;
    
    try {
        const adminCheck = await db.query("SELECT is_admin FROM users WHERE id = $1", [admin_id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].is_admin !== 1) {
            res.status(403).json({ error: "Access denied. Admin only." });
            return;
        }
        
        const result = await db.query("SELECT id, username, is_admin, created_at FROM users ORDER BY id");
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

app.post("/api/admin/log", async (req, res) => {
    const { admin_id, action_type, target_id, details } = req.body;
    
    try {
        await db.query(
            "INSERT INTO admin_logs (admin_id, action_type, target_id, details) VALUES ($1, $2, $3, $4)",
            [admin_id, action_type, target_id, details || ""]
        );
        res.json({ success: true });
    } catch (err) {
        res.json({ success: false });
    }
});

// ================ CSV EXPORT (EXCEL) ================

// Export orders to CSV
app.get("/api/admin/export/orders", async (req, res) => {
    const { admin_id } = req.query;
    
    try {
        const adminCheck = await db.query("SELECT is_admin FROM users WHERE id = $1", [admin_id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].is_admin !== 1) {
            res.status(403).json({ error: "Access denied. Admin only." });
            return;
        }
        
        const result = await db.query(`
            SELECT 
                o.order_id, 
                u.username, 
                o.total_amount, 
                o.status, 
                o.payment_method,
                o.order_date
            FROM orders o
            JOIN users u ON o.user_id = u.id
            ORDER BY o.order_date DESC
        `);
        
        let csv = "Order ID,User,Total Amount,Status,Payment Method,Date\n";
        result.rows.forEach(row => {
            csv += `"${row.order_id}","${row.username}","${row.total_amount}","${row.status}","${row.payment_method || '-'}","${row.order_date}"\n`;
        });
        
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=orders_export.csv");
        res.send(csv);
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export payments to CSV
app.get("/api/admin/export/payments", async (req, res) => {
    const { admin_id } = req.query;
    
    try {
        const adminCheck = await db.query("SELECT is_admin FROM users WHERE id = $1", [admin_id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].is_admin !== 1) {
            res.status(403).json({ error: "Access denied. Admin only." });
            return;
        }
        
        const result = await db.query(`
            SELECT 
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
            ORDER BY p.payment_date DESC
        `);
        
        let csv = "Payment ID,Order ID,User,Amount,Payment Method,Status,Transaction ID,Date\n";
        result.rows.forEach(row => {
            csv += `"${row.payment_id}","${row.order_id}","${row.username}","${row.amount}","${row.payment_method}","${row.payment_status}","${row.transaction_id || '-'}","${row.payment_date}"\n`;
        });
        
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=payments_export.csv");
        res.send(csv);
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export games to CSV
app.get("/api/admin/export/games", async (req, res) => {
    const { admin_id } = req.query;
    
    try {
        const adminCheck = await db.query("SELECT is_admin FROM users WHERE id = $1", [admin_id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].is_admin !== 1) {
            res.status(403).json({ error: "Access denied. Admin only." });
            return;
        }
        
        const result = await db.query("SELECT id, name, category, price, created_at FROM games ORDER BY name");
        
        let csv = "ID,Name,Category,Price,Date Added\n";
        result.rows.forEach(row => {
            csv += `"${row.id}","${row.name}","${row.category}","${row.price}","${row.created_at}"\n`;
        });
        
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=games_export.csv");
        res.send(csv);
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export users to CSV
app.get("/api/admin/export/users", async (req, res) => {
    const { admin_id } = req.query;
    
    try {
        const adminCheck = await db.query("SELECT is_admin FROM users WHERE id = $1", [admin_id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].is_admin !== 1) {
            res.status(403).json({ error: "Access denied. Admin only." });
            return;
        }
        
        const result = await db.query("SELECT id, username, is_admin, created_at FROM users ORDER BY id");
        
        let csv = "ID,Username,Admin,Created At\n";
        result.rows.forEach(row => {
            csv += `"${row.id}","${row.username}","${row.is_admin === 1 ? 'Admin' : 'User'}","${row.created_at}"\n`;
        });
        
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=users_export.csv");
        res.send(csv);
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================ XML EXPORT ================

// Helper function to escape XML special characters
function escapeXml(str) {
    if (!str) return '';
    return str.replace(/[<>&'"]/g, function(c) {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

// Export orders to XML
app.get("/api/admin/xml/orders", async (req, res) => {
    const { admin_id } = req.query;
    
    try {
        const adminCheck = await db.query("SELECT is_admin FROM users WHERE id = $1", [admin_id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].is_admin !== 1) {
            res.status(403).json({ error: "Access denied. Admin only." });
            return;
        }
        
        const result = await db.query(`
            SELECT 
                o.order_id, 
                u.username, 
                o.total_amount, 
                o.status, 
                o.payment_method,
                o.order_date,
                STRING_AGG(g.name, ', ') as game_names
            FROM orders o
            JOIN users u ON o.user_id = u.id
            LEFT JOIN order_items oi ON o.order_id = oi.order_id
            LEFT JOIN games g ON oi.game_id = g.id
            GROUP BY o.order_id, u.username, o.total_amount, o.status, o.payment_method, o.order_date
            ORDER BY o.order_date DESC
        `);
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<?xml-stylesheet type="text/xsl" href="https://navigatr-production.up.railway.app/orders.xsl"?>\n';
        xml += '<orders>\n';
        
        result.rows.forEach(order => {
            xml += '  <order>\n';
            xml += `    <order_id>${order.order_id}</order_id>\n`;
            xml += `    <username>${escapeXml(order.username)}</username>\n`;
            xml += `    <game_names>${escapeXml(order.game_names || '-')}</game_names>\n`;
            xml += `    <total_amount>${order.total_amount}</total_amount>\n`;
            xml += `    <status>${order.status}</status>\n`;
            xml += `    <payment_method>${order.payment_method || '-'}</payment_method>\n`;
            xml += `    <order_date>${order.order_date}</order_date>\n`;
            xml += '  </order>\n';
        });
        
        xml += '</orders>';
        
        res.setHeader("Content-Type", "application/xml");
        res.setHeader("Content-Disposition", "attachment; filename=orders_export.xml");
        res.send(xml);
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export games to XML
app.get("/api/admin/xml/games", async (req, res) => {
    const { admin_id } = req.query;
    
    try {
        const adminCheck = await db.query("SELECT is_admin FROM users WHERE id = $1", [admin_id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].is_admin !== 1) {
            res.status(403).json({ error: "Access denied. Admin only." });
            return;
        }
        
        const result = await db.query("SELECT id, name, category, description, price, image_url, created_at FROM games ORDER BY name");
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<?xml-stylesheet type="text/xsl" href="https://navigatr-production.up.railway.app/games.xsl"?>\n';
        xml += '<games>\n';
        
        result.rows.forEach(game => {
            xml += '  <game>\n';
            xml += `    <id>${game.id}</id>\n`;
            xml += `    <name>${escapeXml(game.name)}</name>\n`;
            xml += `    <category>${game.category}</category>\n`;
            xml += `    <description>${escapeXml(game.description || '-')}</description>\n`;
            xml += `    <price>${game.price}</price>\n`;
            xml += `    <image_url>${game.image_url || ''}</image_url>\n`;
            xml += `    <created_at>${game.created_at}</created_at>\n`;
            xml += '  </game>\n';
        });
        
        xml += '</games>';
        
        res.setHeader("Content-Type", "application/xml");
        res.setHeader("Content-Disposition", "attachment; filename=games_export.xml");
        res.send(xml);
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// Export payments to XML
app.get("/api/admin/xml/payments", async (req, res) => {
    const { admin_id } = req.query;
    
    try {
        const adminCheck = await db.query("SELECT is_admin FROM users WHERE id = $1", [admin_id]);
        if (adminCheck.rows.length === 0 || adminCheck.rows[0].is_admin !== 1) {
            res.status(403).json({ error: "Access denied. Admin only." });
            return;
        }
        
        const result = await db.query(`
            SELECT 
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
            ORDER BY p.payment_date DESC
        `);
        
        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
        xml += '<?xml-stylesheet type="text/xsl" href="https://navigatr-production.up.railway.app/payments.xsl"?>\n';
        xml += '<payments>\n';
        
        result.rows.forEach(payment => {
            xml += '  <payment>\n';
            xml += `    <payment_id>${payment.payment_id}</payment_id>\n`;
            xml += `    <order_id>${payment.order_id}</order_id>\n`;
            xml += `    <username>${escapeXml(payment.username)}</username>\n`;
            xml += `    <amount>${payment.amount}</amount>\n`;
            xml += `    <payment_method>${payment.payment_method}</payment_method>\n`;
            xml += `    <payment_status>${payment.payment_status}</payment_status>\n`;
            xml += `    <transaction_id>${payment.transaction_id || '-'}</transaction_id>\n`;
            xml += `    <payment_date>${payment.payment_date}</payment_date>\n`;
            xml += '  </payment>\n';
        });
        
        xml += '</payments>';
        
        res.setHeader("Content-Type", "application/xml");
        res.setHeader("Content-Disposition", "attachment; filename=payments_export.xml");
        res.send(xml);
        
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

// ================ START SERVER ================
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`========================================`);
    console.log(`NAVIGATR server running!`);
    console.log(`Server: http://localhost:${PORT}`);
    console.log(`========================================`);
});
