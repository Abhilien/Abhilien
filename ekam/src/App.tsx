import { useEffect, useState } from 'react';
import { HashRouter, Navigate, NavLink, Route, Routes, useLocation } from 'react-router-dom';
import { DemoPanel } from './components/DemoPanel';
import { Icon, Logo, type IconName } from './components/Icon';
import { Sheet, Toasts } from './components/ui';
import { useStore } from './state/context';
import { ChatScreen } from './screens/Chat';
import { CloseScreen } from './screens/Close';
import { ConnectionsScreen } from './screens/Connections';
import { DatePlanScreen } from './screens/DatePlan';
import { DiscoverScreen } from './screens/Discover';
import { FeedbackScreen } from './screens/Feedback';
import { HomeScreen } from './screens/Home';
import { InboxScreen } from './screens/Inbox';
import { PremiumScreen } from './screens/Premium';
import { ProfileFeedbackScreen, ProfileScreen } from './screens/Profile';
import { ReportScreen } from './screens/Report';
import { SafetyScreen } from './screens/Safety';
import { WelcomeScreen } from './screens/Welcome';
import { DiscoverySettings, FeedbackSettings, PrivacySettings, ProfileSettings, YouScreen } from './screens/You';

export default function App() {
  return (
    <HashRouter>
      <Stage />
    </HashRouter>
  );
}

function Stage() {
  const [demoOpen, setDemoOpen] = useState(false);
  return (
    <div className="stage">
      <aside className="aside" aria-label="About this prototype">
        <div className="brand">
          <Logo size={30} /> ekam
        </div>
        <h1>
          Meet many.
          <br />
          <em>Choose one.</em>
        </h1>
        <p className="lede">
          A relationship platform built on scarcity of attention. Like as many people as you want — but give your
          full attention to one.
        </p>
        <DemoPanel />
      </aside>
      <main className="device" aria-label="ekam app">
        <AppRoutes onOpenDemo={() => setDemoOpen(true)} />
        <Toasts />
        <Sheet open={demoOpen} onClose={() => setDemoOpen(false)} label="Prototype controls">
          <DemoPanel onDone={() => setDemoOpen(false)} />
        </Sheet>
      </main>
    </div>
  );
}

function AppRoutes({ onOpenDemo }: { onOpenDemo: () => void }) {
  const { state } = useStore();
  const loc = useLocation();
  useEffect(() => {
    document.querySelector('.scroll')?.scrollTo({ top: 0 });
  }, [loc.pathname]);

  if (!state.onboarded && loc.pathname !== '/welcome') return <Navigate to="/welcome" replace />;

  const bare = /^\/(welcome|chat\/|close\/|feedback\/|report\/)/.test(loc.pathname);
  return (
    <>
      <Routes>
        <Route path="/welcome" element={<WelcomeScreen />} />
        <Route path="/" element={<HomeScreen onOpenDemo={onOpenDemo} />} />
        <Route path="/discover" element={<DiscoverScreen />} />
        <Route path="/profile/:id" element={<ProfileScreen />} />
        <Route path="/profile/:id/feedback" element={<ProfileFeedbackScreen />} />
        <Route path="/connections" element={<ConnectionsScreen />} />
        <Route path="/chat/:id" element={<ChatScreen />} />
        <Route path="/chat/:id/plan" element={<DatePlanScreen />} />
        <Route path="/close/:id" element={<CloseScreen />} />
        <Route path="/feedback/:id" element={<FeedbackScreen />} />
        <Route path="/report/:id" element={<ReportScreen />} />
        <Route path="/inbox" element={<InboxScreen />} />
        <Route path="/you" element={<YouScreen onOpenDemo={onOpenDemo} />} />
        <Route path="/you/profile" element={<ProfileSettings />} />
        <Route path="/you/feedback" element={<FeedbackSettings />} />
        <Route path="/you/discovery" element={<DiscoverySettings />} />
        <Route path="/you/privacy" element={<PrivacySettings />} />
        <Route path="/premium" element={<PremiumScreen />} />
        <Route path="/safety" element={<SafetyScreen />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      {!bare && <TabBar />}
    </>
  );
}

function TabBar() {
  const { state } = useStore();
  const unread = state.notices.some((n) => n.for === state.viewerId && !n.read);
  const tabs: { to: string; label: string; icon: IconName; dot?: boolean }[] = [
    { to: '/', label: 'Home', icon: 'home' },
    { to: '/discover', label: 'Discover', icon: 'compass' },
    { to: '/connections', label: 'Connections', icon: 'rings' },
    { to: '/inbox', label: 'Updates', icon: 'bell', dot: unread },
    { to: '/you', label: 'You', icon: 'user' },
  ];
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.to === '/'}>
          <Icon name={t.icon} size={22} />
          {t.label}
          {t.dot && <span className="dot" aria-label="unread" />}
        </NavLink>
      ))}
    </nav>
  );
}
