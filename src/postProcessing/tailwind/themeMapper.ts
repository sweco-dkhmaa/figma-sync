import { CssVariable } from "./domain/cssVariable.ts";
import { TailwindNamespace } from "./domain/tailwindTheme.ts";
import type { CssDirectivesWithPointers } from "./types.ts";
import { extractVariablesByPrefix, wrapInRootDirective } from "./utils.ts";

const colorPrefix = "--semantic-color";
const colorThemes = {
    light: "-light",
    dark: "-dark"
} as const;

function createTheme(themeName: string, variableDeclarations: CssVariable[]): string {
    if (variableDeclarations.length === 0) {
        return "";
    }

    // Return the CSS rule for the theme
    return `[data-theme="${themeName}"] { ${variableDeclarations.join(" ")} }`;
}

/**
 * Maps color themes from the provided variables.
 *
 * @param variables - An array of variable declarations.
 * @returns A promise that resolves to CSS selectors using data-theme attributes
 * with theme-specific color variables. Each selector uses the theme name as its
 * data-theme value (e.g., [data-theme="light"], [data-theme="dark"]).
 */
export async function mapColorThemes(variables: CssVariable[]): Promise<CssDirectivesWithPointers> {
    const generatedThemes = new Map<string, CssVariable[]>();
    const themeableVariables = extractVariablesByPrefix(colorPrefix, variables);
    for (const [themeName, themePrefix] of Object.entries(colorThemes)) {
        const themeVariables: CssVariable[] = [];
        for (const variableDeclaration of themeableVariables) {
            if (!variableDeclaration.hasPrefix(colorPrefix + themePrefix)) continue;
            variableDeclaration.replacePrefix(colorPrefix + themePrefix, colorPrefix);

            themeVariables.push(variableDeclaration);
        }
        generatedThemes.set(themeName, themeVariables);
    }

    //Check if themes have all the same variables

    // Check if all themes have identical variable sets
    ensureUniformThemeVariables(generatedThemes);

    const themes = [...generatedThemes.entries()].map(([name, variables]) =>
        createTheme(name, variables)
    );
    const rootThemeDirective = wrapInRootDirective(themes.join(" "));

    const tailwindThemePointers: CssVariable[] = [...generatedThemes.values()][0].map(
        (variable) => {
            const pointer = variable.clone();
            pointer.replacePrefix(colorPrefix, TailwindNamespace.color);
            pointer.setVarValue(variable.name);
            return pointer;
        }
    );

    return {
        directives: [rootThemeDirective],
        pointers: tailwindThemePointers
    };
}

function ensureUniformThemeVariables(generatedThemes: Map<string, CssVariable[]>) {
    const themeEntries = Array.from(generatedThemes.entries());
    if (themeEntries.length === 0) return;

    const [_firstThemeName, firstThemeVarsArr] = themeEntries[0];
    const firstThemeVars = new Set(firstThemeVarsArr.map((x) => x.name));

    let missingInfo: string[] = [];

    for (const [themeName, varSet] of themeEntries) {
        const currentVars = new Set(varSet.map((x) => x.name));

        missingInfo.push(...collectMissingVariables(firstThemeVars, currentVars, themeName));
        missingInfo.push(...collectExtraVariables(firstThemeVars, currentVars, themeName));
    }

    if (missingInfo.length > 0) {
        throw new Error(
            "Not all themes have the same variables. This is required for CSS themes.",
            { cause: missingInfo.join("\n") }
        );
    }
}

function collectMissingVariables(
    referenceVars: Set<string>,
    currentVars: Set<string>,
    themeName: string
): string[] {
    const missingInfo: string[] = [];
    for (const varName of referenceVars) {
        if (!currentVars.has(varName)) {
            missingInfo.push(`Variable "${varName}" is missing in theme "${themeName}".`);
        }
    }

    return missingInfo;
}

function collectExtraVariables(
    referenceVars: Set<string>,
    currentVars: Set<string>,
    themeName: string
): string[] {
    const missingInfo: string[] = [];
    for (const varName of currentVars) {
        if (!referenceVars.has(varName)) {
            missingInfo.push(
                `Variable "${varName}" in theme "${themeName}" is not present in all themes.`
            );
        }
    }

    return missingInfo;
}
