import { createBrowserRouter } from 'react-router-dom';

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
          {
            element: <ParticipantGuard />,
            children: [
              { path: '/', element: <DashboardPage /> },
              { path: '/scan', element: <ScanPage /> },
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
            element: (
              <div className="py-24 text-center">
                <p className="text-cyan-300">404</p>
                <h1 className="mt-2 text-3xl font-black">Checkpoint not found</h1>
              </div>
            ),
          },
        ],
      },
    ],
  },
]);
