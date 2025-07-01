# Figma sync (CSS Only)
This project aims to sync variables from Figma file into various different formats to consume. The "CSS Only" branch, offers a slimmed version of the original draft. This doesn't contain code for generating variables in different languages, and offers only CSS.

The general through is for this repo to be as small as possible. It should contain just what is needed for syncing Figma variables to a CSS stylesheet. It's then up to each project/consumer to transform them into something that satisfies their needs.

## Get started
The project uses Yarn as package our package managers. If using Corepack the yarn version should self-adjust, otherwise run yarn `set version <version>`. Find the correct version in `package.json` under the `packageManager` field.

## How to run
All scripts run using TSX as node runner, to avoid compiling. They use dotenvx to inject `.env` and `.env.local`.

### Environment variables
The `.env` file contains all variables used in the project. To override any of them, create a local  `.env.local` file. It'll be auto injected as overrides.

| Variable | Description |
| --- | --- |
| FIGMA_ACCESS_TOKEN | The access token that is used to access Figma's API. The token only needs the following scope: `file_variables:read` |
| CSS_OUTPUT_FILE | Where the generated CSS file is placed. Defaults to `./output/variables.css` |
| FIGMA_FILE_ID | The file that the variables should be read from. This can be found by opening the targetet Figma file and reading it's url. It'll contain a series of letters/numbers. Eg. `https://www.figma.com/design/<FileId>/...` |
| FIGMA_VARIABLE_API_URL | The endpoint URL to access variables. Includes a placeholder for the fileId. |
| FIGMA_FILE_ID_PLACEHOLDER | The placeholder from `FIGMA_VARIABLE_API_URL` used to search and replace with `FIGMA_FILE_ID` |

### Scripts

Currently the project has 1 script:
| Script | Description |
| --- | --- |
| generate | Fetches variables from Figma. Transforms them into CSS variables. Stores them in a `:root` directive, in a css file at the specified location |