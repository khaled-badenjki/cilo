const singlify = cilo => (req, res, next) => {
  if (req.headers['tenant-id']) {
    return res.status(400).json({ error: 'Non necessary header X-Tenant-Id' })
  }
  try {
    cilo.setMainORM()
  } catch (error) {
    return res.status(400).json({ error: error.message })
  }
  next()
}

module.exports = singlify
