/**
 * Language configuration for starter code and file detection
 */
export const LANGUAGE_CONFIG = {
  rust: {
    mainFile: 'src/main.rs',
    extensions: ['.rs'],
    defaultCode: 'fn main() {\n    // Start coding here\n}',
    codeBlockId: 'rust',
  },
  python: {
    mainFile: 'main.py',
    extensions: ['.py'],
    defaultCode:
      '# Start coding here\n\ndef main():\n    pass\n\nif __name__ == "__main__":\n    main()',
    codeBlockId: 'python',
  },
  javascript: {
    mainFile: 'index.js',
    extensions: ['.js', '.mjs'],
    defaultCode: '// Start coding here\n\nfunction main() {\n    \n}\n\nmain();',
    codeBlockId: 'javascript',
  },
  typescript: {
    mainFile: 'index.ts',
    extensions: ['.ts', '.tsx'],
    defaultCode: '// Start coding here\n\nfunction main(): void {\n    \n}\n\nmain();',
    codeBlockId: 'typescript',
  },
}

/**
 * Get the main file name for a language
 * @param {string} language
 * @returns {string}
 */
export function getMainFileName(language) {
  return LANGUAGE_CONFIG[language]?.mainFile || LANGUAGE_CONFIG.rust.mainFile
}

/**
 * Get the language from a file path
 * @param {string} filePath
 * @param {string} [fallbackLanguage='rust']
 * @returns {string}
 */
export function getLanguageFromPath(filePath, fallbackLanguage = 'rust') {
  if (!filePath) return fallbackLanguage

  for (const [lang, config] of Object.entries(LANGUAGE_CONFIG)) {
    if (config.extensions.some((ext) => filePath.endsWith(ext))) {
      return lang
    }
  }
  return fallbackLanguage
}
