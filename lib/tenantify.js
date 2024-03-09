const tenantify = cilo => async (req, res, next) => {
  const tenantId = req?.user?.t_account_id || req.cookies['tenant-id'] || req.headers['tenant-id']
  if (!tenantId) {
    return res.status(400).json({ error: 'unable to identify the client' })
  }
  try {
    await cilo.setCurrentORM(tenantId, req.headers)
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
  next()
}

module.exports = tenantify
