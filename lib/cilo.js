const glob = require('glob');
const fs = require('fs');
const {
  Umzug,
  SequelizeStorage
} = require('umzug');
const path = require('path');

class Cilo {
  constructor(Sequelize, database = null, username = null, password = null,  modelsPath = null, config = null) {
    if (! Cilo.instance) {
      this.Sequelize = Sequelize
      this.mainDatabase = database
      this.username = username
      this.password = password
      this.config = config
      this.modelsPath = modelsPath
      this.tenantConnections = {}
      this.tenantORMs = {}
      this.mainORM = {}
      this.mainConnection = new this.Sequelize(database, username, password, config)
      this.currentORM = this.mainORM
      Cilo.instance = this
    }
    return Cilo.instance
  }

  buildMainORM() {
    this.mainORM = this._importModels(this.mainConnection)
  }

  async createTenant(subdomain) {
    // make subdomain lowercase
    subdomain = subdomain.toLowerCase()
    let tenant
    try {
      tenant = await this.mainORM.Tenant.create({
        name: subdomain,
        status: 'active',
        subdomain,
        dbName: `tenant_${subdomain}`,
      })
    } catch (error) {
      console.log(error)
      if (error.name === 'SequelizeUniqueConstraintError') {
        throw new Error('Subdomain already exists')
      } else {
        throw new Error('Something went wrong')
      }
    }

    // create a new db for the tenant
    await this.mainConnection.query(`CREATE DATABASE tenant_${subdomain}`)
    // create a new connection for the tenant
    this.tenantConnections[subdomain] = new this.Sequelize(`tenant_${subdomain}`, this.username, this.password, this.config)

    const tenantGlob = this._buildMigrationGlob()

    // create the tenant's tables
    const umzug = this._initializeUmzug(this.tenantConnections[subdomain], tenantGlob)
    await umzug.up()

    // create the tenant's ORM
    this.tenantORMs[subdomain] = this._importModels(this.tenantConnections[subdomain])
    return tenant
  }

  async migrate() {
    await this.migrateMainDb()
    await this.migrateAllTenants()
  }

  async seed(seedName, tenantName = null) {
    if (tenantName) {
      await this.buildTenantConnections()
      const seedGlob = _buildSeedGlob(seedName)
      const umzug = this._initializeUmzug(this.tenantConnections[tenantName], seedGlob)
      await umzug.up()
    } else {
      const tenants = await this.getDbTenants()
      const seedGlob = _buildSeedGlob(seedName)
      
      const umzugPromises = []
      for (const tenant of tenants) {
        this.tenantConnections[tenant.subdomain] = new this.Sequelize(tenant.dbName, tenant.username, tenant.password, this.config)
        const umzug = this._initializeUmzug(this.tenantConnections[tenant.subdomain], seedGlob)
        umzugPromises.push(umzug.up())
      }
      await Promise.all(umzugPromises)
    }
  }      

  async migrateMainDb() {
    const mainDbGlob = this._buildMigrationGlob()
    const umzug = this._initializeUmzug(this.mainConnection, mainDbGlob)
    await umzug.up()
  }

  _initializeUmzug(connection, glob) {
    return new Umzug({
      migrations: {
        glob,
        // eslint-disable-next-line no-unused-vars
        resolve: ({ name, path, context }) => {
          const migration = require(path)
          return {
            name,
            up: () => migration.up(connection.getQueryInterface(), this.Sequelize),
            down: () => migration.down(connection.getQueryInterface(), this.Sequelize)
          }
        }
      },
      storage: new SequelizeStorage({ sequelize: connection }),
      context: connection.getQueryInterface(),
      logger: console
    })
  }

  async migrateAllTenants() {
    const tenants = await this.getDbTenants()
    const tenantGlob = this._buildMigrationGlob()
    
    const umzugPromises = []
    for (const tenant of tenants) {
      this.tenantConnections[tenant.subdomain] = new this.Sequelize(tenant.dbName, tenant.username, tenant.password, this.config)
      const umzug = this._initializeUmzug(this.tenantConnections[tenant.subdomain], tenantGlob)
      umzugPromises.push(umzug.up())
    }
    await Promise.all(umzugPromises)
  }

  async getDbTenants() {
    const tenants = await this.mainConnection.query('SELECT * FROM "Tenants"', {
      type: this.Sequelize.QueryTypes.SELECT
    })
    return tenants
  }

  async buildTenantConnections() {
    const tenants = await this.getDbTenants()
    for (const tenant of tenants) {
      this.tenantConnections[tenant.subdomain] = new this.Sequelize(tenant.dbName, tenant.username, tenant.password, this.config)
    }
  }

  async buildTenantORMs() {
    // check if tenantConnections is empty
    if (Object.keys(this.tenantConnections).length === 0) {
      await this.buildTenantConnections()
    }
    for (const tenant in this.tenantConnections) {
      this.tenantORMs[tenant] = this._importModels(this.tenantConnections[tenant])
    }
  }

  setCurrentORM(subdomain) {
    if (! this.tenantORMs[subdomain]) {
      throw new Error(`No tenant with subdomain ${subdomain}`)
    }
    this.currentORM = this.tenantORMs[subdomain]
  }

  setMainORM() {
    this.currentORM = this.mainORM
  }

  getCurrentORM() {
    if (! this.currentORM) {
      throw new Error('No current db set')
    }
    return this.currentORM
  }

  _importModels(connection) {
    const orm = {}
    const modelFiles = _getModelFiles(this.modelsPath)
    modelFiles.forEach(file => {
      const model = require(path.join(this.modelsPath, file))(
        connection,
        this.Sequelize.DataTypes
      );
      orm[model.name] = model
    })

    Object.keys(orm).forEach((modelName) => {
      if (orm[modelName].associate) {
        orm[modelName].associate(orm);
      }
    })
    orm.sequelize = connection
    orm.Sequelize = this.Sequelize
    return orm
  }


  _buildMigrationGlob() {
    const g = path.join(this.modelsPath, `../migrations/*.js`)

    const migrationFiles = glob.sync(g)

    return `{${migrationFiles.join(',')}}`
  }
}

const _buildSeedGlob = seedName => path.join(__dirname, `../seeders/${seedName}.js`)

const _getModelFiles = path => {
  return fs
    .readdirSync(path)
    .filter(file => {
      return (
        file.indexOf('.') !== 0 &&
        file !== 'index.js' &&
        file.slice(-3) === '.js' &&
        file.indexOf('.test.js') === -1
      );
    }
  )
}

module.exports = Cilo