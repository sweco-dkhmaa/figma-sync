import type { GetLocalVariablesResponse } from "@figma/rest-api-spec";

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

async function fetchVariablesFromFigma(): Promise<GetLocalVariablesResponse> {
    let variableResponse: GetLocalVariablesResponse;
    try {
        const figmaUrl = process.env.FIGMA_VARIABLE_API_URL.replace(
            process.env.FIGMA_FILE_ID_PLACEHOLDER,
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

export async function getFigmaVariables(): Promise<GetLocalVariablesResponse["meta"]> {
    const variableResponse = await fetchVariablesFromFigma();
    return removeRemoteDefinitions(variableResponse.meta);
}
