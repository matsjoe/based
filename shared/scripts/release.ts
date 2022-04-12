/* eslint-disable no-console */
import path from 'path'
import simpleGit from 'simple-git'
import open from 'open'
import githubRelease from 'new-github-release-url'
import chalk from 'chalk'
import yargs from 'yargs/yargs'
import { hideBin } from 'yargs/helpers'
import { execa } from 'execa'
import { prompt } from 'enquirer'

import { getPublicPackages, PackageData } from './get-package-data'
import { Answers, ReleaseType } from './types'

import {
  publishAllPackagesInRepository,
  publishTargetPackage,
} from './publish-packages'

import {
  updatePackageVersionsInRepository,
  updateTargetPackageVersion,
} from './update-versions'

import {
  FormatOptions,
  getIncrementedVersion,
  MapPrompts,
  validateReleaseType,
} from './utilities'

// @ts-ignore
import packageJson from '../../package.json'

/**
 * Exit if running from non-root folder.
 */
const relativePath = process.cwd().split('/saulx')[1]

if (relativePath !== '/based') {
  throw new Error('Please run this script from the root of the repository')
}

const git = simpleGit()

export type ReleaseOptions = {
  type: string
  skipBuild: boolean
  skipPublish: boolean
  skipCommit: boolean
  dryRun: boolean
}

const ALL_PACKAGES_TAG = 'All packages'

const { argv }: { argv: any } = yargs(hideBin(process.argv))
  .option('type', {
    type: 'string',
    default: 'patch',
    description: 'Type <patch|minor|major>',
  })
  .option('skip-build', {
    type: 'boolean',
    default: false,
    description: 'Skip build step',
  })
  .option('skip-version', {
    type: 'boolean',
    default: false,
    description: 'Skip version increment step',
  })
  .option('skip-publish', {
    type: 'boolean',
    default: false,
    description: 'Skip publish step',
  })
  .option('skip-commit', {
    type: 'boolean',
    default: false,
    description: 'Skip commit step',
  })
  .option('dry-run', {
    type: 'boolean',
    default: false,
    description: 'Dry-run release',
  })
  .example([
    ['$0 minor', 'Release minor update.'],
    ['$0 --type minor', 'Release minor update.'],
    ['$0 --skip-build', 'Skip building packages.'],
    ['$0 --skip-publish', 'Skip publishing packages.'],
    ['$0 --skip-version', 'Skip incrementing package versions.'],
    ['$0 --skip-commit', 'Skip committing changes to Git.'],
    ['$0 --dry-run', 'Only build, do nothing else.'],
  ])

const shouldValidateBranchAndGit: boolean = true

const getBranch = async () => {
  const currentBranch = await git.raw('rev-parse', '--abbrev-ref', 'HEAD')
  return currentBranch.trim()
}

