export type ProjectType = 'springBoot' | 'express' | 'nest' | 'gin' | 'echo' | 'fastapi' | 'unknown';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface EndpointMetadata {
    parameters: Parameter[];
    returnType: string;
    documentation?: string;
    deprecated?: boolean;
}

export interface Parameter {
    name: string;
    type: string;
    required: boolean;
    description?: string;
}

// export interface ApiEndpoint {
//     apiPath: string;
//     className: string;
//     methodName: string;
//     filePath: string;
//     lineNumber: number;
//     language: string;
//     httpMethod: HttpMethod;
//     metadata?: EndpointMetadata;
// }

export interface ApiEndpoint {
    apiPath: string;           // Full API path
    className: string;      // Class name
    methodName: string;     // Method name
    filePath: string;       // File path
    lineNumber: number;     // Line number
    language: string;       // Programming language (for future extension)
    httpMethod?: string;    // HTTP method
    parameters?: string[];  // Parameters
    returnType?: string;    // Return type
} 

export interface ScannerConfig {
    fileExtensions: string[];
    excludePatterns: string[];
    maxFileSizeBytes?: number;
} 

export interface Scanner {
    scan(folderPath: string): Promise<ApiEndpoint[]>;
    isValidFile(content: string): boolean;
    parseFile(content: string, filePath: string): Promise<ApiEndpoint[]>;
} 