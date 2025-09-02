const express = require('express');
const sql = require('mssql');
const app = express();
const cors = require('cors');
const redis = require('redis');

app.use(cors());
app.use(express.json());

// SQL Server Config for master database (to create TodoDb)
const masterConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    database: 'master',
    options: {
      encrypt: true,
      trustServerCertificate: true
    }
};

// SQL Server Config for TodoDb database
const todoConfig = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_HOST,
    database: 'TodoDb',
    options: {
      encrypt: true,
      trustServerCertificate: true
    }
};

const client = redis.createClient({
  socket: {
    host: 'redis',
    port: 6379,
  },
  password: process.env.REDIS_PASSWORD,
});

client.connect().catch(err => {
  console.error("Failed to connect to Redis:", err);
  process.exit(1); // Exit the app if Redis connection fails
});

// Optionally, check the Redis connection
client.ping().then(() => {
  console.log("Connected to Redis successfully");
}).catch(err => {
  console.error("Redis ping failed:", err);
});

async function initializeDatabase() {
  try {
    // First, connect to master to create database
    console.log('Connecting to master database...');
    const masterPool = await sql.connect(masterConfig);
    
    // Create TodoDb database if it doesn't exist
    await masterPool.request().query(`
      IF NOT EXISTS (SELECT name FROM sys.databases WHERE name = 'TodoDb')
      BEGIN
        CREATE DATABASE TodoDb
      END
    `);
    
    console.log('TodoDb database created/verified');
    await masterPool.close();
    
    // Now connect to TodoDb database
    console.log('Connecting to TodoDb database...');
    const todoPool = await sql.connect(todoConfig);
    
    // Create todos table in TodoDb
    await todoPool.request().query(`
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
    
    console.log('Todos table created/verified');
    console.log('Database initialization complete');
    
    return todoPool;
    
  } catch (err) {
    console.error('Database initialization error:', err);
    throw err;
  }
}

console.log('Redis Password:', process.env.REDIS_PASSWORD);

// Initialize database and start server
initializeDatabase()
  .then((pool) => {
    console.log('Connected to TodoDb successfully');

    // Get all todos
    app.get('/api/todos', async (req, res) => {
      try {
        const cachedData = await client.get(`todos`);
        if (cachedData) {
          console.log("Cache hit");
          return res.json(JSON.parse(cachedData));
        }
        const result = await pool.request().query('SELECT * FROM todos');
        console.log('Fetched todos from DB:', result.recordset);

        await client.setEx(`todos`, 60, JSON.stringify(result));

        res.json(result.recordset);
      } catch (err) {
        console.error('Error fetching todos:', err);
        res.status(500).json({ error: 'Failed to fetch todos' });
      }
    });

    // Add a new todo
    app.post('/api/todos', async (req, res) => {
      try {
        const { text } = req.body;
        const result = await pool.request()
          .input('text', sql.NVarChar, text)
          .query('INSERT INTO todos (text) OUTPUT INSERTED.* VALUES (@text)');
        res.json(result.recordset[0]);

        await client.del(`todos`);
      } catch (err) {
        console.error('Error adding todo:', err);
        res.status(500).json({ error: 'Failed to add todo' });
      }
    });

    // Delete a todo
    app.delete('/api/todos/:id', async (req, res) => {
      try {
        const { id } = req.params;
        await pool.request()
          .input('id', sql.Int, id)
          .query('DELETE FROM todos WHERE id = @id');
        res.sendStatus(200);

        await client.del(`todos`);
      } catch (err) {
        console.error('Error deleting todo:', err);
        res.status(500).json({ error: 'Failed to delete todo' });
      }
    });

    // Start Server
    app.listen(5000, () => {
      console.log('Server running on http://localhost:5000');
    });

  })
  .catch(err => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });