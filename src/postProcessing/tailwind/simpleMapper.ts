import type { CssVariable } from "./domain/cssVariable.ts";
import { CssVariableCollection } from "./domain/cssVariableCollection.ts";
import type { TailwindNamespace } from "./domain/tailwindTheme.ts";
import { extractVariablesByPrefix } from "./utils.ts";

type Prefix = string | string[] | PrefixRegex;
type PrefixRegex = [string | RegExp, string | RegExp][];
export type CssVariableModifier = (variable: CssVariable) => void;

type SimpleMapperOptions = {
    /**
     * When using as array, the first element is used to select variables,
     * the second element is used to replace the prefix in the variable name.
     */
    prefix: Prefix;
    tailwindNamespace: TailwindNamespace | TailwindNamespace[];
    variableModifier?: CssVariableModifier[];
    collectionName: string;
};

function isPrefixRegex(prefix: Prefix): prefix is PrefixRegex {
    return Array.isArray(prefix) && Array.isArray(prefix[0]);
}

export function simpleMapper(
    variables: CssVariable[],
    options: SimpleMapperOptions
): CssVariableCollection {
    const preparedVariables: CssVariable[] = isPrefixRegex(options.prefix)
        ? mapRegexPrefixedVariables(options.prefix, variables, options.tailwindNamespace)
        : mapPrefixedVariables(options.prefix, variables, options.tailwindNamespace);

    for (const modifier of options.variableModifier || []) {
        for (const variable of preparedVariables) {
            modifier(variable);
        }
    }

    return new CssVariableCollection(options.collectionName, preparedVariables);
}
function mapPrefixedVariables(
    prefix: string | string[],
    variables: CssVariable[],
    tailwindNamespace: string | string[]
): CssVariable[] {
    const preparedVariables: CssVariable[] = [];
    const prefixes = Array.isArray(prefix) ? prefix : [prefix];

    for (const prefix of prefixes) {
        const extractedVariables = extractVariablesByPrefix(prefix, variables);
        if (extractedVariables.length === 0) continue;

        const transformedVariables = transformAndNamespaceVariables(
            extractedVariables,
            tailwindNamespace,
            prefix
        );
        preparedVariables.push(...transformedVariables);
    }

    return preparedVariables;
}

function mapRegexPrefixedVariables(
    prefix: PrefixRegex,
    variables: CssVariable[],
    tailwindNamespace: string | string[]
): CssVariable[] {
    const preparedVariables: CssVariable[] = [];
    for (const [key, value] of prefix) {
        const extractedVariables = extractVariablesByPrefix(value, variables);
        if (extractedVariables.length === 0) continue;

        const transformedVariables = transformAndNamespaceVariables(
            extractedVariables,
            tailwindNamespace,
            key
        );
        preparedVariables.push(...transformedVariables);
    }

    return preparedVariables;
}

function* transformAndNamespaceVariables(
    extractedVariables: CssVariable[],
    tailwindNamespace: string | string[],
    oldPrefix: string | RegExp
) {
    for (const variable of extractedVariables) {
        for (const ns of typeof tailwindNamespace === "string"
            ? [tailwindNamespace]
            : tailwindNamespace) {
            const variableClone = variable.clone();
            variableClone.replacePrefix(oldPrefix, ns);
            yield variableClone;
        }
    }
}
