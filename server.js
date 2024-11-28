const express = require('express');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'client')));

// Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'client', 'app', 'index.html'));
});

// Start server
app.listen(port, () => {
    console.log(`ScanBell 2025 running at http://localhost:${port}`);
});
