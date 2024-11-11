# Change Log
## [0.0.5] - 2024-11-11
  - Fixed some bugs
  
## [0.0.4] - 2024-11-08
### Added
- **Support for Multiple Frameworks**: 
  - Added support for **Express.js**: Now you can scan and navigate API endpoints defined in Express applications.
  - Added support for **Nest.js**: Integrated support for Nest framework, allowing endpoint detection in Nest applications.
  - Added support for **Gin**: Included support for Gin framework, enabling seamless integration for projects using Gin.
  - Added support for **Echo**: Now supports Echo framework, allowing for easy navigation of API endpoints.

### Fixed
- **Bug Fixes**: Resolved several known issues that were affecting the stability and performance of the application. This includes:
  - Fixed a bug that caused incorrect routing in certain scenarios.
  - Addressed issues with API endpoint detection that led to false positives.
  - Improved error handling for file scanning processes.

### Notes
- Users are encouraged to update to this version to benefit from the new features and improvements.

## [0.0.3] - 2024-11-05
### Fixed
- Fixed duplicate slashes in API paths
- Fixed API path parsing for root RequestMapping ("/")
- Improved API endpoint detection accuracy
- Added support for custom keyboard shortcuts
- Enhanced performance with caching

## [0.0.2] - 2024-11-02
### Added
- Support for Spring Boot REST API endpoints
- Quick search functionality
- Context path support

## [0.0.1] - 2024-10-31
- Initial release