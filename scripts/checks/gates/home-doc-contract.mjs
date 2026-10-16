/**
 * Gate core about the home-document contract: `docs/home.md` must name every room and archive
 * directory the layout declares, and every room tool the package registers. The document is the
 * contract a reader trusts; a room it never mentions is a room nobody can find.
 */

/**
 * Judge the layout constants against the document.
 * @param {{ layoutText: string, documentText: string, roomConstants: string[], tools: string[] }} inputs -
 * both files as text, the constant names to resolve, and the tool names that must be named.
 * @returns {string[]} one problem per undeclared constant or unmentioned value/tool.
 */
export function homeDocContractProblems({ layoutText, documentText, roomConstants, tools }) {
  const problems = []
  for (const constant of roomConstants) {
    const value = new RegExp(`export const ${constant} = '([a-z]+)'`).exec(layoutText)?.[1]
    if (value === undefined) problems.push(`layout.ts does not declare ${constant}`)
    else if (!documentText.includes(value)) problems.push(`docs/home.md never mentions ${value}`)
  }
  for (const tool of tools) {
    if (!documentText.includes(tool)) problems.push(`docs/home.md never mentions ${tool}`)
  }
  return problems
}
