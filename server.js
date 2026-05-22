const express = require("express");
const sql = require("mssql");
const app = express();

app.use(express.static("/var/www/html"));
app.use(express.json());

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: false }
};

// ── GET all products (with optional search) ──────────────────────────────────
// Usage: GET /products  OR  GET /products?search=runner
app.get("/products", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const search = req.query.search ? `%${req.query.search}%` : null;

    const result = search
      ? await pool.request()
          .input("search", sql.NVarChar, search)
          .query(`
            SELECT * FROM Products
            WHERE ProductName LIKE @search
               OR Category    LIKE @search
               OR Description LIKE @search
          `)
      : await pool.request().query("SELECT * FROM Products");

    res.json(result.recordset);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single product ────────────────────────────────────────────────────────
app.get("/products/:id", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input("id", sql.Int, req.params.id)
      .query("SELECT * FROM Products WHERE ProductId = @id");

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "Product not found" });

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── CREATE product ────────────────────────────────────────────────────────────
app.post("/products", async (req, res) => {
  const { ProductName, Category, Price, Stock, Description } = req.body;

  if (!ProductName || !Category || Price == null || Stock == null)
    return res.status(400).json({ error: "ProductName, Category, Price and Stock are required." });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input("ProductName",  sql.NVarChar(100), ProductName)
      .input("Category",     sql.NVarChar(50),  Category)
      .input("Price",        sql.Decimal(10,2), Price)
      .input("Stock",        sql.Int,           Stock)
      .input("Description",  sql.NVarChar(500), Description || "")
      .query(`
        INSERT INTO Products (ProductName, Category, Price, Stock, Description)
        OUTPUT INSERTED.*
        VALUES (@ProductName, @Category, @Price, @Stock, @Description)
      `);

    res.status(201).json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── UPDATE product ────────────────────────────────────────────────────────────
app.put("/products/:id", async (req, res) => {
  const { ProductName, Category, Price, Stock, Description } = req.body;

  if (!ProductName || !Category || Price == null || Stock == null)
    return res.status(400).json({ error: "ProductName, Category, Price and Stock are required." });

  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input("id",           sql.Int,           req.params.id)
      .input("ProductName",  sql.NVarChar(100), ProductName)
      .input("Category",     sql.NVarChar(50),  Category)
      .input("Price",        sql.Decimal(10,2), Price)
      .input("Stock",        sql.Int,           Stock)
      .input("Description",  sql.NVarChar(500), Description || "")
      .query(`
        UPDATE Products
        SET ProductName = @ProductName,
            Category    = @Category,
            Price       = @Price,
            Stock       = @Stock,
            Description = @Description
        OUTPUT INSERTED.*
        WHERE ProductId = @id
      `);

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "Product not found" });

    res.json(result.recordset[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE product ────────────────────────────────────────────────────────────
app.delete("/products/:id", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request()
      .input("id", sql.Int, req.params.id)
      .query("DELETE FROM Products OUTPUT DELETED.ProductId WHERE ProductId = @id");

    if (result.recordset.length === 0)
      return res.status(404).json({ error: "Product not found" });

    res.json({ message: "Product deleted", ProductId: result.recordset[0].ProductId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.listen(3000, () => console.log("API running on port 3000"));