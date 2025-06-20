import fs from "fs/promises";
import path from "path";
import type { BaseGenerator } from "./variableGenerators/baseGenerator.ts";
import { ScssGenerator } from "./variableGenerators/scssGenerator.ts";
import type { GetLocalVariablesResponse, LocalVariable, VariableAlias } from "@figma/rest-api-spec";
import { CssGenerator } from "./variableGenerators/cssGenerator.ts";

function getGenerators(meta: GetLocalVariablesResponse["meta"]): BaseGenerator<unknown>[] {
    // Here you can add more generators based on the meta data or configuration
    return [new ScssGenerator({ appendDefault: true }, meta), new CssGenerator({}, meta)];
}

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

async function readVariablesFromFile(filePath: string): Promise<GetLocalVariablesResponse["meta"]> {
    try {
        const variablesPath = path.resolve(filePath);
        const variablesContent = await fs.readFile(variablesPath, "utf-8");

        return JSON.parse(variablesContent);
    } catch (error) {
        throw new Error("Error reading variables file", { cause: error });
    }
}

(async () => {
    console.log("Reading variables from file...");
    const variablesPath = path.resolve(process.cwd(), process.env.VARIABLE_OUTPUT_FILE);
    let variableMeta = await readVariablesFromFile(variablesPath);

    const generators = getGenerators(variableMeta);

    const collectionCount = Object.keys(variableMeta.variableCollections).length;
    const variableCount = Object.keys(variableMeta.variables).length;

    console.log(`${collectionCount} variable collections and ${variableCount} variables found.`);

    for (const generator of generators) {
        console.group("Starting generation with", generator.constructor.name);
        for (const variableCollection of Object.values(variableMeta.variableCollections)) {
            console.log(
                `Processing collection: ${variableCollection.name} (${variableCollection.id})`
            );

            for (const mode of variableCollection.modes) {
                for (const variable of variableCollection.variableIds) {
                    const variableData = variableMeta.variables[variable];
                    if (!variableData) {
                        console.warn(`Variable ${variable} not found in meta.`);
                        continue;
                    }

                    const value = getVariableValue(variableMeta, variableData, mode.modeId);
                    if (value == null) {
                        continue;
                    }
                    const variableString = generator.createVariable(
                        { name: variableData.name, value },
                        { collectionId: variableCollection.id, modeId: mode.modeId }
                    );
                    generator.addToBuffer(variableString);
                }

                await generator.onModeCompleted(mode.modeId, variableCollection.id);
            }
            await generator.onCollectionCompleted(variableCollection.id);
        }
        await generator.onCompleted();
        console.groupEnd();
    }
})();
