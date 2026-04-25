/**
 * Simple toast notification utility
 * Shows a temporary notification in the bottom-right corner
 */
export function showToast(message: string, type: 'success' | 'error' = 'success', duration = 3000) {
  const toast = document.createElement('div')

  const bgColor = type === 'success' ? 'bg-green-600' : 'bg-red-600'
  toast.className = `fixed bottom-4 right-4 px-4 py-3 ${bgColor} text-white rounded-lg z-50 font-semibold text-sm shadow-lg animate-pulse`
  toast.textContent = message

  document.body.appendChild(toast)

  setTimeout(() => {
    toast.style.opacity = '0'
    toast.style.transition = 'opacity 0.3s ease-out'
    setTimeout(() => toast.remove(), 300)
  }, duration)
}
