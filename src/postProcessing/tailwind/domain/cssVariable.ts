export class CssVariable {
    name: string;
    value: string;
    constructor(variable: string | { name: string; value: string }) {
        if (typeof variable === "string") {
            const { name, value } = deconstructVariabeDeclaration(variable);
            this.name = this.normalizeVariableStart(name);
            this.value = value;
            return;
        }
        this.name = this.normalizeVariableStart(variable.name);
        this.value = variable.value.replace(/;$/, "").trim(); // Remove trailing semicolon
    }

    protected normalizeVariableStart(name: string): string {
        return `--${name.replace(/^-+/, "").trim()}`;
    }
    protected normalizeVariableEnd(name: string): string {
        return name.replace(/;$/, "").trim();
    }

    setVarValue(variableName: string): void {
        this.value = `var(${variableName})`;
    }

    toString(): string {
        return `${this.normalizeVariableStart(this.name)}: ${this.normalizeVariableEnd(this.value)};`;
    }
    addPrefix(prefix: string): string {
        if (!prefix) return this.name;
        let name = this.name
            .replace(/^-+/, "") // Remove leading dashes
            .trim();

        name = [prefix, name].join("-");
        name = this.normalizeVariableStart(name);
        this.name = name;

        return this.name;
    }
    removePrefix(prefix: string): string {
        if (!prefix) return this.name;
        this.name = this.name.replace(new RegExp(`^${prefix}`), "").trim();
        return this.name;
    }
    replacePrefix(oldPrefix: string, newPrefix: string): string {
        this.removePrefix(oldPrefix);
        this.addPrefix(newPrefix);
        return this.name;
    }
    hasPrefix(prefix: string): boolean {
        if (!prefix) return false;
        return this.name.startsWith(prefix);
    }
    clone(): CssVariable {
        return new CssVariable({ name: this.name, value: this.value });
    }
}

function deconstructVariabeDeclaration(variable: string): {
    name: string;
    value: string;
} {
    const variableParts = variable.split(":", 2);
    if (variableParts.length !== 2) {
        throw new Error(`Invalid variable declaration: ${variable}`);
    }

    const name = variableParts[0].trim();
    const value = variableParts[1].replace(/;$/, "").trim(); // Join the rest and remove trailing semicolon

    return { name, value };
}
