const express = require("express");
const sql = require("mssql");
const app = express();

app.use(express.static("/var/www/html"));

const config = {
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  server: process.env.DB_SERVER,
  database: process.env.DB_NAME,
  options: { encrypt: true, trustServerCertificate: false }
};

app.get("/products", async (req, res) => {
  try {
    const pool = await sql.connect(config);
    const result = await pool.request().query("SELECT * FROM Products");
    res.json(result.recordset);
  } catch (err) {
    res.status(500).send(err.message);
  }
});

app.listen(3000, () => console.log("API running on port 3000"));