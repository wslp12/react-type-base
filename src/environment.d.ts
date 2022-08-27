declare global {
  namespace NodeJS {
    interface ProcessEnv {
      R_MODE: 'development' | 'production';
      R_RUN_MODE: 'development' | 'production' | 'local';
    }
  }
}

// If this file has no import/export statements (i.e. is a script)
// convert it into a module by adding an empty export statement.
export {};
