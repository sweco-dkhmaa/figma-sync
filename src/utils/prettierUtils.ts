import path from "path";
import prettier from "prettier";

export async function getPrettierConfig() {
    const prettierConfigPath = path.resolve(import.meta.dirname, "../../", ".prettierrc");
    const prettierConfig = await prettier.resolveConfig(prettierConfigPath);
    return prettierConfig || {};
}
