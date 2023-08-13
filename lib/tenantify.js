const tenantify = cilo => (req, res, next) => {
  const tenantId = req.cookies['tenant-id'] || req.headers['x-tenant-id']
  if (!tenantId) {
    return res.status(400).json({ error: 'Missing X-Tenant-Id header' })
  }
  try {
    cilo.setCurrentORM(tenantId)
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
  next()
}

module.exports = tenantify
