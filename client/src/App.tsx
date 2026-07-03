import { Navigate, Route, Routes } from "react-router-dom";
import { AppLayout } from "./layout/AppLayout";
import { CalendarPage } from "./pages/CalendarPage";
import { Community } from "./pages/Community";
import { Dashboard } from "./pages/Dashboard";
import { Journal } from "./pages/Journal";
import { MacroDesk } from "./pages/MacroDesk";
import { MacroView } from "./pages/MacroView";
import { Psychology } from "./pages/Psychology";
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
        <Route path="/psychology" element={<Psychology />} />
        <Route path="/community" element={<Community />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AppLayout>
  );
}
