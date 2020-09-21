#!/usr/bin/env node
import fs from 'fs'
import path from 'path'
import chalk from 'chalk'
import findUp from 'find-up'
import inqueier from 'inquirer'
import highlight from 'cli-highlight'
import { Template } from './Template'
import { NextTemplate } from './templates/next'
import { WebpackTemplate } from './templates/webpack-file'
import { ReactScriptsTemplate } from './templates/react-scripts'

const templates: Record<string, Template<any>> = {
  'next.js': NextTemplate,
  'create-react-app': ReactScriptsTemplate,
  webpack: WebpackTemplate,
}

type TemplateGuess<T> = {
  defaultTemplate: Template<T> | null
  defaultTemplateName: string | null
  templatePayload: T | null
}

function guessTemplateForUsedFramework<T>(): TemplateGuess<T> {
  for (const [name, template] of Object.entries(templates)) {
    const typedTemplate = template as Template<T>
    const { success, payload } = typedTemplate.test(process.cwd())

    if (success) {
      return {
        defaultTemplate: typedTemplate,
        defaultTemplateName: name,
        templatePayload: payload ?? null,
      }
    }
  }

  return {
    templatePayload: null,
    defaultTemplate: null,
    defaultTemplateName: null,
  }
}

async function getCypressConfig() {
  const cypressJsonPath = await findUp('cypress.json')

  // TODO figure out how to work with newly installed cypress
  if (!cypressJsonPath) {
    console.log(
      `\nIt looks like you did not install cypress. Can not find ${chalk.green(
        'cypress.json',
      )} in this or parent directories.`,
    )
    process.exit(1)
  }

  return {
    cypressConfigPath: cypressJsonPath,
    config: JSON.parse(
      fs.readFileSync(cypressJsonPath!, { encoding: 'utf-8' }).toString(),
    ) as Record<string, string>,
  }
}

function printCypressJsonHelp(
  cypressJsonPath: string,
  componentFolder: string,
) {
  const resultObject = {
    experimentalComponentTesting: true,
    componentFolder,
    testFiles: '**/*.spec.{js,ts,jsx,tsx}',
  }

  const relativeCypressJsonPath = path.relative(process.cwd(), cypressJsonPath)
  const highlightedCode = highlight(JSON.stringify(resultObject, null, 2), {
    language: 'json',
  })

  console.log(
    `\n${chalk.bold('1.')} Add this to the ${chalk.green(
      relativeCypressJsonPath,
    )}:`,
  )

  console.log(`\n${highlightedCode}\n`)
}

function printSupportHelper(supportFilePath: string) {
  const stepNumber = chalk.bold('2.')
  const importCode = "import 'cypress-react-unit-test/support'"
  const requireCode = "require('cypress-react-unit-test/support')"

  if (fs.existsSync(supportFilePath)) {
    const fileContent = fs.readFileSync(supportFilePath, { encoding: 'utf-8' })
    const relativeSupportPath = path.relative(process.cwd(), supportFilePath)

    const importCodeWithPreferredStyle = fileContent.includes('import ')
      ? importCode
      : requireCode

    console.log(
      `\n${stepNumber} This to the ${chalk.green(relativeSupportPath)}:`,
    )
    console.log(
      `\n${highlight(importCodeWithPreferredStyle, { language: 'js' })}\n`,
    )
  } else {
    console.log(
      `\n${stepNumber} This to the support file https://docs.cypress.io/guides/core-concepts/writing-and-organizing-tests.html#Support-file`,
    )

    console.log(`\n${highlight(requireCode, { language: 'js' })}\n`)
  }
}

function printPluginHelper(pluginCode: string, pluginsFilePath: string) {
  const highlightedPluginCode = highlight(pluginCode, { language: 'js' })
  const relativePluginsFilePath = path.relative(process.cwd(), pluginsFilePath)

  const stepTitle = fs.existsSync(pluginsFilePath)
    ? `And this to the ${chalk.green(relativePluginsFilePath)}`
    : `And this to your plugins file (https://docs.cypress.io/guides/tooling/plugins-guide.html)`

  console.log(`${chalk.bold('3.')} ${stepTitle}:`)
  console.log(`\n${highlightedPluginCode}\n`)
}

async function main<T>() {
  const { config, cypressConfigPath } = await getCypressConfig()
  const {
    defaultTemplate,
    defaultTemplateName,
    templatePayload,
  } = guessTemplateForUsedFramework<T>()
  const cypressProjectRoot = path.resolve(cypressConfigPath, '..')

  const templateChoices = Object.keys(templates).sort(key =>
    key === defaultTemplateName ? -1 : 0,
  )

  const {
    installationTemplate,
    componentFolder,
  }: Record<string, string> = await inqueier.prompt([
    {
      type: 'list',
      name: 'installationTemplate',
      choices: templateChoices,
      default: defaultTemplate ? 0 : undefined,
      message: defaultTemplate?.message
        ? `${defaultTemplate?.message}\n\n Press {Enter} to continue with this configuration or select other template from the list:`
        : 'We were not able to automatically determine which framework you are using. Please choose from the list which configuration to use:',
    },
    {
      type: 'input',
      name: 'componentFolder',
      filter: input => input.trim(),
      message: 'Which folder would you like to use for component tests?',
      default: (answers: { installationTemplate: keyof typeof templates }) =>
        templates[answers.installationTemplate].recommendedComponentFolder,
    },
  ])

  const userTemplate = templates[installationTemplate] as Template<T>
  const pluginsFilePath = path.resolve(
    cypressProjectRoot,
    config.pluginsFile ?? './cypress/plugins/index.js',
  )

  const supportFilePath = path.resolve(
    cypressProjectRoot,
    config.supportFile ?? './cypress/support/index.js',
  )

  printCypressJsonHelp(cypressConfigPath, componentFolder)
  printSupportHelper(supportFilePath)
  printPluginHelper(
    userTemplate.getPluginsCode(templatePayload),
    pluginsFilePath,
  )

  console.log(
    `Working example of component tests with ${chalk.green(
      defaultTemplateName,
    )}: ${chalk.bold(userTemplate.getExampleUrl({ componentFolder }))}`,
  )

  console.log(`\nHappy testing with ${chalk.green('cypress.io')} 🔥🔥🔥\n`)
}

main().catch(e => console.error(e))