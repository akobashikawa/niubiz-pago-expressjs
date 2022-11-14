const express = require('express');
var cors = require('cors');
const app = express();
const axios = require('axios');
const config = require('./config');

// CONST
const PORT = config.port || 4200;
const AUTHORIZATION = 'Z2lhbmNhZ2FsbGFyZG9AZ21haWwuY29tOkF2MyR0cnV6';
const MERCHANTID = '456879852';

// ADD ONS
app.use(express.static('public'));
app.set('view engine', 'ejs');

// Enable All CORS Request
app.use(cors());

// json request support
app.use(express.json());
app.use(express.urlencoded({ extended: false }));

// SERVICES
const productos = [
    {
        id: 'producto-1',
        nombre: 'Producto 1',
        amount: '10',
        currency: 'PEN',
    },
    {
        id: 'producto-2',
        nombre: 'Producto 2',
        amount: '20.50',
        currency: 'PEN',
    },
    {
        id: 'producto-3',
        nombre: 'Producto 3',
        amount: '30.99',
        currency: 'PEN',
    },
];

const getProducto = (productoId) => {
    const found = productos.find(item => item.id == productoId);
    return found;
};

const pagos = [];

const getPago = (purchaseNumber) => {
    const found = pagos.find(item => item.purchaseNumber == purchaseNumber);
    return found;
};

const updatePago = (pago, data) => {
    const foundIndex = pagos.findIndex(item => item.purchaseNumber = pago.purchaseNumber);
    console.log('updatePago: ', pago, foundIndex);
    pagos[foundIndex] = {...pago, ...data};
};

// 'PurchaseNumber has to be numeric [max 12 digits].'
const generatePurchaseNumber = () => {
    function xx(n) {
        return (n < 10) ? ('0' + n) : n;
    }
    
    const now = new Date();
    const yyyy = now.getFullYear();
    const MM = xx(now.getMonth() + 1);
    const dd = xx(now.getDate());
    const hh = xx(now.getHours());
    const mm = xx(now.getMinutes());
    const ss = xx(now.getSeconds());
    return `${yyyy}${MM}${dd}${hh}${mm}${ss}`.substring(2);
};

const generateUniquePurchaseNumber = () => {
    let purchaseNumber = null;
    let i = 0;
    let found = false;
    do {
        i++;
        purchaseNumber = generatePurchaseNumber();
        found = pagos.find(item => item.purchaseNumber == purchaseNumber);
    } while (found && i < 10);
    return purchaseNumber;
};

const registrarNuevoPago = ({
    usuarioId, 
    productoId, 
    amount, 
    currency,
    merchantId, 
    accessToken, 
    sessionKey, 
    expirationTime
}) => {
    const purchaseNumber = generateUniquePurchaseNumber(productoId);
    const nuevoPago = {
        usuarioId,
        productoId,
        amount,
        currency,
        merchantId,
        purchaseNumber,
        accessToken,
        sessionKey,
        expirationTime,
    };
    console.log('nuevo pago: ', nuevoPago);
    pagos.push(nuevoPago);
    return nuevoPago;
};



const getAccessToken = async (authorization) => {
    try {
        const headers = {
            "Authorization": `Basic ${authorization}`
        };

        const result = await axios.get('https://apisandbox.vnforappstest.com/api.security/v1/security', {headers});
        // 201
        // console.log(result);
        accessToken = result.data;
        console.log('accessToken', accessToken);
        return accessToken;
    } catch (error) {
        // 401
        console.log(error.data);
        return null;
    }
};

const getSession = async (merchantId, accessToken, amount) => {
    const body = {
        "channel": 'web', // default
        "amount": `${amount}`,
    };

    try {
        const headers = {
            "Content-Type": 'application/json',
            "Authorization": accessToken
        };

        const result = await axios.post(`https://apisandbox.vnforappstest.com/api.ecommerce/v2/ecommerce/token/session/${merchantId}`, body, {headers});
        // 200
        // console.log(result);
        const data = result.data;
        console.log(data);
        const expirationTime = data.expirationTime;
        const expirationMinutes = Math.round( ( new Date(expirationTime) - new Date().getTime() ) / 1000 / 60);
        const sessionKey = data.sessionKey;

        let session = {sessionKey, expirationTime, expirationMinutes};
        return session;
    } catch (error) {
        // 400, 406
        console.log(error);
    }
};

