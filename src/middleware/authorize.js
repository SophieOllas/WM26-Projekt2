const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
    try {
        const authHeader = req.headers.authorization
        const [scheme, token] = authHeader ? authHeader.split(' ') : []
        if (scheme !== 'Bearer' || !token) {
            return res.status(401).json({ message: 'Refresh token required' })
        }

        const user = jwt.verify(token, process.env.JWT_REFRESH_SECRET)
        req.authUser = user
    } catch {
        return res.status(401).json({
            message: 'Invalid or expired refresh token'
        })
    }
    
    next()
}