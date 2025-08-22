// server.js
// This file creates the backend server to handle Razorpay payments securely.

const express = require('express');
const Razorpay = require('razorpay');
const bodyParser = require('body-parser');
const crypto = require('crypto');
const cors = require('cors');

const app = express();
// Use the port provided by the hosting environment (like Render), or 3000 for local testing.
const port = process.env.PORT || 3000;

// --- IMPORTANT ---
// Load your Razorpay keys from environment variables for security.
// DO NOT hardcode your keys here in a production environment.
const KEY_ID = process.env.RAZORPAY_KEY_ID || 'rzp_live_R8XAgH7yeD9jKC';
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET || 'zd7Ut9VUpFJC6f5t0uBG4HA5';

// Check if the keys are provided.
if (!KEY_ID || !KEY_SECRET) {
    throw new Error('Razorpay Key ID and Key Secret must be defined in environment variables.');
}

// Initialize the Razorpay instance with your keys.
const razorpay = new Razorpay({
    key_id: KEY_ID,
    key_secret: KEY_SECRET,
});

// --- Middleware Setup ---
// Enable Cross-Origin Resource Sharing (CORS) so your frontend can communicate with this backend.
app.use(cors());
// Use body-parser to read JSON data sent from the frontend.
app.use(bodyParser.json());

// --- API Endpoint 1: Create a Payment Order ---
// This endpoint is called from your course.html file when the user clicks "Pay Now".
app.post('/create-order', async (req, res) => {
    const { amount, currency } = req.body;
    const options = {
        amount: amount, // Amount in the smallest currency unit (e.g., paise for INR).
        currency: currency,
        receipt: `receipt_order_${new Date().getTime()}` // A unique receipt ID.
    };

    try {
        // Use the Razorpay SDK to create an order.
        const order = await razorpay.orders.create(options);
        console.log("Order created successfully:", order);
        res.json(order); // Send the created order details back to the frontend.
    } catch (error) {
        console.error("Error creating Razorpay order:", error);
        res.status(500).send('Error creating order');
    }
});

// --- API Endpoint 2: Verify the Payment Signature ---
// This endpoint is called from the Razorpay handler on the frontend after a payment is attempted.
app.post('/verify-payment', (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    // The text that needs to be signed is a combination of the order ID and payment ID.
    const sign = `${razorpay_order_id}|${razorpay_payment_id}`;

    // Generate the expected signature using your Key Secret and the SHA256 algorithm.
    const expectedSign = crypto
        .createHmac('sha256', KEY_SECRET)
        .update(sign.toString())
        .digest('hex');

    // Compare the signature from Razorpay with the one you generated.
    if (razorpay_signature === expectedSign) {
        // If they match, the payment is authentic and verified.
        console.log("Payment verified successfully!");
        res.json({ status: 'success' });
    } else {
        // If they don't match, the payment is fraudulent or has been tampered with.
        console.log("Payment verification failed.");
        res.status(400).json({ status: 'failed' });
    }
});

// --- Start the Server ---
// This command starts the backend server and makes it listen for requests on the specified port.
app.listen(port, () => {
    console.log(`Backend server is listening at http://localhost:${port}`);
});

