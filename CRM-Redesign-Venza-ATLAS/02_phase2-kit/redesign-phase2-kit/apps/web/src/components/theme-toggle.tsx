'use client';

import * as React from 'react';
import { Leaf, Monitor, Moon, PanelsTopLeft, Sun, SunDim } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuLabel, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { ThemePicker } from '@/components/theme-picker';
import { useTheme } from '@/components/theme-provider';
import type { Theme } from '@/lib/theme/themes';

const ICONS: Record<Theme, React.ComponentType<{ className?: string }>> = {
  system: Monitor,
  light: Sun,
  dark: Moon,
  sepia: SunDim,
  atlas: PanelsTopLeft,
  venza: Leaf,
};

/**
 * Topbar-переключатель. Заменяет старый список «Classic (4) + Premium (5) + System».
 * Показывает ровно 6 тем; легаси-пресеты отсутствуют.
 */
export function ThemeToggle() {
  const t = useTranslations('themes');
  const { theme, mounted } = useTheme();
  const [open, setOpen] = React.useState(false);
  const Icon = ICONS[mounted ? theme : 'system'];

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={t('label')}>
          <Icon className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[18rem] p-2">
        <DropdownMenuLabel className="px-1 pb-2 pt-1">{t('label')}</DropdownMenuLabel>
        <ThemePicker compact onPicked={() => setOpen(false)} />
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
