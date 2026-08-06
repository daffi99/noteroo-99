import fs from 'fs'
import path from 'path'

const pkgPath = path.resolve('package.json')
const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'))

const currentVersion = pkg.version || '1.12.0'
const parts = currentVersion.split('.')

if (parts.length >= 2) {
  const major = parts[0] || '1'
  const minor = parseInt(parts[1], 10) + 1
  const patch = parts[2] || '0'
  pkg.version = `${major}.${minor}.${patch}`
} else {
  pkg.version = '1.13.0'
}

fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n')
console.log(`Auto-incremented version: ${currentVersion} -> ${pkg.version}`)
