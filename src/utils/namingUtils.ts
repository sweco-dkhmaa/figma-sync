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