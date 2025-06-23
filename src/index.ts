import { getFigmaVariables } from "./lib/fetchVariables.ts";
import { generateCssVariables } from "./lib/generateCssVariables.ts";

(async () => {
    const variables = await getFigmaVariables();
    await generateCssVariables(variables);
})();
