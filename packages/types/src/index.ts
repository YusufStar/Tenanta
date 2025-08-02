export interface DatabaseConfig {
  DatabaseConfig: {
    host: string;
    port: number;
    database: string;
    user: string;
    password: string;
    poolSize: number;
  }
}

export interface RedisConfig {
  url: string;
  database: number;
  password: string;
  prefix: string;
}
