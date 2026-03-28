import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import NotificationsPanel from '../shared/NotificationsPanel'
import UploadManager from '../shared/UploadManager'
import AutoUpdater from '../shared/AutoUpdater'

export default function MainLayout() {
  return (
    <>
      <div className="titlebar-drag" />
      <div className="app-layout">
        <Sidebar />
        <main className="main-content">
          <Outlet />
        </main>
        <NotificationsPanel />
        <UploadManager />
        <AutoUpdater />
      </div>
    </>
  )
}
