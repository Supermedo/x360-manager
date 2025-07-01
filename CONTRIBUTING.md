# Contributing to X360 Manager

First off, thank you for considering contributing to X360 Manager! It's people like you that make X360 Manager such a great tool for the Xbox 360 emulation community.

## Code of Conduct

By participating in this project, you are expected to uphold our Code of Conduct. Please report unacceptable behavior to mohmmad.pod@gmail.com.

## How Can I Contribute?

### Reporting Bugs

This section guides you through submitting a bug report for X360 Manager. Following these guidelines helps maintainers and the community understand your report, reproduce the behavior, and find related reports.

**Before Submitting A Bug Report:**
- Check the [Issues](https://github.com/mohammedalbarthouthi/x360-manager/issues) to see if the problem has already been reported
- Check that you're using the latest version of X360 Manager
- Verify that the issue is reproducible

**How Do I Submit A Bug Report?**

Bugs are tracked as [GitHub issues](https://github.com/mohammedalbarthouthi/x360-manager/issues). Create an issue and provide the following information:

- **Use a clear and descriptive title**
- **Describe the exact steps to reproduce the problem**
- **Provide specific examples to demonstrate the steps**
- **Describe the behavior you observed after following the steps**
- **Explain which behavior you expected to see instead and why**
- **Include screenshots and animated GIFs** if possible
- **Include your environment details** (OS version, X360 Manager version, Xenia version)

### Suggesting Enhancements

This section guides you through submitting an enhancement suggestion for X360 Manager.

**Before Submitting An Enhancement Suggestion:**
- Check if the enhancement has already been suggested
- Check if the enhancement fits the project's scope
- Consider if the enhancement would be useful to most users

**How Do I Submit An Enhancement Suggestion?**

Enhancement suggestions are tracked as [GitHub issues](https://github.com/mohammedalbarthouthi/x360-manager/issues). Create an issue and provide the following information:

- **Use a clear and descriptive title**
- **Provide a step-by-step description of the suggested enhancement**
- **Provide specific examples to demonstrate the enhancement**
- **Describe the current behavior** and **explain which behavior you expected to see instead**
- **Explain why this enhancement would be useful**
- **Include mockups or sketches** if applicable

### Pull Requests

The process described here has several goals:

- Maintain X360 Manager's quality
- Fix problems that are important to users
- Engage the community in working toward the best possible X360 Manager
- Enable a sustainable system for maintainers to review contributions

**Before Submitting A Pull Request:**

1. **Fork the repository** and create your branch from `main`
2. **Install dependencies** with `npm install`
3. **Make your changes** following the coding standards
4. **Test your changes** thoroughly
5. **Update documentation** if necessary
6. **Ensure the build passes** with `npm run build`

**Pull Request Process:**

1. Create a pull request with a clear title and description
2. Reference any related issues in the description
3. Include screenshots for UI changes
4. Ensure all tests pass
5. Request review from maintainers

## Development Setup

### Prerequisites

- Node.js (v16 or higher)
- npm package manager
- Git
- Windows (primary development platform)

### Setting Up Your Development Environment

1. **Fork and clone the repository:**
   ```bash
   git clone https://github.com/YOUR_USERNAME/x360-manager.git
   cd x360-manager
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npm start
   ```

4. **Open another terminal and start Electron:**
   ```bash
   npm run electron
   ```

### Project Structure

```
src/
├── components/          # React components
├── context/            # React context providers
├── App.js             # Main application component
├── App.css            # Application styles
├── index.js           # React entry point
└── index.css          # Global styles
```

### Coding Standards

- **JavaScript**: Use ES6+ features and modern React patterns
- **CSS**: Use CSS custom properties for theming
- **Components**: Keep components focused and reusable
- **Naming**: Use descriptive names for variables and functions
- **Comments**: Add comments for complex logic

### Testing

- Test your changes manually in both development and production builds
- Verify that existing functionality still works
- Test on different screen sizes and resolutions
- Test with different game files and configurations

## Style Guidelines

### Git Commit Messages

- Use the present tense ("Add feature" not "Added feature")
- Use the imperative mood ("Move cursor to..." not "Moves cursor to...")
- Limit the first line to 72 characters or less
- Reference issues and pull requests liberally after the first line

### JavaScript Style Guide

- Use 2 spaces for indentation
- Use semicolons
- Use single quotes for strings
- Use camelCase for variable names
- Use PascalCase for component names

### CSS Style Guide

- Use 2 spaces for indentation
- Use kebab-case for class names
- Group related properties together
- Use CSS custom properties for theme values

## Additional Notes

### Issue and Pull Request Labels

- `bug` - Something isn't working
- `enhancement` - New feature or request
- `documentation` - Improvements or additions to documentation
- `good first issue` - Good for newcomers
- `help wanted` - Extra attention is needed
- `question` - Further information is requested

### Recognition

Contributors will be recognized in the project's README and release notes.

## Questions?

If you have any questions about contributing, feel free to:

- Open an issue with the `question` label
- Email mohmmad.pod@gmail.com
- Check existing issues and discussions

Thank you for contributing to X360 Manager! 🎮