import * as assert from 'assert';
import { ApiEndpointProvider } from '../../providers/ApiEndpointProvider';

suite('Extension Test Suite', () => {
    test('Provider initialization', () => {
        const provider = ApiEndpointProvider.getInstance();
        assert.ok(provider);
    });

    test('Endpoint parsing', async () => {
        const provider = ApiEndpointProvider.getInstance();
        await provider.scanWorkspace();
        const endpoints = provider.getEndpoints();
        assert.ok(Array.isArray(endpoints));
    });
}); 