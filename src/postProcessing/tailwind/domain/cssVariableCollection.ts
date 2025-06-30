import type { CssVariable } from "./cssVariable.ts";

export class CssVariableCollection implements Iterable<CssVariable> {
    private variables: CssVariable[] = [];
    name: string;

    constructor(name: string, variables: CssVariable[] = []) {
        this.variables = variables;
        this.name = name;
    }

    add(variables: CssVariable | CssVariable[]): void {
        this.variables.push(...(Array.isArray(variables) ? variables : [variables]));
    }

    remove(variable: CssVariable): void {
        this.variables = this.variables.filter((v) => v.name !== variable.name);
    }

    clear(): void {
        this.variables = [];
    }

    toString(): string {
        return this.variables.map((variable) => variable.toString()).join("\n");
    }

    [Symbol.iterator](): Iterator<CssVariable> {
        return this.variables[Symbol.iterator]();
    }
}
