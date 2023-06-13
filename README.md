<h1 align="center" style="border-bottom: none;">📦🚀 Cilo</h1>
<h3 align="center">Build multi-tenant apps without thinking about it</h3>
<p align="center">
  <a href="https://github.com/khaled-badenjki/cilo/actions?query=workflow%3Acontinuous-integration">
    <img alt="Build status" src="https://github.com/khaled-badenjki/cilo/actions/workflows/github-actions.yml/badge.svg">
  </a>
  <a href="#badge">
    <img alt="semantic-release: angular" src="https://img.shields.io/badge/semantic--release-angular-e10079?logo=semantic-release">
  </a>
</p>
<p align="center">
  <a href="https://www.npmjs.com/package/cilo">
    <img alt="npm latest version" src="https://img.shields.io/npm/v/cilo/latest.svg">
  </a>
</p>

**Cilo** simplifies the build of multi tenant applications by providing a wrapper around [sequelize](https://sequelize.org/) that handles the multi-tenancy for you.

This removes the hassle of handling the multi-tenancy in your application and allows you to focus on the business logic. The code will bahave the same as if you were building a single tenant application.

> Trust us, this thing will make your multi tenant app development a breeze. – [ejaza.app](https://ejaza.app/en)

## Highlights

- CLI tool to run migrations and seeders across all tenants
- Middleware to handle the tenant context
