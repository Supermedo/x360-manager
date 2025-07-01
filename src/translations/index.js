// Simple translation system
const translations = {
  en: {
    // Navigation
    dashboard: 'Dashboard',
    library: 'Game Library',
    setup: 'Emulator Setup',
    settings: 'Settings',
    
    // Dashboard
    welcome: 'Welcome to X360 Manager',
    recentGames: 'Recent Games',
    quickActions: 'Quick Actions',
    scanGames: 'Scan for Games',
    addGame: 'Add Game',
    
    // Settings
    general: 'General',
    interface: 'Interface',
    advanced: 'Advanced',
    theme: 'Theme',
    language: 'Language',
    dark: 'Dark',
    light: 'Light',
    auto: 'Auto',
    
    // Common
    save: 'Save Settings',
    cancel: 'Cancel',
    browse: 'Browse',
    reset: 'Reset to Defaults'
  },
  
  ar: {
    // Navigation
    dashboard: 'لوحة التحكم',
    library: 'مكتبة الألعاب',
    setup: 'إعداد المحاكي',
    settings: 'الإعدادات',
    
    // Dashboard
    welcome: 'مرحباً بك في X360 Manager',
    recentGames: 'الألعاب الحديثة',
    quickActions: 'الإجراءات السريعة',
    scanGames: 'البحث عن الألعاب',
    addGame: 'إضافة لعبة',
    
    // Settings
    general: 'عام',
    interface: 'الواجهة',
    advanced: 'متقدم',
    theme: 'المظهر',
    language: 'اللغة',
    dark: 'داكن',
    light: 'فاتح',
    auto: 'تلقائي',
    
    // Common
    save: 'حفظ الإعدادات',
    cancel: 'إلغاء',
    browse: 'تصفح',
    reset: 'إعادة تعيين الافتراضي'
  },
  
  es: {
    // Navigation
    dashboard: 'Panel de Control',
    library: 'Biblioteca de Juegos',
    setup: 'Configuración del Emulador',
    settings: 'Configuración',
    
    // Dashboard
    welcome: 'Bienvenido a X360 Manager',
    recentGames: 'Juegos Recientes',
    quickActions: 'Acciones Rápidas',
    scanGames: 'Buscar Juegos',
    addGame: 'Agregar Juego',
    
    // Settings
    general: 'General',
    interface: 'Interfaz',
    advanced: 'Avanzado',
    theme: 'Tema',
    language: 'Idioma',
    dark: 'Oscuro',
    light: 'Claro',
    auto: 'Automático',
    
    // Common
    save: 'Guardar Configuración',
    cancel: 'Cancelar',
    browse: 'Explorar',
    reset: 'Restablecer Predeterminados'
  },
  
  fr: {
    // Navigation
    dashboard: 'Tableau de Bord',
    library: 'Bibliothèque de Jeux',
    setup: 'Configuration de l\'Émulateur',
    settings: 'Paramètres',
    
    // Dashboard
    welcome: 'Bienvenue dans X360 Manager',
    recentGames: 'Jeux Récents',
    quickActions: 'Actions Rapides',
    scanGames: 'Rechercher des Jeux',
    addGame: 'Ajouter un Jeu',
    
    // Settings
    general: 'Général',
    interface: 'Interface',
    advanced: 'Avancé',
    theme: 'Thème',
    language: 'Langue',
    dark: 'Sombre',
    light: 'Clair',
    auto: 'Automatique',
    
    // Common
    save: 'Enregistrer les Paramètres',
    cancel: 'Annuler',
    browse: 'Parcourir',
    reset: 'Réinitialiser par Défaut'
  },
  
  de: {
    // Navigation
    dashboard: 'Dashboard',
    library: 'Spielebibliothek',
    setup: 'Emulator-Setup',
    settings: 'Einstellungen',
    
    // Dashboard
    welcome: 'Willkommen bei X360 Manager',
    recentGames: 'Aktuelle Spiele',
    quickActions: 'Schnellaktionen',
    scanGames: 'Nach Spielen suchen',
    addGame: 'Spiel hinzufügen',
    
    // Settings
    general: 'Allgemein',
    interface: 'Benutzeroberfläche',
    advanced: 'Erweitert',
    theme: 'Design',
    language: 'Sprache',
    dark: 'Dunkel',
    light: 'Hell',
    auto: 'Automatisch',
    
    // Common
    save: 'Einstellungen Speichern',
    cancel: 'Abbrechen',
    browse: 'Durchsuchen',
    reset: 'Auf Standard Zurücksetzen'
  },
  
  ja: {
    // Navigation
    dashboard: 'ダッシュボード',
    library: 'ゲームライブラリ',
    setup: 'エミュレーター設定',
    settings: '設定',
    
    // Dashboard
    welcome: 'X360 Managerへようこそ',
    recentGames: '最近のゲーム',
    quickActions: 'クイックアクション',
    scanGames: 'ゲームをスキャン',
    addGame: 'ゲームを追加',
    
    // Settings
    general: '一般',
    interface: 'インターフェース',
    advanced: '詳細',
    theme: 'テーマ',
    language: '言語',
    dark: 'ダーク',
    light: 'ライト',
    auto: '自動',
    
    // Common
    save: '設定を保存',
    cancel: 'キャンセル',
    browse: '参照',
    reset: 'デフォルトにリセット'
  }
};

export const getTranslation = (language, key) => {
  return translations[language]?.[key] || translations.en[key] || key;
};

export const getCurrentLanguage = () => {
  // This will be connected to the settings context
  return 'en';
};

export default translations;