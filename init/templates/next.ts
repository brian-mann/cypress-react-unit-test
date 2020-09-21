import chalk from 'chalk'
import { createFindPackageJsonIterator } from '../findPackageJson'
import { Template } from '../Template'
import { semverVersionIsGreater } from '../utils'
import { MIN_SUPPORTED_VERSION } from '../versions'

const template: Template = {
  message: 'It looks like you are using next.js.',
  getExampleUrl: () =>
    'https://github.com/bahmutov/cypress-react-unit-test/tree/main/examples/nextjs',
  recommendedComponentFolder: 'cypress/component',
  getPluginsCode: () =>
    [
      "const preprocessor = require('cypress-react-unit-test/plugins/next')",
      'module.exports = (on, config) => {',
      '  preprocessor(on, config)',
      '  // IMPORTANT to return the config object',
      '  return config',
      '}',
    ].join('\n'),
  test: () => {
    const packageJsonIterator = createFindPackageJsonIterator(process.cwd())

    return packageJsonIterator.map(({ dependencies, devDependencies }) => {
      if (dependencies || devDependencies) {
        const allDeps = { ...devDependencies, ...dependencies } || {}
        const nextVersion = allDeps['next']
        if (!nextVersion) {
          return { continue: true }
        }

        if (
          !semverVersionIsGreater(nextVersion, MIN_SUPPORTED_VERSION['next'])
        ) {
          const nextJsSymbol = chalk.green('next.js')

          console.warn(
            `Seems like you are using ${nextJsSymbol} of version ${chalk.bold(
              nextVersion,
            )}, but we support only ${nextJsSymbol} projects with version ${chalk.bold(
              MIN_SUPPORTED_VERSION.next,
            )}. Trying to find another template...`,
          )

          // yey found the next
          return { continue: true }
        }

        return { continue: false }
      }

      return { continue: true }
    })
  },
}

export default template
