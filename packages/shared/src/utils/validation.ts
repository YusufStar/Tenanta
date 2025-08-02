export class ValidationUtils {
  static isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  static isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  }

  static isValidSchemaName(name: string): boolean {
    // PostgreSQL schema name rules
    const schemaNameRegex = /^[a-z][a-z0-9_]*$/;
    return schemaNameRegex.test(name) && name.length <= 63;
  }

  static isValidTableName(name: string): boolean {
    // PostgreSQL table name rules
    const tableNameRegex = /^[a-z][a-z0-9_]*$/;
    return tableNameRegex.test(name) && name.length <= 63;
  }

  static isValidColumnName(name: string): boolean {
    // PostgreSQL column name rules
    const columnNameRegex = /^[a-z][a-z0-9_]*$/;
    return columnNameRegex.test(name) && name.length <= 63;
  }

  static sanitizeString(input: string): string {
    return input.trim().replace(/[<>]/g, '');
  }

  static validatePagination(page: number, limit: number): boolean {
    return page > 0 && limit > 0 && limit <= 100;
  }
} 