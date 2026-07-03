import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import { CalendarPage } from "./pages/CalendarPage";
import { Dashboard } from "./pages/Dashboard";
import { Journal } from "./pages/Journal";
import { MacroDesk } from "./pages/MacroDesk";
import { MacroView } from "./pages/MacroView";
import { Placeholder } from "./pages/Placeholder";
import { Reports } from "./pages/Reports";

export default function App() {
  return (
    <AppLayout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/macro-desk" element={<MacroDesk />} />
        <Route path="/macro-view/:id" element={<MacroView />} />
        <Route path="/calendar" element={<CalendarPage />} />
        <Route path="/journal" element={<Journal />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/psychology" element={<Placeholder title="Psychology" note="Emotion tagging lives in the Journal for now — a dedicated psychology view is on the roadmap." />} />
        <Route path="/community" element={<Placeholder title="Community" note="Community voting on new pairs and shared setups — coming soon (stub)." />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
