const express = require('express')
const router = express.Router()
const { PrismaClient } = require('@prisma/client')
const bcrypt = require('bcrypt')
const jwt = require('jsonwebtoken')
const authorize = require('../middleware/authorize')

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

    const access_token = await jwt.sign({ 
        sub: loginUser.id,
        email: loginUser.email,
        name: loginUser.name
    }, process.env.JWT_SECRET, { expiresIn: '15min' })

    const refresh_token = await jwt.sign({ 
        sub: loginUser.id,
        email: loginUser.email,
        name: loginUser.name
    }, process.env.JWT_REFRESH_SECRET, { expiresIn: '30d' })

    const refreshExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

    await prisma.refresh_tokens.create({
        data: {
            user_id: loginUser.id,
            token: refresh_token,
            expires_at: refreshExpiresAt
        }
    })

    res.send({
        msg : "Login successful",
        id: loginUser.id,
        jwt: access_token,
        refresh_jwt: refresh_token,
        expires_at: refreshExpiresAt
    })
})

router.post('/refresh', authorize, async (req, res) => {
    const authHeader = req.get('authorization')
    const refreshToken = authHeader.split(' ')[1]
    const userId = req.authUser.sub

    const storedRefreshToken = await prisma.refresh_tokens.findUnique({
        where: { token: refreshToken }
    })

    if (
        !storedRefreshToken ||
        storedRefreshToken.user_id !== userId ||
        storedRefreshToken.expires_at <= new Date()
    ) {
        return res.status(401).json({ message: 'Invalid or expired refresh token' })
    }
    
    const access_token = await jwt.sign({ 
        sub: userId,
        email: req.authUser.email,
        name: req.authUser.name
    }, process.env.JWT_SECRET, { expiresIn: '15min' })

    res.send({
        msg : "Token refreshed",
        id: userId,
        jwt: access_token
    })
})

router.delete('/logout', async (req, res) => {
    const refreshToken = await prisma.refresh_tokens.deleteMany({
        where: {
            user_id: req.body.user_id,
            token: req.body.token
        }
    })
    res.send({
        msg : "Logout successful"
    })
})

module.exports = router