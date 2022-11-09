const express = require('express');
var cors = require('cors');
const app = express();
const axios = require('axios');
const config = require('./config');

app.use(express.static('public'));

// Enable All CORS Request
app.use(cors());

// json request support
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const PORT = config.port || 4200;

app.get("/api", (req, res) => {
    res.send('Niubiz Demo');
});

app.all("/api/response", async (req, res) => {
    const query = req.query;
    const body = req.body;
    console.log(query, body);
    res.json({query, body});
});

app.post("/api/webhook", (req, res) => {
    console.log(req.body);
    res.send('OK');
});

app.listen(PORT, () => {
    console.log(`Server running in port ${PORT}`);
})