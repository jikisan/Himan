import { useState } from 'react';
import { Moon, Sun, Monitor, ChevronDown } from 'lucide-react';
import { useTheme } from '@core/presentation/contexts/ThemeProvider';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui';

export const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);

  const getThemeIcon = () => {
    switch (theme) {
      case 'light':
        return <Sun className="h-5 w-5" />;
      case 'dark':
        return <Moon className="h-5 w-5" />;
      case 'system':
        return <Monitor className="h-5 w-5" />;
    }
  };

  const getThemeLabel = () => {
    switch (theme) {
      case 'light':
        return 'Light';
      case 'dark':
        return 'Dark';
      case 'system':
        return 'System';
    }
  };

  const handleThemeSelect = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setIsDropdownOpen(false);
  };

  return (
    <div className="container mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6">
        Settings
      </h1>

      <div className="space-y-6">
        {/* Appearance Settings */}
        <Card>
          <CardHeader>
            <CardTitle>Appearance</CardTitle>
            <CardDescription>
              Customize how Himan looks on your device
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-gray-900 dark:text-white">Theme</p>
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Select your preferred theme mode
                  </p>
                </div>

                {/* Theme Dropdown Button */}
                <div className="relative">
                  <button
                    onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors min-w-[140px] justify-between"
                  >
                    <div className="flex items-center gap-2">
                      {getThemeIcon()}
                      <span className="text-sm font-medium">{getThemeLabel()}</span>
                    </div>
                    <ChevronDown
                      className={`h-4 w-4 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`}
                    />
                  </button>

                  {/* Dropdown Menu */}
                  {isDropdownOpen && (
                    <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-gray-800 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-10">
                      <button
                        onClick={() => handleThemeSelect('light')}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                          theme === 'light' ? 'bg-gray-100 dark:bg-gray-700' : ''
                        }`}
                      >
                        <Sun className="h-4 w-4" />
                        <span>Light</span>
                      </button>
                      <button
                        onClick={() => handleThemeSelect('dark')}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                          theme === 'dark' ? 'bg-gray-100 dark:bg-gray-700' : ''
                        }`}
                      >
                        <Moon className="h-4 w-4" />
                        <span>Dark</span>
                      </button>
                      <button
                        onClick={() => handleThemeSelect('system')}
                        className={`w-full px-4 py-2 text-left text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors flex items-center gap-2 ${
                          theme === 'system' ? 'bg-gray-100 dark:bg-gray-700' : ''
                        }`}
                      >
                        <Monitor className="h-4 w-4" />
                        <span>System</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
