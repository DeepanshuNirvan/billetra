import { useUIStore, type Theme } from '../../store/uiStore';

const themes: { id: Theme; label: string; color: string }[] = [
  { id: 'indigo', label: 'Indigo',  color: '#6366f1' },
  { id: 'ocean',  label: 'Ocean',   color: '#0ea5e9' },
  { id: 'forest', label: 'Forest',  color: '#22c55e' },
  { id: 'amber',  label: 'Amber',   color: '#f59e0b' },
  { id: 'rose',   label: 'Rose',    color: '#f43f5e' },
  { id: 'dark',   label: 'Dark',    color: '#a855f7' },
];

export function ThemeSwitcher() {
  const { theme, setTheme } = useUIStore();

  return (
    <div className="flex items-center gap-1.5" aria-label="Theme switcher">
      {themes.map((t) => (
        <button
          key={t.id}
          title={t.label}
          onClick={() => setTheme(t.id)}
          className={`h-5 w-5 rounded-full border-2 transition-transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-primary-500 ${
            theme === t.id ? 'border-gray-700 scale-110 shadow-md' : 'border-transparent'
          }`}
          style={{ backgroundColor: t.color }}
          aria-pressed={theme === t.id}
        />
      ))}
    </div>
  );
}
