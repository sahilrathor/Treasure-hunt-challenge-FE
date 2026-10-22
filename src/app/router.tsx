import { createBrowserRouter, Navigate } from 'react-router-dom';

import { App } from '@/app/App';
import { SessionProvider } from '@/app/providers';
import { AdminPage } from '@/features/admin/AdminPage';
import { AssignmentPage } from '@/features/assignments/AssignmentPage';
import { LoginPage } from '@/features/auth/LoginPage';
import { AdminGuard, ParticipantGuard } from '@/features/auth/RouteGuards';
import { ScanPage } from '@/features/checkpoints/ScanPage';
import { CluePage } from '@/features/clues/CluePage';
import { LeaderboardPage } from '@/features/leaderboard/LeaderboardPage';
import { DashboardPage } from '@/features/progress/DashboardPage';
import { AdminResultsPage } from '@/features/results/AdminResultsPage';

export const router = createBrowserRouter([
  {
    element: <SessionProvider />,
    children: [
      { path: '/login', element: <LoginPage /> },
      {
        element: <App />,
        children: [
          { path: '/scan', element: <ScanPage /> },
          {
            element: <ParticipantGuard />,
            children: [
              { path: '/', element: <DashboardPage /> },
              { path: '/route', element: <DashboardPage /> },
              { path: '/assignments/:id', element: <AssignmentPage /> },
              { path: '/clue', element: <CluePage /> },
            ],
          },
          {
            element: <AdminGuard />,
            children: [
              { path: '/admin', element: <AdminPage /> },
              { path: '/admin/results', element: <AdminResultsPage /> },
              { path: '/leaderboard', element: <LeaderboardPage /> },
            ],
          },
          {
            path: '*',
            element: <Navigate to="/route" replace />,
          },
        ],
      },
    ],
  },
]);
