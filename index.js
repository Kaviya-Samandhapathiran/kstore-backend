const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
require('dotenv').config();
const connectDB = require('./config/db');
const router = require('./routes');
const Razorpay = require("razorpay");
const crypto = require("crypto");

const app = express();

// ✅ Define correct CORS settings
const corsOptions = {
    origin: "https://kstore-frontend.vercel.app", // Allow only your frontend
    credentials: true, // Allow credentials (cookies, authentication)
    methods: ["GET", "POST", "PUT", "DELETE"], // Allowed HTTP methods
    allowedHeaders: ["Content-Type", "Authorization"], // Allowed headers
};

// ✅ Apply CORS middleware properly
app.use(cors(corsOptions));
app.options("*", cors(corsOptions)); // Handle preflight requests

// ✅ Ensure response headers match CORS settings
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "https://kstore-frontend.vercel.app");
    res.header("Access-Control-Allow-Credentials", "true");
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE");
    res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
    next();
});

app.use(express.json());
app.use(cookieParser());
app.use("/api", router);


// Initialize Razorpay
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_SECRET
});

app.get('/', (req, res) => {
    res.status(200).send('App is Running...');
});

// Create order
app.post("/create-order", async (req, res) => {
    const { amount, currency } = req.body;

    const options = {
        amount: amount * 100,
        currency,
        receipt: `receipt_${Date.now()}`
    };

    try {
        const order = await razorpay.orders.create(options);
        res.json({ success: true, order });
    } catch (error) {
        res.status(500).json({ success: false, message: "Order creation failed", error });
    }
});

// Verify payment signature
app.post("/verify-payment", (req, res) => {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;
    const generatedSignature = crypto
        .createHmac("sha256", process.env.RAZORPAY_SECRET)
        .update(razorpay_order_id + "|" + razorpay_payment_id)
        .digest("hex");

    if (generatedSignature === razorpay_signature) {
        res.json({ success: true, message: "Payment verified successfully" });
    } else {
        res.status(400).json({ success: false, message: "Invalid payment signature" });
    }
});

// ✅ Ensure database connection before starting server
connectDB().then(() => {
    app.listen(8080, () => {
        console.log("Connected to DB");
        console.log("Server is running on PORT 8080 ");
    });
});
