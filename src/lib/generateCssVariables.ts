import type {
    GetLocalVariablesResponse,
    LocalVariable,
    VariableAlias,
    VariableData
} from "@figma/rest-api-spec";
import fs from "fs/promises";
import path from "path";
import prettier from "prettier";
import { toKebabCase, getPrettierConfig, isRGB, isRGBA } from "./utils.ts";

function isVariableAlias(value: unknown): value is VariableAlias {
    const isAlias = value && typeof value === "object" && "id" in value && "type" in value;
    if (isAlias) {
        return true;
    }
    return false;
}

function getVariableValue(
    meta: GetLocalVariablesResponse["meta"],
    variable: LocalVariable,
    modeId: string
) {
    const value = variable.valuesByMode[modeId];
    if (isVariableAlias(value)) {
        const referencedVariable = meta.variables[value.id];
        const referencedCollection =
            meta.variableCollections[referencedVariable.variableCollectionId];
        return getVariableValue(meta, referencedVariable, referencedCollection.defaultModeId);
    }
    return value;
}

function getCssValue(value: VariableData["value"]): string | undefined {
    let cssValue: string | undefined;
    if (typeof value === "undefined") cssValue = "";
    else if (typeof value === "string") cssValue = `'${value}'`;
    else if (typeof value === "number") cssValue = `${value}`;
    else if (typeof value === "boolean") cssValue = value ? "true" : "false";
    else if (isRGBA(value) || isRGB(value)) {
        cssValue = `rgb(${Math.round(value.r * 255)} ${Math.round(value.g * 255)} ${Math.round(value.b * 255)}${"a" in value ? ` / ${value.a}` : ""})`;
    }

    return cssValue;
}

function createVariable(
    variable: { name: string; value: VariableData["value"] },
    meta: { collectionName: string; modeName?: string }
): string {
    const { name, value } = variable;
    let cssValue = getCssValue(value);

    if (!cssValue) {
        console.warn(`Unsupported value type for variable "${name}": ${typeof value}`);
    }

    const collectionName = toKebabCase(meta.collectionName);
    const modeName = meta.modeName ? toKebabCase(meta.modeName) : "";
    const variableName = toKebabCase(name);

    const cssVariableName = `--${[collectionName, modeName, variableName].filter((x) => x).join("-")}`;
    const cssVariable = `${cssVariableName}: ${cssValue};`;

    return cssVariable;
}

async function writeToFile(fileName: string, fileContent: string): Promise<void> {
    const prettierConfig = await getPrettierConfig();
    fileContent = await prettier.format(fileContent, {
        ...prettierConfig,
        parser: "css"
    });

    const outputPath = path.resolve(fileName);

    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, fileContent, "utf-8");
}

export async function generateCssVariables(
    variables: GetLocalVariablesResponse["meta"]
): Promise<void> {
    const cssVariables: string[] = [];
    for (const variableCollection of Object.values(variables.variableCollections)) {
        const multiMode = variableCollection.modes.length > 1;
        for (const mode of variableCollection.modes) {
            for (const variable of variableCollection.variableIds) {
                const variableData = variables.variables[variable];
                if (!variableData) {
                    console.warn(`Variable ${variable} not found in meta.`);
                    continue;
                }

                const value = getVariableValue(variables, variableData, mode.modeId);
                if (value == null) {
                    continue;
                }

                const variableString = createVariable(
                    { name: variableData.name, value },
                    {
                        collectionName: variableCollection.name,
                        modeName: multiMode ? mode.name : undefined
                    }
                );
                cssVariables.push(variableString);
            }
        }
    }

    let fileContent = `:root {\n${cssVariables.join("\n")}\n}`;

    await writeToFile(process.env.CSS_OUTPUT_FILE, fileContent);
}
