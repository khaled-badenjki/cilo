#!/usr/bin/env node
const yargs = require('yargs');
const Sequelize = require('sequelize');
const env = process.env.NODE_ENV || 'development';
const config = require(__dirname + '/../config/config.json')[env];
const Tenant = require('../lib/tenant');

const tenant = new Tenant(Sequelize, config.database, config.username, config.password, config);

// command db:migrate to run migrations for all tenants
yargs.command('db:migrate', 'Run migrations for all tenants', {}, () => {
  tenant
    .migrate()
    .then(() => {
      console.log('Migrations complete');
      process.exit(0);
    })
    .catch((error) => {
      console.log("Error running migrations", error);
      process.exit(1);
    });
});

// command db:seed --seed <seed-name> --tenant <tenant-name> to run seeders for a specific tenant
// --tenant is optional, if not provided, seeders will be run for all tenants
yargs.command('db:seed', 'Run seeders for a specific tenant', {
  seed: {
    describe: 'Seed name',
    demandOption: true,
    type: 'string'
  },
  tenant: {
    describe: 'Tenant name, if not provided, seeders will be run for all tenants',
    demandOption: false,
    type: 'string'
  }
}, (argv) => {
  tenant
    .seed(argv.seed, argv.tenant)
    .then(() => {
      console.log('Seeders complete');
      process.exit(0);
    })
    .catch((error) => {
      console.log("Error running seeders", error);
      process.exit(1);
    });
});


yargs.parse();