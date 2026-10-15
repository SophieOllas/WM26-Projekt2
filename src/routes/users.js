const express = require('express')
const { neon } = require('@neondatabase/serverless')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const authorize = require('../middleware/authorize')

const sql = neon(process.env.DATABASE_URL)
const prisma = new PrismaClient()

router.post('/', async (req, res) => {
    const loginUser = await prisma.users.findUnique({
        where: {
            email: req.body.email
        }
    })

    if (loginUser !== null) {
        console.log('User already exists')
        return res.status(400).json({ 
            message: 'User already exists' 
        })
    }

    const hashedPassword = await bcrypt.hash(req.body.password, 10)

    const user = await prisma.users.create({
        data: {
            email: req.body.email,
            password: hashedPassword,
            name: req.body.name
        }
    }) 

    res.send({
        msg : "User created",
        id: user.id
    })
})

router.post('/login', async (req, res) => {
    const loginUser = await prisma.users.findUnique({
        where: {
            email: req.body.email
        }
    })

    if (loginUser === null) {
        console.log('User not found')
        return res.status(401).json({ message: 'Authentication failed' })
    }


    const match = await bcrypt.compare(req.body.password, loginUser.password)

    if (!match) {
        console.log('Wrong password')
        return res.status(401).json({ message: 'Authentication failed' })
    }

    const token = await jwt.sign({ 
        sub: loginUser.id,
        email: loginUser.email,
        name: loginUser.name
    }, process.env.JWT_SECRET, { expiresIn: '30d' })

    res.send({
        msg : "Login successful",
        id: loginUser.id,
        jwt: token
    })
})

module.exports = router