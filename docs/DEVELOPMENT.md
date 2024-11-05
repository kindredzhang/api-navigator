# Development Guide

## Setup

1. Clone the repository
2. Install dependencies with `npm install`
3. Open the project in VS Code
4. Press F5 to launch the extension development host

## Development

- The main extension code is in `src/extension.ts`
- Run tests with `npm test`
- Build with `npm run compile`
- Package with `vsce package`

## Testing

1. Launch the extension development host with F5
2. Open a Java project to test with
3. Use Ctrl+Shift+A (Cmd+Shift+A on Mac) to search endpoints
4. Check the extension is working as expected

## Release Process

1. Update version number in package.json
2. Update CHANGELOG.md
3. Run all tests
4. Package extension
5. Test packaged extension
6. Publish to marketplace

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests
5. Submit a pull request

For more details, see CONTRIBUTING.md