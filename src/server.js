const express = require('express')
const app = express()
require('dotenv').config()
const PORT = process.env.PORT || 8080
const cors = require('cors');

console.log(`Node.js ${process.version}`)

app.use(express.json())

app.use(cors({
  origin: ['https://people.arcada.fi']
}));

app.get('/', (req, res) => {
    res.json({ msg: "Users API" })
})

const usersRouter = require('./routes/users')
app.use('/users', usersRouter)

app.listen(PORT, () => {
    console.log(`Running on http://localhost:${PORT}`)
    
})