const payAuthorization = async (tokenId, purchaseNumber) => {
    try {
        const merchantId = MERCHANTID;
        const pago = getPago(purchaseNumber);

        const accessToken = pago.accessToken;
        const currency = pago.currency;
        const amount = pago.amount;

        const headers = {
            "Content-Type": 'application/json',
            "Authorization": accessToken
        };

        const body = {
            "channel": 'web', // default
            "captureType": 'manual', // siempre
            "countable": true,
            "order" : {
                "tokenId": tokenId,
                "purchaseNumber": purchaseNumber,
                "amount": amount,
                "currency": currency,
            }
        };

        console.log('payAuthorization body', body);

        const result = await axios.post(`https://apisandbox.vnforappstest.com/api.authorization/v3/authorization/ecommerce/${merchantId}`, body, {headers});
        // 200
        // console.log(result);
        const data = result.data;
        // console.log(data);

        return data;
    } catch (error) {
        // 400, 401, 406, 500
        console.log(error);
        return null;
    }
};

// ROUTES

app.get("/api", (req, res) => {
    res.send('Niubiz Demo');
});

app.get("/api/productos", (req, res) => {
    res.json(productos);
});

app.get("/api/pagos", (req, res) => {
    res.json(pagos);
});

app.get("/api/pagos/:purchaseNumber", (req, res) => {
    const purchaseNumber = req.params['purchaseNumber'];
    const found = pagos.find(item => item.purchaseNumber == purchaseNumber);
    res.json(found);
});

app.post("/api/pagos", async (req, res) => {
    const productoId = req.body.productoId;
    const usuarioId = req.body.usuarioId;
    const merchantId = MERCHANTID;

    try {
        // NIUBIZ 1: obtener access token
        const accessToken = await getAccessToken(AUTHORIZATION);

        // NIUBIZ 2: obtener session
        const producto = getProducto(productoId);
        const sessionData = await getSession(merchantId, accessToken, producto.amount);

        // Registrando pago
        const nuevoPago = registrarNuevoPago({
            usuarioId, 
            productoId,
            amount: producto.amount,
            currency: producto.currency,
            merchantId,
            accessToken,
            sessionKey: sessionData.sessionKey, 
            expirationTime: sessionData.expirationTime,
        });
        
        // Preparar datos para el openForm
        const openFormData = {
            merchantid: merchantId,
            sessiontoken: sessionData.sessionKey,
            expirationminutes: sessionData.expirationMinutes,
            amount: producto.amount,
            purchasenumber: nuevoPago.purchaseNumber,
        };

        res.json(openFormData);
    } catch (error) {
        console.log(error.response);
        throw error;
    }
    
});

app.post("/api/pagos-autorizar", async (req, res) => {
    const query = req.query;
    const body = req.body;
    console.log(query, body);
    // res.json({query, body});
    const transactionToken = body.transactionToken;
    const customerEmail = body.customerEmail;
    const channel = body.channel;
    const purchaseNumber = query.purchasenumber;

    try {
        const pago = getPago(purchaseNumber);
        const amount = pago.amount;

        // NIUBIZ 4: autorizar pago
        const payAuthorizationResult = await payAuthorization(transactionToken, purchaseNumber);
        console.log('payAuthorizationResult', payAuthorizationResult);
        
        updatePago(pago, {
            card: payAuthorizationResult['dataMap']['CARD'],
            brand: payAuthorizationResult['dataMap']['BRAND'],
            status: payAuthorizationResult['dataMap']['STATUS'],
            actionDescription: payAuthorizationResult['dataMap']['ACTION_DESCRIPTION'],
            transactionId: payAuthorizationResult['dataMap']['TRANSACTION_ID'],
        });

        const producto = getProducto(pago.productoId);

        res.render('autorizacion', {
            transactionToken,
            customerEmail,
            channel,
            purchaseNumber,
            amount,
            producto,
            card: payAuthorizationResult['dataMap']['CARD'],
            brand: payAuthorizationResult['dataMap']['BRAND'],
            status: payAuthorizationResult['dataMap']['STATUS'],
            actionDescription: payAuthorizationResult['dataMap']['ACTION_DESCRIPTION'],
            transactionId: payAuthorizationResult['dataMap']['TRANSACTION_ID'],
        });
    } catch (error) {
        console.log(error);
        throw error;
    }
    
});

app.post("/api/webhook", (req, res) => {
    console.log(req.body);
    res.send('OK');
});

app.listen(PORT, () => {
    console.log(`Server running in port ${PORT}`);
});