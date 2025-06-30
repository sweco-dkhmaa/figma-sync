import type { CssVariable } from "./cssVariable.ts";
import { CssVariableCollection } from "./cssVariableCollection.ts";

export const TailwindNamespace = {
    color: "--color",
    breakpoint: "--breakpoint",
    text: "--text",
    font: "--font",
    fontWeight: "--font-weight",
    leading: "--leading",
    radius: "--radius",
    borderWidth: "--border-width", //Undocumented in Tailwind
    spacing: "--spacing",
    insetShadow: "--inset-shadow",
    backgroundColor: "--background-color",
    textColor: "--text-color",
    borderColor: "--border-color",
    ringColor: "--ring-color",
    ringWidth: "--ring-width",
} as const;

export type TailwindNamespace = (typeof TailwindNamespace)[keyof typeof TailwindNamespace];

export class TailwindTheme {
    protected _variables: CssVariable[] = [];
    protected _variableCollections: CssVariableCollection[] = [];
    namespacesToReset: TailwindNamespace[] = [];

    constructor(resetNamespaces: TailwindNamespace[] = []) {
        this.namespacesToReset = resetNamespaces;
    }

    addVariables(variables: CssVariable | CssVariable[] | CssVariableCollection): void {
        if (variables instanceof CssVariableCollection) {
            this._variableCollections.push(variables);
            return;
        }

        this._variables.push(...(Array.isArray(variables) ? variables : [variables]));
    }

    protected wrapInThemeDeclaration(): string {
        const singleVariables: string[] = this._variables.map((variable) => variable.toString());
        const collectionsVariables: string[] = this._variableCollections.flatMap((collection) => {
            const vars: string[] = [`\n/*## ${collection.name} ##*/`];
            vars.push(...[...collection].map((variable) => variable.toString()));
            return vars;
        });

        const resetVariables: string[] = this.namespacesToReset.map(
            (namespace) => `${namespace}-*: initial;`
        );

        const allVariableDeclarations: string = [
            resetVariables.join("\n"),
            singleVariables.join("\n"),
            collectionsVariables.join("\n")
        ].join("\n");

        return `@theme inline {\n ${allVariableDeclarations} \n}`;
    }

    toString(): string {
        return this.wrapInThemeDeclaration();
    }
}
