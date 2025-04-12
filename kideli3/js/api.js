const express = require('express');
const MercadoPago = require('mercadopago');

const app = express();
MercadoPago.configure({ access_token: 'SEU_ACCESS_TOKEN' });

app.post('/create-preference', async (req, res) => {
    const { items, total } = req.body;

    const preference = {
        items: items.map(item => ({
            title: item.name,
            unit_price: item.price,
            quantity: item.quantity
        })),
        back_urls: {
            success: "https://seusite.com/sucesso",
            failure: "https://seusite.com/erro",
            pending: "https://seusite.com/pendente"
        },
        auto_return: "approved"
    };

    try {
        const response = await MercadoPago.preferences.create(preference);
        res.json({ id: response.body.id });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.listen(3000, () => console.log('API running on port 3000'));