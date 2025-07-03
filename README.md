# X360 Manager

> A modern, user-friendly interface for managing Xbox 360 games with the Xenia emulator

![X360 Manager](https://img.shields.io/badge/Platform-Windows-blue)
![License](https://img.shields.io/badge/License-MIT-green)
![Version](https://img.shields.io/badge/Version-1.0.0-orange)

## 📖 About

X360 Manager is a comprehensive game management application built with React and Electron, designed to provide a seamless experience for Xbox 360 game emulation using the Xenia emulator. It features a modern UI, automatic game detection, cover art fetching, and advanced emulator configuration options.

## ✨ Features

### 🎮 Core Functionality
- **Modern Dashboard** - Overview of your game library and emulator status
- **Game Library Management** - Add, organize, and manage your Xbox 360 game collection
- **Advanced Game Configuration** - Customize graphics, audio, and performance settings per game
- **One-Click Game Launch** - Launch games with optimized Xenia configurations
- **Settings Management** - Comprehensive application and emulator preferences
- **Cover Art Fetching** - Automatic game cover downloads with fallback options
- **Recent Games** - Quick access to recently played games with remove functionality

### 🎨 Design Features
- **Dark Gaming Theme** - Eye-friendly dark interface with purple/blue accents
- **Modern UI Components** - Clean card-based layout with smooth animations
- **Responsive Design** - Optimized for desktop use with proper scaling
- **Real-time Updates** - Live status tracking and progress indicators
- **Professional Typography** - Clear hierarchy and readable fonts

### ⚡ Technical Features
- **Electron Framework** - Cross-platform desktop application
- **React Frontend** - Modern, component-based UI architecture
- **Local Storage** - Persistent settings and game library data
- **IPC Communication** - Secure communication between main and renderer processes
- **File System Integration** - Native file/folder selection dialogs
- **Xenia Integration** - Optimized for Xenia emulator with enhanced error handling

## 🚀 Installation

### Option 1: Download Pre-built Release (Recommended)

1. Go to the [Releases](https://github.com/mohammedalbarthouthi/x360-manager/releases) page
2. Download the latest version for your platform
3. Extract and run the executable

### Option 2: Build from Source

#### Prerequisites
- Node.js (v16 or higher)
- npm package manager
- Windows (primary platform)

#### Setup Instructions

1. **Clone the repository**
   ```bash
   git clone https://github.com/mohammedalbarthouthi/x360-manager.git
   cd x360-manager
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm start
   ```

4. **Build for production**
   ```bash
   npm run build
   npm run package
   ```

## Usage Guide

### First Time Setup

1. **Launch the Application**
   - Start X360 Manager from your desktop or start menu
   - You'll be greeted with the modern dashboard interface

2. **Setup Emulator**
   - Navigate to "Setup" from the sidebar
   - Specify your Xenia emulator installation path
   - Configure your games directory path

3. **Add Games**
   - Go to "Library" and click "Add Game"
   - Browse for your Xbox 360 game files (.iso, .xex, etc.)
   - Game covers will be automatically fetched when available

### Managing Games

- **Library Views**: Switch between grid and list views
- **Search & Filter**: Find games quickly by name, genre, or rating
- **Game Configuration**: Set custom graphics, audio, and performance options per game
- **Launch Games**: One-click launch with your preferred settings

### Configuration Options

#### Graphics Settings
- Resolution (720p, 1080p, 1440p, 4K)
- GPU selection and optimization
- VSync and display options
- Performance vs quality presets

#### Audio Settings
- Audio driver selection
- Volume and audio quality settings
- Surround sound configuration

#### Performance Settings
- Frame rate limiting
- CPU and GPU optimization
- Custom Xenia arguments
- Controller configuration

## Project Structure

```
x360-manager/
├── public/                 # Static assets and HTML template
│   ├── index.html         # Main HTML file
│   ├── manifest.json      # Web app manifest
│   └── *.svg             # App icons and logos
├── src/                   # React application source
│   ├── components/        # React components
│   │   ├── Dashboard.js   # Main dashboard view
│   │   ├── GameLibrary.js # Game management interface
│   │   ├── EmulatorSetup.js # Emulator setup wizard
│   │   ├── GameConfig.js  # Game configuration panel
│   │   ├── Settings.js    # Application settings
│   │   ├── Help.js        # Help and about section
│   │   └── Sidebar.js     # Navigation sidebar
│   ├── context/           # React context providers
│   │   └── GameContext.js # Game data management
│   ├── App.js            # Main React application
│   ├── App.css           # Application styles
│   ├── index.js          # React entry point
│   └── index.css         # Global styles
├── electron.js           # Electron main process
├── preload.js           # Electron preload script
├── package.json         # Project dependencies and scripts
└── README.md           # This file
```

## Development

### Available Scripts

- `npm start` - Start React development server
- `npm run electron` - Start Electron in development mode
- `npm run electron-dev` - Start both React and Electron in development
- `npm run electron-build` - Build production Electron app
- `npm run build` - Build React app for production

### Development Tips

1. **Hot Reload**: The development setup supports hot reloading for React components
2. **DevTools**: Press F12 to open Chrome DevTools in development mode
3. **Debugging**: Use console.log() and Chrome DevTools for debugging
4. **File Watching**: Changes to React components will automatically reload the app
5. **Building**: Use `npm run build` followed by `electron-packager` for production builds

## Customization

### Theming
The application uses CSS custom properties for theming. You can modify colors in `src/index.css`:

```css
:root {
  --primary-color: #8b5cf6;    /* Purple accent */
  --secondary-color: #3b82f6;  /* Blue accent */
  --bg-primary: rgba(15, 15, 35, 0.95);
  /* ... other theme variables */
}
```

### Adding Features
1. Create new React components in `src/components/`
2. Add routes in `src/App.js`
3. Extend context providers for state management
4. Add IPC handlers in `electron.js` for system integration

## Troubleshooting

### Common Issues

1. **App won't start**
   - Ensure Node.js v16+ is installed
   - Run `npm install` to install dependencies
   - Check for port conflicts (default: 3000)

2. **Xenia emulator not found**
   - Verify Xenia emulator path in Setup
   - Download Xenia from official sources
   - Ensure emulator executable has proper permissions
   - Check that Xenia is compatible with your system

3. **Games not launching**
   - Verify game file paths are correct
   - Check Xenia emulator configuration
   - Ensure game files are compatible Xbox 360 formats
   - Review game-specific settings

4. **Performance issues**
   - Adjust graphics settings in Game Configuration
   - Close unnecessary background applications
   - Update graphics drivers
   - Check Xenia emulator compatibility

### Getting Help

If you encounter issues:
1. Check the console for error messages (F12 in development)
2. Verify all file paths are correct
3. Ensure you have the latest version of the Xenia emulator
4. Check system requirements and compatibility
5. Visit the [Issues](https://github.com/mohammedalbarthouthi/x360-manager/issues) page to report bugs
6. Contact support at mohmmad.pod@gmail.com

## System Requirements

### Minimum Requirements
- **OS**: Windows 10 (64-bit)
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 500MB for the application, additional space for games
- **Graphics**: DirectX 12 compatible GPU
- **CPU**: Modern multi-core processor (Intel i5/AMD Ryzen 5 or better)

### Recommended Requirements
- **OS**: Windows 11 (64-bit)
- **RAM**: 16GB or more
- **Storage**: SSD with 50GB+ free space for games
- **Graphics**: Dedicated GPU with 4GB+ VRAM (NVIDIA GTX 1060/AMD RX 580 or better)
- **CPU**: High-performance processor (Intel i7/AMD Ryzen 7 or better)

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

**Important**: This application is for managing legally owned Xbox 360 games with the Xenia emulator. Please ensure you have the legal right to use any emulator and game files.

## Photos 
![image](https://github.com/user-attachments/assets/e31d7e59-1886-44d2-a60c-76f78508262c)
![image](https://github.com/user-attachments/assets/5067523e-721b-4b04-97c0-3be5f86042a8)
![image](https://github.com/user-attachments/assets/350e165d-36ff-4824-94fc-8c0557bdc388)
![image](https://github.com/user-attachments/assets/8d47ccfb-2998-48c6-8644-aa99576539e8)


## 🤝 Contributing

Contributions are welcome! If you'd like to contribute:

1. Fork the project
2. Create a feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📞 Contact & Support

- **Developer**: Mohammed Albarghouthi
- **Email**: mohmmad.pod@gmail.com
- **GitHub**: [@mohammedalbarthouthi](https://github.com/mohammedalbarthouthi)
- **Ko-fi**: [Support the project](https://ko-fi.com/mohammedalbarthouthi)

## 🙏 Acknowledgments

- [Xenia Team](https://xenia.jp/) for the amazing Xbox 360 emulator
- [Electron](https://electronjs.org/) for the cross-platform framework
- [React](https://reactjs.org/) for the UI framework
- [Lucide React](https://lucide.dev/) for the beautiful icons

---

**Enjoy your Xbox 360 gaming experience with X360 Manager!** 🎮✨
