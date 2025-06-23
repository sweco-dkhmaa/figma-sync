# Figma sync
This project aims to sync variables from Figma file into various different formats to consume.
Currently the following are in progress (or partly complete):
- CSS Variables
   - All plain variables inside CSS directive
- SCSS Variables
   - All variables seperated by namespace and modes
- Tailwind theming
   - Convert CSS variables into a theme directive from Tailwind. This includes light-mode and dark-mode variables.

## Get started
The project uses Yarn as package our package managers. If using Corepack the yarn version should self-adjust, otherwise run yarn `set version <version>`. Find the correct version in `package.json` under the `packageManager` field.

Get started by running `yarn install`

## How to run
*This is currently under revision and should be updated along with project structure.*

All scripts run using TSX as node runner, to avoid compiling. They use dotenvx to inject `.env` and `.env.local`.

Currently the project has 4 scripts:
| Script | Description |
| --- | --- |
| fetch-variables | Used to fetch variables from Figma and saves the important part of the response as an .json file. |
| generate |Used to generate language specific variables. Currently runs both CSS and SCSS generators |
| tailwind |Generates tailwind theming based on CSS variables from generate script. |
| all |Currently runs all other 3 scripts synchronus to give the "full" view. |

## Thoughts 
This section will be a little messy, but I'll try to explain the thought process and why it's made the way it is.

### Fetching variables
To fetch variables from Figma, the `src/fetchVariables.ts` is entry point. This uses the following variables in the environment file:
| Variable | Description |
| --- | --- |
| FIGMA_FILE_ID |The Figma file id of the design system. This is used as a parameter to tell figma which file to pull variables from. |
| FIGMA_ACCESS_TOKEN | Personalized access token that gives API access on behalf of a user. This haves a max lifespan of 3 months, so not a very good way to keep long running access. |
| VARIABLE_OUTPUT_FILE | File path that tells where to place the variables fetched from the API |

When fetching variables it will extract the VariableCollections and Variables from the Figma API response, and save them as json format in the given path.

### Generators for language specific syntax
*This was originally made because we use SCSS/SASS in the new RoSy project. But seems like we are moving towards just using css and tailwind.*

This relys on the variables being prefetched, and uses the following environment variable.
| Variable | Description |
| --- | --- | 
| VARIABLE_OUTPUT_FILE | Where the file with the variables are located. |

In addition each generator may define it's variables to be used
| Generator | Variable | Description |
| --- | --- | --- |
| CssGenerator |CSS_OUTPUT_FILE | Where to place the css variable output file |
| ScssGenerator |SCSS_OUTPUT_DIR | Where to place the scss variables output files |

All custom generators should derive from the class BaseGenerator and be added inside the generator array in `generateVariables.ts`.
When running the `generateVariables.ts` it loops through all variable collections and the variables. For each generator defined it'll emit
an event durent specific tasks. It's up to the generator to implement those events and define what happens. The `generateVariables.ts` is only to resolve initial variables, collections and modes.

### Post processing
This was made to give an opportunity to post process variables in a specific language into a specific framework/syntax. Currently this only contains a Tailwind specific implementation.

#### Tailwind
Environment variables used: 
| Variable | Description |
| --- | --- |
| CSS_OUTPUT_FILE | Where to extract the initial CSS variables from |
| TAILWIND_OUTPUT_FILE | Where to output the generated tailwind theme |

For now this extracts all variables from the css variables file. Then based on a configured ruleset does the following
- Creates a light/dark mode theme,
- Maps specific Figma variable namespaces to equivelent Tailwind namespaces
- Generates a tailwind @theme declaration

## Ending notes
If all we care about is a simple mapping from Figma into CSS variables then, we can cut heavily on the code. This means each project can implement their own mapper, if needed. Eg. Tailwind mapper inside RoSy project instead of here. It only makes sense if multiple projects are using the same mapper.
