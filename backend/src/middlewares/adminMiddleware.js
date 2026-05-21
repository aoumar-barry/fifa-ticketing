function adminMiddleware(req, res, next) {
  if (!req.user) {
    return res.status(401).json({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
        status: 401,
      },
    });
  }

  if (req.user.role !== 'admin') {
    return res.status(403).json({
      error: {
        code: 'FORBIDDEN',
        message: 'Admin access required',
        status: 403,
      },
    });
  }

  next();
}

module.exports = adminMiddleware;
