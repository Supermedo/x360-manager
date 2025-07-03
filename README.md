# 🎮 X360 Manager

> **The Ultimate Xbox 360 Game Manager with Xenia Integration**  
> A modern, feature-rich desktop application for managing your Xbox 360 game collection with seamless Xenia emulator integration.

<div align="center">

![X360 Manager](https://img.shields.io/badge/Platform-Windows-0078d4?style=for-the-badge&logo=windows)
![License](https://img.shields.io/badge/License-MIT-00d084?style=for-the-badge)
![Version](https://img.shields.io/badge/Version-1.0.0-ff6b35?style=for-the-badge)
![Downloads](https://img.shields.io/badge/Downloads-Ready-success?style=for-the-badge)

</div>

## 🌟 About X360 Manager

X360 Manager is a **comprehensive game management solution** built with modern web technologies (React + Electron) that transforms your Xbox 360 gaming experience. Designed specifically for the Xenia emulator, it provides an intuitive interface for organizing, configuring, and launching your game collection with professional-grade features.

### 🎯 Why Choose X360 Manager?

- **🚀 One-Click Gaming** - Launch games instantly with optimized configurations
- **🎨 Beautiful Interface** - Modern dark theme with smooth animations
- **⚙️ Advanced Configuration** - Per-game settings for graphics, audio, and performance
- **📚 Smart Library** - Automatic cover art, metadata, and organization
- **🔧 Xenia Integration** - Native support with enhanced error handling
- **💾 Portable & Setup** - Available in both portable and installer formats

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

## 📦 Download & Installation

### 🎯 Quick Start (Recommended)

**Two distribution options available:**

#### 🚀 **Setup Package** - Full Installation
```
📁 X360 Manager-Setup-1.0.0.zip (~185 MB)
```
- **Best for most users**
- Automatic installation with `install.bat`
- Creates desktop shortcuts and Start menu entries
- Includes uninstaller
- Professional installation experience

**Installation Steps:**
1. Download `X360 Manager-Setup-1.0.0.zip`
2. Extract the ZIP file
3. Run `install.bat` as Administrator
4. Launch from Start Menu or Desktop shortcut

#### 💼 **Portable Package** - No Installation Required
```
📁 X360 Manager-Portable-1.0.0.zip (~185 MB)
```
- **Perfect for portable use**
- No installation required
- Run from any location (USB drive, external storage)
- Zero system footprint

**Usage Steps:**
1. Download `X360 Manager-Portable-1.0.0.zip`
2. Extract to desired location (e.g., `C:\Games\X360Manager`)
3. Run `X360 Manager.exe`
4. Ready to use!

### 🛠️ Build from Source (Advanced Users)

#### Prerequisites
- **Node.js** (v16 or higher) - [Download](https://nodejs.org/)
- **npm** package manager (included with Node.js)
- **Windows 10/11** (64-bit) - Primary platform
- **PowerShell** - For build scripts

#### 🔧 Development Setup

1. **Clone the repository**
   ```bash
   git clone https://github.com/Supermedo/x360-manager.git
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
   *Opens at http://localhost:3000 with hot reload*

#### 🏗️ Production Build System

X360 Manager uses a **custom PowerShell-based build system** that bypasses electron-builder signing issues:

```powershell
# Build React application
npm run build

# Create portable Electron package
.\create-portable-build.ps1

# Generate compressed distribution packages
.\create-compressed-setup.ps1
```

**Build Outputs:**
- `dist-setup/X360 Manager-Portable-1.0.0.zip` - Portable package
- `dist-setup/X360 Manager-Setup-1.0.0.zip` - Setup package with installer

#### 📋 Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start React development server |
| `npm run build` | Build React app for production |
| `npm run electron` | Start Electron in development |
| `npm run electron-dev` | Start both React and Electron |
| `npm test` | Run test suite |

> **Note:** The custom build system ensures maximum compatibility and bypasses code signing requirements for easier distribution.

## 🎮 Usage Guide

### 🚀 First Time Setup

#### 1. **Launch X360 Manager**
```
🖥️ Desktop Shortcut → X360 Manager
📋 Start Menu → X360 Manager
📁 Portable → X360 Manager.exe
```
You'll be welcomed by the **modern dashboard interface** with a beautiful dark gaming theme.

#### 2. **Configure Xenia Emulator**
- Navigate to **"Setup"** from the sidebar
- **Browse** for your Xenia emulator installation path
- **Set** your games directory path
- **Verify** emulator compatibility

#### 3. **Build Your Game Library**
- Go to **"Library"** → **"Add Game"**
- **Browse** for Xbox 360 game files:
  - `.iso` - Disc images
  - `.xex` - Executable files
  - `.xcp` - Xbox Content Package
- **Automatic cover art** fetching with fallback options
- **Metadata detection** for game information

### 📚 Library Management

#### 🎯 **Smart Organization**
- **Grid/List Views** - Switch between visual layouts
- **Search & Filter** - Find games by name, genre, rating
- **Recent Games** - Quick access to recently played titles
- **Favorites** - Mark and organize your favorite games
- **Categories** - Auto-organize by genre, rating, or custom tags

#### ⚙️ **Per-Game Configuration**

**🎨 Graphics Settings**
- **Resolution**: 720p, 1080p, 1440p, 4K, Custom
- **GPU Selection**: Automatic or manual GPU assignment
- **VSync**: On/Off/Adaptive
- **Quality Presets**: Performance, Balanced, Quality, Ultra
- **Advanced**: Custom render settings and optimizations

**🔊 Audio Settings**
- **Audio Driver**: DirectSound, XAudio2, Automatic
- **Quality**: 44.1kHz, 48kHz, 96kHz
- **Channels**: Stereo, 5.1, 7.1 Surround
- **Volume**: Master and per-game volume control

**⚡ Performance Settings**
- **Frame Rate**: 30fps, 60fps, Unlimited, Custom
- **CPU Optimization**: Thread allocation and priority
- **Memory**: RAM allocation and caching options
- **Custom Arguments**: Advanced Xenia command-line options

#### 🎮 **Controller Support**
- **Xbox Controllers**: Native support (wired/wireless)
- **Generic Controllers**: Automatic mapping
- **Custom Mapping**: Per-game controller configurations
- **Multiple Controllers**: Support for up to 4 players

## 🏗️ Project Architecture

```
x360-manager/
├── 📁 public/                    # Static assets and resources
│   ├── index.html               # Main HTML template
│   ├── manifest.json            # PWA manifest
│   ├── favicon.svg              # App favicon
│   ├── logo192.svg              # App icon (192px)
│   ├── logo512.svg              # App icon (512px)
│   └── app-debug.html           # Debug interface
├── 📁 src/                      # React application source
│   ├── 📁 components/           # React UI components
│   │   ├── Dashboard.js         # 📊 Main dashboard view
│   │   ├── GameLibrary.js       # 📚 Game management interface
│   │   ├── EmulatorSetup.js     # ⚙️ Emulator setup wizard
│   │   ├── GameConfig.js        # 🎮 Game configuration panel
│   │   ├── Settings.js          # ⚙️ Application settings
│   │   ├── Help.js              # ❓ Help and documentation
│   │   └── Sidebar.js           # 🧭 Navigation sidebar
│   ├── 📁 context/              # React context providers
│   │   ├── GameContext.js       # 🎮 Game data management
│   │   └── SettingsContext.js   # ⚙️ Settings management
│   ├── 📁 hooks/                # Custom React hooks
│   │   └── useTranslation.js    # 🌐 Internationalization
│   ├── 📁 translations/         # Language files
│   │   └── index.js             # Translation definitions
│   ├── App.js                   # 🚀 Main React application
│   ├── App.css                  # 🎨 Application styles
│   ├── index.js                 # ⚡ React entry point
│   └── index.css                # 🌍 Global styles
├── 📁 scripts/                  # Build and utility scripts
│   └── create-setup.js          # 📦 Setup creation script
├── electron.js                  # ⚡ Electron main process
├── preload.js                   # 🔒 Electron preload script
├── create-portable-build.ps1    # 🏗️ Portable build script
├── create-compressed-setup.ps1  # 📦 Distribution packaging
├── package.json                 # 📋 Dependencies and scripts
├── BUILD_SETUP.md              # 🔧 Build documentation
├── DISTRIBUTION_GUIDE.md       # 📦 Distribution guide
└── README.md                   # 📖 This documentation
```

### 🔧 **Core Technologies**

| Technology | Purpose | Version |
|------------|---------|----------|
| **React** | Frontend UI Framework | ^18.2.0 |
| **Electron** | Desktop App Framework | ^latest |
| **Node.js** | Runtime Environment | v16+ |
| **PowerShell** | Build System | Windows Built-in |
| **CSS3** | Styling & Animations | Modern Standards |

### 📦 **Build System Files**

- **`create-portable-build.ps1`** - Creates standalone Electron application
- **`create-compressed-setup.ps1`** - Generates distribution packages
- **`scripts/create-setup.js`** - Node.js setup utilities
- **`BUILD_SETUP.md`** - Detailed build documentation
- **`DISTRIBUTION_GUIDE.md`** - Distribution and deployment guide

## 🛠️ Development

### 🚀 **Development Workflow**

#### **Quick Start Development**
```bash
# Install dependencies
npm install

# Start development server (React only)
npm start

# Start full Electron development
npm run electron-dev
```

#### **📋 Available Scripts**

| Command | Description | Use Case |
|---------|-------------|----------|
| `npm start` | React dev server | Frontend development |
| `npm run electron` | Electron only | Testing Electron features |
| `npm run electron-dev` | React + Electron | Full app development |
| `npm run build` | Production React build | Prepare for packaging |
| `npm test` | Run test suite | Quality assurance |

### 🔧 **Development Environment**

#### **🔥 Hot Reload & Live Development**
- **React Hot Reload**: Instant component updates
- **Electron Auto-Restart**: Main process changes trigger restart
- **CSS Live Updates**: Style changes without page refresh
- **State Preservation**: Component state maintained during updates

#### **🐛 Debugging Tools**

**Frontend Debugging:**
- **F12** - Chrome DevTools in Electron
- **React DevTools** - Component inspection
- **Console Logging** - `console.log()` for debugging
- **Network Tab** - API and resource monitoring

**Backend Debugging:**
- **Electron DevTools** - Main process debugging
- **IPC Monitoring** - Inter-process communication
- **File System Access** - Path and permission debugging

#### **🎨 Customization & Theming**

**CSS Custom Properties** (in `src/index.css`):
```css
:root {
  --primary-color: #8b5cf6;      /* Purple accent */
  --secondary-color: #3b82f6;    /* Blue accent */
  --bg-primary: rgba(15, 15, 35, 0.95);
  --bg-secondary: rgba(25, 25, 45, 0.9);
  --text-primary: #ffffff;
  --text-secondary: #a0a0a0;
}
```

**Component Structure:**
- **Modular Components** - Each feature in separate files
- **Context Providers** - Global state management
- **Custom Hooks** - Reusable logic
- **Responsive Design** - Desktop-optimized layouts

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

## 🔧 Troubleshooting

### 🚨 **Common Issues & Solutions**

#### **🚀 Application Issues**

**❌ App Won't Start**
```
✅ Solutions:
• Ensure Node.js v16+ is installed
• Run `npm install` to install dependencies
• Check for port conflicts (default: 3000)
• Verify Windows compatibility (Windows 10/11)
• Run as Administrator if needed
```

**❌ Build Failures**
```
✅ Solutions:
• Clear npm cache: `npm cache clean --force`
• Delete node_modules and reinstall: `rm -rf node_modules && npm install`
• Check PowerShell execution policy
• Ensure sufficient disk space (>2GB)
```

#### **🎮 Emulator Issues**

**❌ Xenia Emulator Not Found**
```
✅ Solutions:
• Download Xenia from official sources: https://xenia.jp/
• Verify emulator path in Setup tab
• Ensure Xenia.exe is in the specified directory
• Check file permissions and antivirus exclusions
```

**❌ Games Not Launching**
```
✅ Solutions:
• Verify game file formats (.iso, .xex, .xcp)
• Check game file paths are correct
• Ensure Xenia emulator is properly configured
• Review per-game settings in Game Configuration
• Check Xenia compatibility list
```

#### **⚡ Performance Issues**

**❌ Slow Performance**
```
✅ Solutions:
• Adjust graphics settings (lower resolution/quality)
• Close unnecessary background applications
• Update graphics drivers to latest version
• Increase RAM allocation in settings
• Use Performance preset in Game Configuration
```

**❌ Audio Problems**
```
✅ Solutions:
• Switch audio driver (DirectSound ↔ XAudio2)
• Check Windows audio settings
• Verify audio device compatibility
• Adjust audio quality settings
```

### 🆘 **Getting Help**

#### **📋 Before Reporting Issues**
1. **Check Console** - Press F12 for error messages
2. **Verify Paths** - Ensure all file paths are correct
3. **Update Software** - Latest Xenia emulator version
4. **System Check** - Meet minimum requirements
5. **Clean Install** - Try fresh installation

#### **📞 Support Channels**
- **🐛 Bug Reports**: [GitHub Issues](https://github.com/Supermedo/x360-manager/issues)
- **📧 Direct Support**: mohmmad.pod@gmail.com
- **📖 Documentation**: Check `TROUBLESHOOTING.md` for detailed guides
- **💬 Community**: GitHub Discussions

#### **📝 When Reporting Issues**
Include the following information:
- **OS Version**: Windows 10/11 build number
- **App Version**: X360 Manager version
- **Error Messages**: Full error text or screenshots
- **Steps to Reproduce**: Detailed reproduction steps
- **System Specs**: CPU, GPU, RAM information

## 💻 System Requirements

### 🎯 **Minimum Requirements**
```
🖥️ Operating System: Windows 10 (64-bit) Build 1903+
🧠 Processor: Intel i5-4590 / AMD Ryzen 5 1400
💾 Memory: 8GB RAM
🎮 Graphics: DirectX 12 compatible GPU
💿 Storage: 1GB for application + game storage
🌐 Network: Internet connection (for cover art)
```

### ⭐ **Recommended Requirements**
```
🖥️ Operating System: Windows 11 (64-bit) Latest
🧠 Processor: Intel i7-8700K / AMD Ryzen 7 2700X
💾 Memory: 16GB+ RAM
🎮 Graphics: NVIDIA GTX 1060 6GB / AMD RX 580 8GB
💿 Storage: SSD with 50GB+ free space
🌐 Network: Broadband internet connection
```

### 🚀 **Optimal Performance**
```
🖥️ Operating System: Windows 11 Pro (64-bit)
🧠 Processor: Intel i9-9900K / AMD Ryzen 9 3900X
💾 Memory: 32GB+ RAM
🎮 Graphics: NVIDIA RTX 3070 / AMD RX 6700 XT
💿 Storage: NVMe SSD with 100GB+ free space
🌐 Network: High-speed broadband
```

### 📋 **Additional Requirements**
- **Xenia Emulator**: Latest version from [xenia.jp](https://xenia.jp/)
- **Visual C++ Redistributable**: 2019 or later
- **DirectX**: DirectX 12 runtime
- **Antivirus**: Exclusions for X360 Manager and Xenia
- **Administrator Rights**: For installation and some features

## 📄 License

This project is licensed under the **MIT License** - see the [LICENSE](LICENSE) file for complete details.

### ⚖️ **Legal Notice**
> **Important**: X360 Manager is designed for managing **legally owned Xbox 360 games** with the Xenia emulator. Users must ensure they have the legal right to use any emulator and game files. This software does not include, distribute, or facilitate piracy of copyrighted content.

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### 🚀 **How to Contribute**

1. **🍴 Fork** the repository
2. **🌿 Create** a feature branch
   ```bash
   git checkout -b feature/amazing-feature
   ```
3. **💻 Make** your changes with clear, descriptive commits
   ```bash
   git commit -m 'Add amazing new feature'
   ```
4. **📤 Push** to your branch
   ```bash
   git push origin feature/amazing-feature
   ```
5. **🔄 Open** a Pull Request with detailed description

### 🎯 **Contribution Areas**
- **🐛 Bug Fixes** - Help resolve issues
- **✨ New Features** - Add functionality
- **📖 Documentation** - Improve guides and docs
- **🎨 UI/UX** - Enhance user experience
- **🔧 Performance** - Optimize code and performance
- **🌐 Translations** - Add language support

### 📋 **Development Guidelines**
- Follow existing code style and conventions
- Add tests for new features
- Update documentation as needed
- Ensure compatibility with Windows 10/11

## 📞 Contact & Support

<div align="center">

### 👨‍💻 **Developer**
**Mohammed Albarghouthi**

[![Email](https://img.shields.io/badge/Email-mohmmad.pod@gmail.com-red?style=for-the-badge&logo=gmail)](mailto:mohmmad.pod@gmail.com)
[![GitHub](https://img.shields.io/badge/GitHub-@Supermedo-black?style=for-the-badge&logo=github)](https://github.com/Supermedo)
[![Ko-fi](https://img.shields.io/badge/Ko--fi-Support%20Project-orange?style=for-the-badge&logo=ko-fi)](https://ko-fi.com/Supermedo)

</div>

### 💬 **Community & Support**
- **🐛 Issues**: [GitHub Issues](https://github.com/Supermedo/x360-manager/issues)
- **💡 Discussions**: [GitHub Discussions](https://github.com/Supermedo/x360-manager/discussions)
- **📧 Direct Contact**: mohmmad.pod@gmail.com
- **📖 Documentation**: Check project wiki and guides

## 🙏 Acknowledgments

### 🌟 **Special Thanks**

- **[Xenia Team](https://xenia.jp/)** - For the incredible Xbox 360 emulator that makes this possible
- **[Electron](https://electronjs.org/)** - Cross-platform desktop framework
- **[React](https://reactjs.org/)** - Modern UI framework
- **[Lucide React](https://lucide.dev/)** - Beautiful icon library
- **[Node.js](https://nodejs.org/)** - JavaScript runtime
- **Community Contributors** - Everyone who helps improve the project

### 🎮 **Gaming Community**
Thanks to the Xbox 360 preservation community and all users who help test and improve X360 Manager.

---

<div align="center">

## 🎮 **Ready to Transform Your Xbox 360 Gaming Experience?**

### [📥 Download X360 Manager](https://github.com/Supermedo/x360-manager/releases) • [📖 Documentation](https://github.com/Supermedo/x360-manager/wiki) • [🐛 Report Issues](https://github.com/Supermedo/x360-manager/issues)

**Enjoy seamless Xbox 360 gaming with X360 Manager!** ✨

*Built with ❤️ for the gaming community*

</div>