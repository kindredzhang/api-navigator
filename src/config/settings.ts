import { ProjectType, ScannerConfig } from '../core/types';

export interface ProjectSettings {
    scannerConfigs: Record<ProjectType, ScannerConfig>;
    cacheSettings: {
        maxSize: number;
        ttl: number;
    };
    searchSettings: {
        debounceTime: number;
        maxResults: number;
    };
}

export const defaultSettings: ProjectSettings = {
    scannerConfigs: {
        'springBoot': {
            fileExtensions: ['java'],
            excludePatterns: ['test', 'build'],
            maxFileSizeBytes: 1024 * 1024
        },
        'express': {
            fileExtensions: ['js', 'ts'],
            excludePatterns: ['node_modules', 'test'],
            maxFileSizeBytes: 512 * 1024
        },
        'nest': {
            fileExtensions: ['ts'],
            excludePatterns: ['node_modules', 'test'],
            maxFileSizeBytes: 512 * 1024
        },
        'gin': {
            fileExtensions: ['go'],
            excludePatterns: ['vendor', 'test'],
            maxFileSizeBytes: 512 * 1024
        },
        'echo': {
            fileExtensions: ['go'],
            excludePatterns: ['vendor', 'test'],
            maxFileSizeBytes: 512 * 1024
        },
        'fastapi': {
            fileExtensions: ['py'],
            excludePatterns: ['test', '__pycache__', 'venv', '.env'],
            maxFileSizeBytes: 512 * 1024
        },
        'unknown': {
            fileExtensions: [],
            excludePatterns: []
        }
    },
    cacheSettings: {
        maxSize: 100,
        ttl: 3600000 // 1 hour
    },
    searchSettings: {
        debounceTime: 300,
        maxResults: 100
    }
}; 