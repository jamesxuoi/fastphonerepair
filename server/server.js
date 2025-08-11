// Add this at the very top
require('dotenv').config()

const express = require('express')
const app = express()
const port = process.env.PORT || 3001  // Use PORT from .env
const session = require('express-session')
const phoneRoutes = require('./api/phone')
const bookingRoutes = require('./api/tickets')
const accountRoutes = require('./api/account')
const bodyParser = require('body-parser')

app.use(bodyParser.json())
app.use(bodyParser.urlencoded({ extended: false }))

const cors = require('cors')
app.use(
    cors({
        origin: [
            'http://localhost:5173', 
            'http://192.168.165.188:5173'
        ], // Fixed CORS for your frontend
        credentials: true
    })
)

app.use(
    session({
        secret: 'abc123',
        resave: false,
        saveUninitialized: false
    })
)

app.use('/api', phoneRoutes)
app.use('/api', bookingRoutes)
app.use('/api', accountRoutes)

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})