async function releaseProject() {
  if (shouldValidateBranchAndGit) {
    const currentBranch = await getBranch()

    if (currentBranch !== 'main') {
      throw new Error(
        `Incorrect branch: ${currentBranch}. We only release from main branch.`
      )
    }

    const status = await git.status()

    if (status.files.length !== 0) {
      throw new Error(
        'You have unstaged changes in git. To release, commit or stash all changes.'
      )
    }
  }

  const {
    type,
    skipBuild,
    skipPublish,
    skipCommit,
    dryRun: isDryRun,
  } = argv as ReleaseOptions

  const inputType = argv._[0] ?? type
  let releaseType = validateReleaseType(inputType)

  let targetPackage: PackageData | undefined = {
    name: ALL_PACKAGES_TAG,
    path: 'root',
    version: packageJson.version,
  }

  let targetVersion = getIncrementedVersion({
    version: packageJson.version,
    type: releaseType,
  })

  let shouldTriggerBuild = Boolean(skipBuild) === false
  let shouldPublishChanges = Boolean(skipPublish) === false
  let shouldCommitChanges = Boolean(skipCommit) === false

  const targetFolders = packageJson.workspaces.map((folder: string) => {
    return folder.replace(/[`~!@#$%^&*()_|+\-=?;:'",.<>{}[\]\\/]/gi, '')
  })

  console.info(`\n  Releasing Based...`)

  const printReleaseOptions = () => {
    const printedOptions = {
      releaseType: releaseType,
      triggerBuild: shouldTriggerBuild,
      publishChanges: shouldPublishChanges,
      commitChanges: shouldCommitChanges,
      currentVersion: targetPackage?.version ?? '',
      targetVersion: targetVersion,
    }

    console.info(`\n  ${chalk.bold('[ Release Options ]')} \n`)
    FormatOptions(printedOptions).forEach(([message, value]) => {
      console.info(`  ${chalk.white(message)}: ${chalk.bold.yellow(value)}`)
    })
    console.info(`\n`)
  }

  const publicPackages = await getPublicPackages()

  const publicPackageNames = publicPackages.map(
    (packageData) => packageData.name
  )

  const allChoices = [ALL_PACKAGES_TAG, ...publicPackageNames]

  await prompt<{
    chosenPackage: string
  }>({
    message: 'Select a package',
    name: 'chosenPackage',
    type: 'select',
    choices: allChoices,
    initial: allChoices[0],
  } as any).then(({ chosenPackage }) => {
    if (!chosenPackage) {
      console.info('User aborted the release.')
      process.exit(0)
    }

    if (chosenPackage !== ALL_PACKAGES_TAG) {
      targetPackage = publicPackages.find(
        (packageData) => packageData.name === chosenPackage
      )
    }
  })

  /**
   * Configure release interactively. Ignore by using `npm run release --force`
   */
  await prompt<{ chosenReleaseType: ReleaseType }>([
    {
      type: 'select',
      name: 'chosenReleaseType',
      message: 'Select release type',
      initial: 0,
      choices: [
        { name: 'patch', message: 'Patch' },
        { name: 'minor', message: 'Minor' },
        { name: 'major', message: 'Major' },
      ],
    },
  ]).then(({ chosenReleaseType }) => {
    releaseType = chosenReleaseType

    targetVersion = getIncrementedVersion({
      version: targetPackage?.version ?? packageJson.version,
      type: releaseType,
    })
  })

  const Questions = MapPrompts({
    triggerBuild: 'Trigger full project build?',
    publishChangesToNPM: 'Publish release to NPM?',
    commitChanges: 'Commit changes to Git?',
  })

  await prompt<Answers>(Questions).then((answers) => {
    const { triggerBuild, publishChangesToNPM, commitChanges } = answers

    shouldTriggerBuild = triggerBuild
    shouldPublishChanges = publishChangesToNPM
    shouldCommitChanges = commitChanges
  })

  printReleaseOptions()

  await prompt<{
    shouldRelease: boolean
  }>({
    message: 'Do you want to to release?',
    name: 'shouldRelease',
    type: 'toggle',
    initial: true,
    enabled: 'Yes',
    disabled: 'No',
  } as any).then(({ shouldRelease }) => {
    if (!shouldRelease) {
      console.info('User aborted the release.')
      process.exit(0)
    }
  })

  /**
   * Build project to ensure latest changes are present
   */
  if (shouldTriggerBuild) {
    try {
      await execa('npm', ['run', 'build'], { stdio: 'inherit' })
    } catch (error) {
      console.error({ error })

      throw new Error('Error encountered when building project.')
    }
  }

  if (isDryRun) {
    console.info('Aborted. This was a dry run release.')
    process.exit(0)
  }

  /**
   * Increment all packages in project
   */
  try {
    if (targetPackage?.name === ALL_PACKAGES_TAG) {
      await updatePackageVersionsInRepository({
        targetFolders,
        version: targetVersion,
      })
    } else {
      await updateTargetPackageVersion({
        packageData: targetPackage,
        version: targetVersion,
      })
    }
  } catch (error) {
    console.error({ error })

    throw new Error('There was an error updating package versions')
  }

  return console.log('Stopping here')

  /**
   * Publish all public packages in repository
   */
  if (shouldPublishChanges) {
    if (targetPackage?.name === 'All packages') {
      await publishAllPackagesInRepository({
        targetFolders,
        tag: 'latest',
      }).catch((error) => {
        console.error({ error })

        throw new Error('Publishing to NPM failed.')
      })

      console.info(`\n  Released  version ${targetVersion} successfully! \n`)
    } else {
      await publishTargetPackage({
        packageData: targetPackage,
        tag: 'latest',
      }).catch((error) => {
        console.error({ error })

        throw new Error('Publishing to NPM failed.')
      })

      console.info(
        `\n  Released package ${targetPackage?.name} version ${targetVersion} successfully! \n`
      )
    }
  }

  /**
   * Stage and commit + push target version
   */
  if (shouldCommitChanges) {
    // Add root package.json
    const addFiles = []

    // Add target folder package.jsons
    addFiles.push(path.join(process.cwd(), './package.json'))

    targetFolders.forEach((folder) => {
      addFiles.push(path.join(process.cwd(), folder))
    })

    await git.add(addFiles)

    await git.commit(`[release] Version: ${targetVersion}`)

    await git.push()

    await git.addAnnotatedTag(
      targetVersion,
      `[release] Version: ${targetVersion}`
    )

    /**
     * Open up a browser tab within github to publish new release
     */
    open(
      githubRelease({
        user: 'atelier-saulx',
        repo: 'based',
        tag: targetVersion,
        title: targetVersion,
      })
    )
  }

  console.info(`\n  The release process has finished. \n`)
}

;(async () => {
  try {
    await releaseProject()
  } catch (error) {
    console.error('Release failed. Error: %o. \n', getErrorMessage(error))

    return process.exit(1)
  }
})()

function getErrorMessage(input: any) {
  const fallbackMessage = 'Unknown error'
  const rootMessage = input?.message ?? input ?? ''
  const errorMessage = rootMessage !== '' ? rootMessage : fallbackMessage
  return errorMessage
}
