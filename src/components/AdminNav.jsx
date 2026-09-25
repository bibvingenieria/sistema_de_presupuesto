import { useAuth } from '../hooks/useAuth.jsx'

const AdminNav = () => {
  const { user, signOut } = useAuth()

  const handleSignOut = async () => {
    await signOut()
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <button
        onClick={handleSignOut}
        className="bg-red-600 hover:bg-red-700 text-white w-11 h-11 rounded-full shadow-lg flex items-center justify-center transition-colors"
        title={`Cerrar sesión - ${user?.user_metadata?.full_name || 'Admin'} - ${user?.email}`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
          />
        </svg>
      </button>
    </div>
  )
}

export default AdminNav