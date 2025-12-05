// server.js ← الصحيح 100%
const express = require("express");
const cors = require("cors");
require("dotenv").config();

const app = express();        // ← لازم يكون هنا الأول

// CORS – مهم جدًا عشان الفرونت يشتغل
app.use(cors({
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000', 'http://localhost:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
app.use("/auth", require("./routes/authRoutes"));
app.use("/books", require("./routes/bookRoutes"));
app.use("/member", require("./routes/memberRoutes"));
app.use("/admin", require("./routes/adminRoutes"));
app.use("/borrow", require("./routes/borrowRoutes"));
app.use("/fines", require("./routes/fineRoutes"));
app.use("/reservations", require("./routes/reservationRoutes"));
app.use("/user", require("./routes/profileRoutes"));  // مهم لتحديث الملف الشخصي

// Swagger (اختياري)
const swaggerUi = require("swagger-ui-express");
const swaggerFile = require("./swagger-output.json");
app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerFile));

// تشغيل السيرفر
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`السيرفر شغال على الپورت ${PORT}`);
    console.log(`Swagger: http://localhost:${PORT}/api-docs`);
});