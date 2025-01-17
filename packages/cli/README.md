# @based/cli

Based CLI allows control of features available in the Based dashboard UI account from the convenience of the command line and script repetitive actions like deploying functions and schema changes.

- [Global Arguments](#global-arguments)
- [Configuration file](#configuration-file)
- [Authentication](#authentication)
- Commands
  - [`login`](#login)
  - [`logout`](#logout)
  - [`deploy`](#deploy)
  - [`api-keys`](#api-keys)
  - [`secrets`](#secrets)

## Global Arguments

| Argument                         | Description                                                 |
| -------------------------------- | ----------------------------------------------------------- |
| `--help`                         | Display global help or help for a command.                  |
| `--org <org>`                    | Organization name overide.                                  |
| `-p, --project <project>`        | Project name overide.                                       |
| `-e, --env <env>`                | Environment name overide.                                   |
| `-b, --based-file <basedFile>`   | Location of your [configuration file](@configuration-file). |
| `-d, --debug`                    | Show more descriptive errors and debug information.         |
| `-k, --api-key <apiKey>`         | Authenticate using an [api-key](#api-keys) from file.       |
| `-H, --no-header`                | Don't show the header. Useful for chaining commands.        |
| `-o, --output [fancy,json,none]` | Output type. Defaults to `fancy`                            |

## Configuration file

Based CLI tries to find a configuration file named `based.json` or `based.js` in your current folder. It will walk up to the root folder of your project or up to your home folder if it cannot find it.
If a based file does not exist, the CLI will offer to save a new file.
The configuration file stores the organisation, project, and env that the CLI connects. The config file can be a JSON file or a javascript file, in which case it will execute it, expecting to export an object with the properties below.

#### Example:

```json
{
  "org": "saulx",
  "project": "hello",
  "env": "dev"
}
```

#### Configuration object properties

| Property  | Description        |
| --------- | ------------------ |
| `org`     | Organisation name. |
| `project` | Project name.      |
| `env`     | Environment name.  |

## Authentication

You need to be authenticated with your Based account to use the CLI.
Two options are available: email authentication or API Key authentication. The former is easiest for regular use, and the latter is meant to be used with non-interactive scripts.

Use the `login` command with your email as the argument to authenticate. The command will pause, and an email with an authentication link will be sent to your address. From any device, you need to click the link in the confirmation email you receive. It will notify the CLI and authenticate you automatically. No password is involved.

_NOTE: Based authentication emails use a three-word token in the message subject as a security feature. Make sure the words in the prompt match the ones in the email subject. Never click the link on an authentication email that does not match these three words._

```text
$ npx based login my@email.com
 _                        _
| |                      | |
| |__   __ _ ___  ___  __| |
| '_ \ / _` / __|/ _ \/ _` |
| |_) | (_| \__ \  __/ (_| |
|_.__/ \__,_|___/\___|\__,_|
                  CLI v0.8.1

┃ Org: saulx Project: hello Env: dev
┃
┃ Logging in.
┃ We sent an email to nuno@saulx.com.
┃ Please follow the steps provided inside it and
┃ make sure the message contains Scattered Gray Weasel.
⠦ Waiting for confirmation
```

After clicking the link, the CLI will log you in automatically and save a token in a `~/.based` on your home folder.

## Commands

### `login`

Authenticates the CLI with your project.
See [Authentication](#authentication) for more details.

| Argument  | Description |
| --------- | ----------- |
| `<email>` | Your email. |

Example:

```bash
$ npx based login your@email.com
```

### `logout`

Logout the CLI from your account.

Example:

```bash
$ npx based logout
```

### `deploy`

The `deploy` command updates your schema changes and data functions in one go.
The command searches your project folder for files that match the standard schema file name and data function folder format and shows you a summary of the changes updates about to happen. By default, it will show you the files found and ask if you want to update the schema, the data functions, or both. It can also be non-interactive when the `--schema` and `--functions` arguments are used.

Schema files are JSON files with an object containing a `schema` property with a [schema definition](https://github.com/atelier-saulx/based-docs/blob/main/docs/schema.md). Multiple databases can be updated simultaneously using an array of objects containing the `schema` property and an additional `db` property with the database name.
Javascript or typescript files can also be used. In this case, they should export an object or array just like the JSON file.
By default, schema files should be named `based.schema.json` (or `.js`/`.ts` in the case of javascript or typescript). The deploy command will search your project folders for these files, but you can also specify the location and name of your schema file using the `-f` variadic argument.

Data functions should be located in their own folder with a `based.config.js` file. The deploy command will search for this pattern to find the data functions to be deployed.
If you use dependencies, there should also be a `package.json` file alongside the data function index so it can be correctly bundled.

```
 ── functions
    ├── authorize
    │   ├── based.config.js
    │   └── index.ts
    ├── anotherFunction
    │   ├── based.config.js
    │   └── index.ts
    └── functionWithDependencies
        ├── based.config.js
        ├── index.ts
        └── package.json
```

The `authorize` function is a special function that authorizes based client to call other functions or queries. It's the place to add access logic and authentication.
More information about it in the [`authorize data function`](https://github.com/atelier-saulx/based/blob/main/packages/client/docs/authorize.md) documentation.

| Argument                  | Description                             |
| ------------------------- | --------------------------------------- |
| `--schema`                | Sets deploy shema option.               |
| `-f, --file <schemaFile>` | Location of the schema file. (Variadic) |
| `--functions`             | Sets deploy functions option.           |

Example:

```text
$ npx based deploy
 _                        _
| |                      | |
| |__   __ _ ___  ___  __| |
| '_ \ / _` / __|/ _ \/ _` |
| |_) | (_| \__ \  __/ (_| |
|_.__/ \__,_|___/\___|\__,_|
                  CLI v2.5.3

┃ Org: saulx Project: hello Env: dev
┃
┃ Deploying environment and/or schema
┃
┃ Function(s) built in 188ms
┃ name                ┃  observable ┃  shared ┃  status ┃  path
┃ authorize           ┃             ┃         ┃  new    ┃  ./based/functions/authorize/index.ts
┃ anotherFunction     ┃  ✔          ┃  ✔      ┃  new    ┃  ./based/functions/live/anotherFunction.ts
┃ functionWithDepe... ┃             ┃         ┃  new    ┃  ./based/functions/functionWithDependencies/index.ts
┃ and 30 unchanged function(s).
┃
┃ Schema at path ./based.schema.ts
┃
? What would you like to deploy? (Ctrl+C to abort) both
┃
┃ Succesfully updated schema(s) on hello/dev in 46ms
┃
┃ Succesfully deployed function authorize to hello/dev in 266ms
┃ Succesfully deployed function anotherFunction to hello/dev in 270ms
┃ Succesfully deployed function functionWithDependencies to hello/dev in 270ms

```

### `api-keys`

Manages apiKeys.
ApiKeys are offered as an alternative to email login. They are ideal for scripted CLI commands.
After generating an apiKey any command can be used with the `-k, --api-key` argument.

Example:

```Text
$ npx based deploy --schema --no-header --api-key ./apiKey.key

┃ Deploying environment and/or schema
┃
┃ Schema at path ./schema/schema.based.ts
┃
┃ Succesfully updated schema(s) on hello/dev in 26ms

```

| Subcommand                       | Description         |
| -------------------------------- | ------------------- |
| [`ls`](#api-keys-ls)             | List apiKeys.       |
| [`add`](#api-keys-add)           | Add apiKey.         |
| [`remove`](#api-keys-remove)     | Remove an apiKey.   |
| [`download`](#api-keys-download) | Download an apiKey. |

#### `api-keys ls`

Lists the apiKeys

Example:

```text
❯ npx based api-keys ls
 _                        _
| |                      | |
| |__   __ _ ___  ___  __| |
| '_ \ / _` / __|/ _ \/ _` |
| |_) | (_| \__ \  __/ (_| |
|_.__/ \__,_|___/\___|\__,_|
                  CLI v2.5.3

┃ Org: saulx Project: hello Env: dev
┃
┃ List apiKeys
┃
┃ name
┃ project-dev-key

```

#### `api-keys add`

The `add` subcommand adds a new apiKey or renews an existing one if an apiKey with the same name already exists.
It can be used as an interactive command or non-interactive when the `--name` argument is passed.
The generated key can be downloaded immediately and saved to a file with the `--file` argument or retrieved later using the [`api-keys download`](#api-keys-download) subcommand.

| Argument | Description                     |
| -------- | ------------------------------- |
| `--name` | Name or the apiKey to generate. |
| `--file` | Path to save the generated key. |

Example:

```text
❯ npx based api-keys add
 _                        _
| |                      | |
| |__   __ _ ___  ___  __| |
| '_ \ / _` / __|/ _ \/ _` |
| |_) | (_| \__ \  __/ (_| |
|_.__/ \__,_|___/\___|\__,_|
                  CLI v2.5.3

┃ Org: saulx Project: hello Env: dev
┃
┃ Add apiKey
┃
? What is the apiKey name? aKey
┃
┃ Added key aKey
```

#### `api-keys remove`

Removes an apiKey.
Can be used as an interactive command or non-interactive when the `--name` argument is passed.

| Argument | Description                     |
| -------- | ------------------------------- |
| `--name` | Name or the apiKey to generate. |

#### `api-keys download`

Downloads an existing apiKey.
Can be used as an interactive command or non-interactive when the `--name` and `--file` arguments are passed.

Example:

```text
$ npx based api-keys download --name aKey --file my_key.key
 _                        _
| |                      | |
| |__   __ _ ___  ___  __| |
| '_ \ / _` / __|/ _ \/ _` |
| |_) | (_| \__ \  __/ (_| |
|_.__/ \__,_|___/\___|\__,_|
                  CLI v2.5.3

┃ Org: saulx Project: hello Env: dev
┃
┃ Download apiKey
┃
┃
┃ Downloaded key aKey
┃ to file my_key.key

```

### `secrets`

Manages [based secrets]() for your organization.
Using the `secrets` command without any arguments will list all the secrets.
Secrets are added when a name is passed as the first argument, and the `-f` or `-v` arguments are used.
If the secret with the specified name already exists, it will be updated.
Secrets are organization-wide, so they are shared across all projects and environments.

| Argument              | Description                                          |
| --------------------- | ---------------------------------------------------- |
| `<name>`              | Name of the secret to add or delete.                 |
| `-f, --file <file>`   | Add a secret to an organization from a file.         |
| `-v, --value <value>` | Add a secret to an organization from a value inline. |
| `-D, --delete`        | Delete a secret from an organization. (Interactive)  |

Example:

```text
❯ npx based secrets aSecret --value "My super secret stuff"
 _                        _
| |                      | |
| |__   __ _ ___  ___  __| |
| '_ \ / _` / __|/ _ \/ _` |
| |_) | (_| \__ \  __/ (_| |
|_.__/ \__,_|___/\___|\__,_|
                  CLI v2.5.3

┃ Org: saulx Project: hello Env: dev
┃
┃ Manage secrets
┃
┃ Succesfully updated secret aSecret to saulx
┃ in 37ms

```

### `backup`

This is used to manage remote backups for your environment. Using this tool a user can **create**, **list**, **delete**, or **download** a backup file for any specific database of an environment.

| Subcommand                         | Description                    |
| ---------------------------------- | ------------------------------ |
| [`make`](#backup-make)             | Make a new remote backup.      |
| [`download`](#backup-download)     | Download a remote backup file. |
| [`list`](#backup-list)             | List remote backups.           |
| [`delete`](#backup-delete)         | Delete a remote backup.        |
| [`delete-all`](#backup-delete-all) | Delete all remote backups      |

#### `backup make`

This command requests the server to create a new remote backup with the current contents of the database.  
Depending on the size of the database, this may take a while.

| Argument                | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `-db --database [name]` | Name of the database to target. Defaults to `default`. |

#### `backup download`

This command is used to download a backup file to your computer.  
Depending on the size of the file, this may take a while.

| Argument                | Description                                                                            |
| ----------------------- | -------------------------------------------------------------------------------------- |
| `-db --database [name]` | Name of the database to target. Defaults to `default`.                                 |
| `-f --filename [name]`  | Name of the file to download. This option is only available in `non-interactive` mode. |

#### `backup list`

This command is used to list all existing backup files for a specific database.

| Argument                | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `-db --database [name]` | Name of the database to target. Defaults to `default`. |

#### `backup delete`

This command is used to permanently delete a remote backup file.  
:exclamation: **_This action is irreversible._**

| Argument                | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `-f --filename <name>`  | Name of the file to delete.                            |
| `-db --database [name]` | Name of the database to target. Defaults to `default`. |

#### `backup remove-all`

This command is used to permanently delete all remote backups for a specific database.  
:exclamation: **_This action is irreversible._**

| Argument                | Description                                            |
| ----------------------- | ------------------------------------------------------ |
| `-db --database [name]` | Name of the database to target. Defaults to `default`. |
