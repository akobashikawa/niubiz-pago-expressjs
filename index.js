const express = require('express');
const app = express();
const axios = require('axios');
const config = require('./config');

// json request support
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const PORT = config.port || 4000;
const CULQI_SK = config.culqiSk;

app.get("/", (req, res) => {
    res.send('Culqi Demo');
});

app.post("/charge", async (req, res) => {
    const data = req.body;
    const url = `https://api.culqi.com/v2/charges`;
    const headers = {
        Accept: "application/json, text/plain, */*",
        "Content-Type": "application/json; charset=UTF-8",
        Authorization: `Bearer ${CULQI_SK}`
    };
    try {
        data.metadata.extra = 'metadata desde el server';
        const response = await axios.post(url, data, {headers});
        console.log(response.data);
        res.send(response.data);
    } catch (error) {
        console.log(error);
        res.send(error.response.data);
    }
});

app.post("/webhook", (req, res) => {
    console.log(req.body);
    res.send('OK');
});

app.listen(PORT, () => {
    console.log(`Server running in port ${PORT}`);
})