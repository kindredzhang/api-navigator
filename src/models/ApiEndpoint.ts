export interface ApiEndpoint {
    path: string;           // Full API path
    className: string;      // Class name
    methodName: string;     // Method name
    filePath: string;       // File path
    lineNumber: number;     // Line number
    language: string;       // Programming language (for future extension)
} 