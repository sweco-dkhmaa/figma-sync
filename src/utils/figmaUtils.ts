import type { RGB, RGBA } from "@figma/rest-api-spec";

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
