const jwt = require('jsonwebtoken');

exports.protect = async (req, res, next) => {
    let token;
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        try {
            token = req.headers.authorization.split(' ')[1];
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            req.user = decoded; // { id, role }
            next();
        } catch (error) {
            res.status(401).json({ msg: 'Not authorized, token failed' });
        }
    }
    
    if (!token) {
        res.status(401).json({ msg: 'Not authorized, no token' });
    }
};
