const express = require('express');
const sql = require('mssql');
const app = express();
const cors = require('cors');

app.use(cors());

app.use(express.json());

// SQL Server Config
const config = {
    user: process.env.DB_USER || 'sa',
    password: process.env.DB_PASSWORD || 'your_password',
    server: process.env.DB_HOST || 'localhost',
    database: process.env.DB_NAME || 'TodoDb',
    options: {
      encrypt: true,
      trustServerCertificate: true
    }
  };

// Connect to SQL Server
sql.connect(config)
  .then(async (pool) => {

    console.log('Connected to SQL Server');

    await pool.request().query(`
      IF NOT EXISTS (
        SELECT * FROM INFORMATION_SCHEMA.TABLES 
        WHERE TABLE_NAME = 'todos'
      )
      BEGIN
        CREATE TABLE todos (
          id INT IDENTITY(1,1) PRIMARY KEY,
          text NVARCHAR(255) NOT NULL
        )
      END
    `);

    // Get all todos
    app.get('/api/todos', async (req, res) => {
      const result = await pool.request().query('SELECT * FROM todos');
      res.json(result.recordset);
    });

    // Add a new todo
    app.post('/api/todos', async (req, res) => {
      const { text } = req.body;
      const result = await pool.request()
        .input('text', sql.NVarChar, text)
        .query('INSERT INTO todos (text) VALUES (@text) SELECT * FROM todos WHERE id = SCOPE_IDENTITY()');
      res.json(result.recordset[0]);
    });

    // Delete a todo
    app.delete('/api/todos/:id', async (req, res) => {
      const { id } = req.params;
      await pool.request()
        .input('id', sql.Int, id)
        .query('DELETE FROM todos WHERE id = @id');
      res.sendStatus(200);
    });

  }).catch(err => {
    console.error('Error connecting to SQL Server:', err);
    process.exit(1);
  });

// Start Server
app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});
