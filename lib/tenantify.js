const tenantify = cilo => (req, res, next) => {
  if (!req.headers['x-tenant-id']) {
    return res.status(400).json({ error: 'Missing X-Tenant-Id header' })
  }
  try {
    cilo.setCurrentORM(req.headers['x-tenant-id'])
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
  next()
}

module.exports = tenantify
