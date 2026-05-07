let currentUser = null;
let currentUserId = null;
let gamesData = [];
const serverUrl = "http://localhost:3000";

/* ================= PAGE SWITCH ================= */
function showPage(id) {
    const pages = [
        "loginPage",
        "signupPage", 
        "homePage",
        "recommendPage",
        "gameDetailsPage",
        "adminDashboardPage"
    ];

    pages.forEach(p => {
        const el = document.getElementById(p);
        if (el) el.style.display = "none";
    });

    const target = document.getElementById(id);
    if (target) target.style.display = "block";
}

/* ================= LOGIN ================= */
function login() {
    const username = document.getElementById("loginUsername").value.trim();
    const password = document.getElementById("loginPassword").value;

    if (!username || !password) {
        alert("Enter username and password");
        return;
    }

    fetch(`${serverUrl}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
            return;
        }
        
        currentUser = data.username;
        currentUserId = data.id;
        
        console.log("Login success:", currentUser, "is_admin:", data.is_admin);

        if (data.is_admin === true) {
            showPage("adminDashboardPage");
            setTimeout(() => {
                loadAdminStats();
                loadAdminGames();
            }, 100);
        } else {
            const welcome = document.getElementById("welcomeText");
            if (welcome) welcome.innerText = "Hi, " + currentUser;
            showPage("homePage");
            loadGames();
        }
    })
    .catch(err => {
        console.error(err);
        alert("Login failed. Make sure server is running.");
    });
}

/* ================= SIGNUP ================= */
function signup() {
    const username = document.getElementById("signupUsername").value.trim();
    const password = document.getElementById("signupPassword").value;

    if (!username || !password) {
        alert("Enter username and password");
        return;
    }

    fetch(`${serverUrl}/api/signup`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password })
    })
    .then(res => res.json())
    .then(data => {
        if (data.error) {
            alert(data.error);
            return;
        }
        
        alert("Signup successful! Please login.");
        showPage("loginPage");
        document.getElementById("signupUsername").value = "";
        document.getElementById("signupPassword").value = "";
    })
    .catch(err => {
        console.error(err);
        alert("Signup failed. Make sure server is running.");
    });
}

/* ================= LOGOUT ================= */
function logout() {
    currentUser = null;
    currentUserId = null;
    showPage("loginPage");
    document.getElementById("loginUsername").value = "";
    document.getElementById("loginPassword").value = "";
}

/* ================= LOAD GAMES (USER) ================= */
function loadGames() {
    console.log("Fetching games...");

    fetch(`${serverUrl}/games`)
        .then(res => {
            if (!res.ok) throw new Error("Network error");
            return res.json();
        })
        .then(data => {
            console.log("Games loaded:", data.length);
            gamesData = data;
            displayCategories();
        })
        .catch(err => console.error(err));
}

/* ================= DISPLAY CATEGORIES ================= */
function displayCategories() {
    const grid = document.getElementById("recommendGrid");
    const title = document.getElementById("recommendTitle");

    if (!grid) return;

    const categories = {};

    gamesData.forEach(game => {
        if (!categories[game.category]) {
            categories[game.category] = [];
        }
        categories[game.category].push(game);
    });

    grid.innerHTML = "";
    if (title) title.innerText = "Categories";

    for (const category in categories) {
        const div = document.createElement("div");
        div.className = "recommend-card";
        div.innerText = category;
        div.onclick = () => selectGame(category);
        grid.appendChild(div);
    }
}

/* ================= SELECT CATEGORY ================= */
function selectGame(category) {
    const grid = document.getElementById("recommendGrid");
    const title = document.getElementById("recommendTitle");

    if (!grid) return;

    if (title) title.innerText = category + " Games";

    grid.innerHTML = "";

    const filtered = gamesData.filter(game => game.category === category);

    filtered.forEach(game => {
        const div = document.createElement("div");
        div.className = "recommend-card";
        div.innerText = game.name;
        div.onclick = () => showGameDetails(game);
        grid.appendChild(div);
    });

    showPage("recommendPage");
}

/* ================= GAME DETAILS ================= */
function showGameDetails(game) {
    const title = document.getElementById("gameTitle");
    const desc = document.getElementById("gameDesc");
    const char = document.getElementById("gameChar");
    const link = document.getElementById("gameLink");

    if (title) title.innerText = game.name;
    if (desc) desc.innerText = game.description || "No description available";
    if (char) char.innerText = game.category || "N/A";

    if (link) {
        link.href = game.download_link;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
    }

    showPage("gameDetailsPage");
}

/* ================= SEARCH ================= */
function searchGames() {
    const input = document.getElementById("searchInput");
    const value = input ? input.value.toLowerCase() : "";

    const grid = document.getElementById("recommendGrid");
    const title = document.getElementById("recommendTitle");

    if (!value) {
        displayCategories();
        return;
    }

    grid.innerHTML = "";
    if (title) title.innerText = "Search Results";

    const filtered = gamesData.filter(game =>
        game.name.toLowerCase().includes(value)
    );

    if (filtered.length === 0) {
        grid.innerHTML = "<p>No games found</p>";
        return;
    }

    filtered.forEach(game => {
        const div = document.createElement("div");
        div.className = "recommend-card";
        div.innerText = game.name;
        div.onclick = () => showGameDetails(game);
        grid.appendChild(div);
    });

    showPage("recommendPage");
}

/* ================= ADMIN FUNCTIONS ================= */

function showAdminSection(section) {
    const dashboard = document.getElementById('adminDashboard');
    const orders = document.getElementById('adminOrders');
    const payments = document.getElementById('adminPayments');
    const games = document.getElementById('adminGames');
    const users = document.getElementById('adminUsers');
    
    if (dashboard) dashboard.style.display = 'none';
    if (orders) orders.style.display = 'none';
    if (payments) payments.style.display = 'none';
    if (games) games.style.display = 'none';
    if (users) users.style.display = 'none';
    
    if (section === 'dashboard' && dashboard) dashboard.style.display = 'block';
    if (section === 'orders' && orders) {
        orders.style.display = 'block';
        loadAdminOrders();
    }
    if (section === 'payments' && payments) {
        payments.style.display = 'block';
        loadAdminPayments();
    }
    if (section === 'games' && games) {
        games.style.display = 'block';
        loadAdminGames();
    }
    if (section === 'users' && users) {
        users.style.display = 'block';
        loadAdminUsers();
    }
}

async function loadAdminStats() {
    if (!currentUserId) return;
    
    try {
        console.log("Loading stats for admin_id:", currentUserId);
        const response = await fetch(`${serverUrl}/api/admin/stats?admin_id=${currentUserId}`);
        
        if (!response.ok) {
            throw new Error('Stats API returned ' + response.status);
        }
        
        const stats = await response.json();
        console.log("Stats received:", stats);
        
        const statsContainer = document.getElementById('statsContainer');
        if (statsContainer) {
            statsContainer.innerHTML = `
                <div class="stat-card"><h3>Total Users</h3><div class="number">${stats.total_users || 0}</div></div>
                <div class="stat-card"><h3>Total Orders</h3><div class="number">${stats.total_orders || 0}</div></div>
                <div class="stat-card"><h3>Total Sales</h3><div class="number">₱${stats.total_sales || 0}</div></div>
                <div class="stat-card"><h3>Total Games</h3><div class="number">${stats.total_games || 0}</div></div>
            `;
        }
    } catch (error) {
        console.error("Error loading stats:", error);
        const statsContainer = document.getElementById('statsContainer');
        if (statsContainer) {
            statsContainer.innerHTML = '<p style="color:red;">Error loading stats. Check console.</p>';
        }
    }
}

async function loadAdminOrders() {
    if (!currentUserId) return;
    
    try {
        console.log("Loading orders...");
        const response = await fetch(`${serverUrl}/api/admin/orders?admin_id=${currentUserId}`);
        
        if (!response.ok) {
            throw new Error('Orders API returned ' + response.status);
        }
        
        const orders = await response.json();
        console.log("Orders received:", orders);
        
        const ordersTable = document.getElementById('ordersTable');
        if (!ordersTable) return;
        
        if (orders.error) {
            ordersTable.innerHTML = `<p style="color:red;">${orders.error}</p>`;
            return;
        }
        
        if (!orders || orders.length === 0) {
            ordersTable.innerHTML = '<p>No orders yet.</p>';
            return;
        }
        
        let html = '<table style="width:100%; border-collapse: collapse;">';
        html += '<tr style="background:#1a1a2e; color:white;">';
        html += '<th style="padding:10px;">Order ID</th>';
        html += '<th style="padding:10px;">User</th>';
        html += '<th style="padding:10px;">Total</th>';
        html += '<th style="padding:10px;">Status</th>';
        html += '<th style="padding:10px;">Date</th>';
        html += '</tr>';
        
        orders.forEach(order => {
            html += `<tr style="border-bottom:1px solid #ddd;">
                <td style="padding:10px;">${order.order_id}</td>
                <td style="padding:10px;">${order.username || 'Unknown'}</td>
                <td style="padding:10px;">₱${order.total_amount}</td>
                <td style="padding:10px;">${order.status}</td>
                <td style="padding:10px;">${order.order_date}</td>
            </tr>`;
        });
        html += '</table>';
        ordersTable.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading orders:", error);
        const ordersTable = document.getElementById('ordersTable');
        if (ordersTable) ordersTable.innerHTML = '<p style="color:red;">Error loading orders.</p>';
    }
}

async function loadAdminPayments() {
    if (!currentUserId) return;
    
    try {
        console.log("Loading payments...");
        const response = await fetch(`${serverUrl}/api/admin/payments?admin_id=${currentUserId}`);
        
        if (!response.ok) {
            throw new Error('Payments API returned ' + response.status);
        }
        
        const payments = await response.json();
        console.log("Payments received:", payments);
        
        const paymentsTable = document.getElementById('paymentsTable');
        if (!paymentsTable) return;
        
        if (payments.error) {
            paymentsTable.innerHTML = `<p style="color:red;">${payments.error}</p>`;
            return;
        }
        
        if (!payments || payments.length === 0) {
            paymentsTable.innerHTML = '<p>No payments yet.</p>';
            return;
        }
        
        let html = '<table style="width:100%; border-collapse: collapse;">';
        html += '<tr style="background:#1a1a2e; color:white;">';
        html += '<th style="padding:10px;">Payment ID</th>';
        html += '<th style="padding:10px;">User</th>';
        html += '<th style="padding:10px;">Amount</th>';
        html += '<th style="padding:10px;">Status</th>';
        html += '<th style="padding:10px;">Method</th>';
        html += '<th style="padding:10px;">Date</th>';
        html += '</tr>';
        
        payments.forEach(p => {
            html += `<tr style="border-bottom:1px solid #ddd;">
                <td style="padding:10px;">${p.payment_id}</td>
                <td style="padding:10px;">${p.username || 'Unknown'}</td>
                <td style="padding:10px;">₱${p.amount}</td>
                <td style="padding:10px;">${p.payment_status}</td>
                <td style="padding:10px;">${p.payment_method}</td>
                <td style="padding:10px;">${p.payment_date}</td>
            </tr>`;
        });
        html += '</table>';
        paymentsTable.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading payments:", error);
        const paymentsTable = document.getElementById('paymentsTable');
        if (paymentsTable) paymentsTable.innerHTML = '<p style="color:red;">Error loading payments.</p>';
    }
}

async function loadAdminGames() {
    if (!currentUserId) return;
    
    try {
        console.log("Loading games for admin...");
        const response = await fetch(`${serverUrl}/games`);
        
        if (!response.ok) {
            throw new Error('Games API returned ' + response.status);
        }
        
        const games = await response.json();
        console.log("Games received:", games.length);
        
        const gamesList = document.getElementById('gamesList');
        if (!gamesList) return;
        
        if (!games || games.length === 0) {
            gamesList.innerHTML = '<p>No games found.</p>';
            return;
        }
        
        let html = '<table style="width:100%; border-collapse: collapse;">';
        html += '<tr style="background:#1a1a2e; color:white;">';
        html += '<th style="padding:10px;">ID</th>';
        html += '<th style="padding:10px;">Name</th>';
        html += '<th style="padding:10px;">Category</th>';
        html += '<th style="padding:10px;">Price</th>';
        html += '<th style="padding:10px;">Actions</th>';
        html += '</tr>';
        
        games.forEach(game => {
            html += `<tr style="border-bottom:1px solid #ddd;">
                <td style="padding:10px;">${game.id}</td>
                <td style="padding:10px;">${game.name}</td>
                <td style="padding:10px;">${game.category}</td>
                <td style="padding:10px;">₱${game.price || 0}</td>
                <td style="padding:10px;">
                    <button onclick="deleteGame(${game.id})" style="background:#e94560; color:white; border:none; padding:5px 10px; border-radius:5px; cursor:pointer;">Delete</button>
                </td>
            </tr>`;
        });
        html += '</table>';
        gamesList.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading games:", error);
        const gamesList = document.getElementById('gamesList');
        if (gamesList) gamesList.innerHTML = '<p style="color:red;">Error loading games. Make sure server is running.</p>';
    }
}

async function loadAdminUsers() {
    if (!currentUserId) return;
    
    try {
        console.log("Loading users...");
        const response = await fetch(`${serverUrl}/api/admin/users?admin_id=${currentUserId}`);
        
        if (!response.ok) {
            throw new Error('Users API returned ' + response.status);
        }
        
        const users = await response.json();
        console.log("Users received:", users);
        
        const usersTable = document.getElementById('usersTable');
        if (!usersTable) return;
        
        if (users.error) {
            usersTable.innerHTML = `<p style="color:red;">${users.error}</p>`;
            return;
        }
        
        let html = '<table style="width:100%; border-collapse: collapse;">';
        html += '<tr style="background:#1a1a2e; color:white;">';
        html += '<th style="padding:10px;">ID</th>';
        html += '<th style="padding:10px;">Username</th>';
        html += '<th style="padding:10px;">Admin</th>';
        html += '<th style="padding:10px;">Created</th>';
        html += '</tr>';
        
        users.forEach(user => {
            html += `<tr style="border-bottom:1px solid #ddd;">
                <td style="padding:10px;">${user.id}</td>
                <td style="padding:10px;">${user.username}</td>
                <td style="padding:10px;">${user.is_admin === 1 ? '✅ Admin' : '👤 User'}</td>
                <td style="padding:10px;">${user.created_at || '-'}</td>
            </tr>`;
        });
        html += '</table>';
        usersTable.innerHTML = html;
        
    } catch (error) {
        console.error("Error loading users:", error);
        const usersTable = document.getElementById('usersTable');
        if (usersTable) usersTable.innerHTML = '<p style="color:red;">Error loading users.</p>';
    }
}

async function addNewGame() {
    const name = document.getElementById('newGameName').value;
    const category = document.getElementById('newGameCategory').value;
    const description = document.getElementById('newGameDesc').value;
    const download_link = document.getElementById('newGameLink').value;
    const price = document.getElementById('newGamePrice').value;
    
    if (!name || !category) {
        alert('Game name and category are required');
        return;
    }
    
    try {
        const response = await fetch(`${serverUrl}/games`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, category, description, download_link, price: parseFloat(price) || 0 })
        });
        
        if (response.ok) {
            alert('Game added successfully!');
            document.getElementById('newGameName').value = '';
            document.getElementById('newGameDesc').value = '';
            document.getElementById('newGameLink').value = '';
            document.getElementById('newGamePrice').value = '';
            loadAdminGames();
            loadAdminStats();
        } else {
            alert('Failed to add game');
        }
    } catch (error) {
        console.error("Error adding game:", error);
        alert('Error adding game');
    }
}

async function deleteGame(gameId) {
    if (confirm('Are you sure you want to delete this game?')) {
        try {
            const response = await fetch(`${serverUrl}/games/${gameId}`, {
                method: 'DELETE'
            });
            
            if (response.ok) {
                alert('Game deleted!');
                loadAdminGames();
                loadAdminStats();
            } else {
                alert('Failed to delete game');
            }
        } catch (error) {
            console.error("Error deleting game:", error);
            alert('Error deleting game');
        }
    }
}

/* ================= ENTER KEY SEARCH ================= */
document.addEventListener("DOMContentLoaded", function() {
    setTimeout(() => {
        const input = document.getElementById("searchInput");
        if (input) {
            input.addEventListener("keydown", function(event) {
                if (event.key === "Enter") {
                    searchGames();
                }
            });
        }
    }, 300);
});