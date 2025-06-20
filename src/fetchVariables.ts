import fs from "fs/promises";
import path from "path";
import prettier from "prettier";
import { getPrettierConfig } from "./utils/prettierUtils.ts";
import type { GetLocalVariablesResponse } from "@figma/rest-api-spec";

const figmaVariableUrlTemplate = "https://api.figma.com/v1/files/{{fileId}}/variables/local";
const fileIdPlaceholder = "{{fileId}}";

function removeRemoteDefinitions(
    variableMeta: GetLocalVariablesResponse["meta"]
): GetLocalVariablesResponse["meta"] {
    const removedCollections: string[] = [];
    const filteredCollections = Object.fromEntries(
        Object.entries(variableMeta.variableCollections).filter(([_id, collection]) => {
            if (collection.remote) {
                removedCollections.push(collection.id);
                return false;
            }
            return true;
        })
    );
    const filteredVariables = Object.fromEntries(
        Object.entries(variableMeta.variables).filter(([_id, variable]) => {
            if (variable.remote || removedCollections.includes(variable.variableCollectionId)) {
                return false;
            }
            return true;
        })
    );

    return {
        variableCollections: filteredCollections,
        variables: filteredVariables
    };
}

async function saveToFile(filePath: string, content: object): Promise<void> {
    try {
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        let fileContent = JSON.stringify(content);
        const prettierConfig = await getPrettierConfig();
        fileContent = await prettier.format(fileContent, { ...prettierConfig, parser: "json" });
        await fs.writeFile(filePath, fileContent, "utf-8");
    } catch (error) {
        throw new Error("Error writing to output directory", { cause: error });
    }
}

async function fetchVariablesFromFigma(): Promise<GetLocalVariablesResponse> {
    let variableResponse: GetLocalVariablesResponse;
    try {
        const figmaUrl = figmaVariableUrlTemplate.replace(
            fileIdPlaceholder,
            process.env.FIGMA_FILE_ID
        );
        const response = await fetch(figmaUrl, {
            headers: {
                "X-Figma-Token": process.env.FIGMA_ACCESS_TOKEN
            }
        });
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        variableResponse = (await response.json()) as GetLocalVariablesResponse;

        if (variableResponse.status !== 200 || variableResponse.error) {
            throw new Error(`Error fetching variables: ${JSON.stringify(variableResponse)}`);
        }
    } catch (error) {
        throw new Error("Error fetching variables:", { cause: error });
    }

    return variableResponse;
}

(async () => {
    console.log("Fetching variables from figma...");
    let variableResponse = await fetchVariablesFromFigma();

    variableResponse.meta = removeRemoteDefinitions(variableResponse.meta);

    console.log("Variables fetched successfully. Writing to output directory...");
    const outputPath = path.resolve(process.cwd(), process.env.VARIABLE_OUTPUT_FILE);
    saveToFile(outputPath, variableResponse.meta);
    console.log(`Variables written to ${outputPath}`);
})();
