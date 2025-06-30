import fs from "fs/promises";
import { CssVariable } from "./domain/cssVariable.ts";
import type { CssVariableModifier } from "./simpleMapper.ts";

/**
 * Extracts variables from the provided array that match the given prefix.
 * The extracted variables are removed from the original array.
 *
 * @param prefix - The prefix or regular expression to match variable names.
 * @param variables - The array of variable names to filter.
 * @returns An array of extracted variable names that match the prefix.
 */
export function extractVariablesByPrefix(
    prefix: string | RegExp | (string | RegExp)[],
    variables: CssVariable[]
): CssVariable[] {
    const prefixes = Array.isArray(prefix) ? prefix : [prefix];
    const extractedVariables = variables
        .filter((line) => prefixes.some((p) => line.name.match(p)))
        .map((x) => x.clone());

    return extractedVariables;
}

/**
 * Reads a CSS file and extracts all CSS variable declarations.
 *
 * @param filePath - The path to the CSS file.
 * @returns A promise that resolves to an array of CSS variable declarations.
 **/
export async function getCssVariablesFromFile(filePath: string): Promise<CssVariable[]> {
    const fileContent = await fs.readFile(filePath, "utf-8");
    const variableDeclarations = fileContent
        .split(";")
        .map((line) => {
            line = line.replace(/[\r\n]+/, "");
            line = line.replace(/^(.*?)(?=\s--|^--)/, ""); // Remove everything before the first -- (CSS variable)
            line = line.trim();
            return line;
        })
        .filter((line) => line.startsWith("--"))
        .map((line) => new CssVariable(line));

    return variableDeclarations;
}

export function ignoreNamespaces(namespaces: (string | RegExp)[], variables: CssVariable[]): void {
    if (namespaces.length === 0) return;

    for (const namespace of namespaces) {
        extractVariablesByPrefix(namespace, variables); //Ignore variables with the specified namespaces
    }
}

type NumericUnit = "" | "px" | "rem" | "em" | "%";
export const PxToRem = 1 / 16;
export function numericToUnitModifier(
    unit: NumericUnit,
    multiplyer: number = 1
): CssVariableModifier {
    return (variable: CssVariable): void => {
        try {
            const numericValue = parseFloat(variable.value);
            if (isNaN(numericValue)) {
                return; // Return as is if the value is not a number
            }

            variable.value = `${numericValue * multiplyer}${unit}`;
        } catch (error) {
            throw new Error(`Error converting variable to px: ${variable}`, { cause: error });
        }
    };
}

export function wrapInRootDirective(content: string | string[]): string {
    return `:root { ${(typeof content === "string" ? [content] : content).join(" ")} }`;
}

export function wrapInDataDirective(
    variables: CssVariable[],
    options: { dataAttr: string; value: string }
): string {
    const variableDeclarations = variables.map((variable) => variable.toString()).join("\n");
    return `[data-${options.dataAttr}='${options.value}'] {\n ${variableDeclarations} \n}`;
}
