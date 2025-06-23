import type { RGB, RGBA } from "@figma/rest-api-spec";
import path from "path";
import prettier from "prettier";

export function isRGBA(color: unknown): color is RGBA {
    return isRGB(color) && "a" in color && typeof color.a === "number";
}

export function isRGB(color: unknown): color is RGB {
    if (typeof color !== "object" || color === null) return false;
    return (
        "r" in color &&
        "g" in color &&
        "b" in color &&
        typeof color.r === "number" &&
        typeof color.g === "number" &&
        typeof color.b === "number"
    );
}

export function capitalize(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
}

export function toCamelCase(str: string): string {
    return str
        .split(/(?:\W|_)+/)
        .map((word, index) => (index === 0 ? word.toLowerCase() : capitalize(word)))
        .join("");
}

export function toKebabCase(str: string): string {
    return str
        .split(/(?:\W|_)+/)
        .map((word) => word.toLowerCase())
        .join("-");
}

export async function getPrettierConfig() {
    const prettierConfigPath = path.resolve(import.meta.dirname, "../../", ".prettierrc");
    const prettierConfig = await prettier.resolveConfig(prettierConfigPath);
    return prettierConfig || {};
}
