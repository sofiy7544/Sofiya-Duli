import type * as React from 'react';
import { LeadsScreen } from './leads';
import { LeadDetailScreen } from './lead-detail';
import { ClientDetailScreen, ClientsScreen } from './clients';
import { PropertiesScreen, PropertyDetailScreen } from './properties';
import { TasksScreen } from './tasks';
import { CalendarScreen } from './calendar';
import { SettingsScreen } from './settings';
import { DealDetailScreen, DealNewScreen, DealsScreen } from './deals';
import { ReportsScreen } from './reports';
import { TeamScreen } from './team';
import { NotesScreen } from './notes';
import { InboxScreen } from './inbox';
import { LostReasonsScreen } from './lost-reasons';
import { BriefingScreen } from './briefing';
import { AutomationScreen, BrandingScreen, IntegrationsScreen, TemplatesScreen, UsersScreen } from './settings-sections';

/** pattern → экран. Порядок: статические раньше динамических. */
export const SCREENS: Record<string, (p: Record<string, string>) => React.ReactNode> = {
  '/leads': () => <LeadsScreen />,
  '/leads/:id': (p) => <LeadDetailScreen id={p.id} />,
  '/clients': () => <ClientsScreen />,
  '/clients/:id': (p) => <ClientDetailScreen id={p.id} />,
  '/properties': () => <PropertiesScreen />,
  '/properties/:id': (p) => <PropertyDetailScreen id={p.id} />,
  '/tasks': () => <TasksScreen />,
  '/calendar': () => <CalendarScreen />,
  '/settings': () => <SettingsScreen />,
  '/deals': () => <DealsScreen />,
  '/deals/new': () => <DealNewScreen />,
  '/deals/:id': (p) => <DealDetailScreen id={p.id} />,
  '/reports': () => <ReportsScreen />,
  '/team': () => <TeamScreen />,
  '/notes': () => <NotesScreen />,
  '/inbox': () => <InboxScreen />,
  '/settings/automation': () => <AutomationScreen />,
  '/settings/templates': () => <TemplatesScreen />,
  '/settings/integrations': () => <IntegrationsScreen />,
  '/settings/branding': () => <BrandingScreen />,
  '/settings/users': () => <UsersScreen />,
  '/insights/lost-reasons': () => <LostReasonsScreen />,
  '/briefing': () => <BriefingScreen />,
};
