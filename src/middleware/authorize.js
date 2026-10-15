const jwt = require('jsonwebtoken')

module.exports = (req, res, next) => {
    // console.log(`Authorization middleware triggered with header: ${authHeader}`)
    try {
        const authHeader = req.headers['authorization']
        const token = authHeader.split(' ')[1]
        const user = jwt.verify(token, process.env.JWT_SECRET)
        req.authUser = user

        console.log(`Token valid for user ${user.sub} ${user.name}`)
    } catch (error) {
        console.log(error)
        return res.status(401).json({
            message: 'Unauthorized',
            error: error.message
        })
    }
    
    next()
}