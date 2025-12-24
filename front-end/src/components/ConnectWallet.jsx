import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

export function ConnectWallet() {
    const { address, isConnected } = useAccount()
    const { connectors, connect, error, isPending } = useConnect()
    const { disconnect } = useDisconnect()
    const navigate = useNavigate()
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    useEffect(() => {
        if (isConnected) {
            setShowSuccessModal(true)
            const timer = setTimeout(() => {
                navigate('/play')
            }, 2000) // Redirect after 2 seconds
            return () => clearTimeout(timer)
        }
    }, [isConnected, navigate])

    return (
        <div className="flex flex-col items-center justify-center h-screen bg-gray-900 text-white relative">
            <div className="p-8 bg-gray-800 rounded-lg shadow-lg text-center flex flex-col items-center">
                <h1 className="text-4xl font-bold mb-8 text-yellow-500">The Oligarchy</h1>
                <h2 className="text-xl mb-6">Connect Wallet to Play</h2>

                {connectors.map((connector) => (
                    <button
                        key={connector.uid}
                        onClick={() => connect({ connector })}
                        disabled={isPending}
                        className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition flex items-center gap-2"
                    >
                        {isPending ? 'Connecting...' : `Connect ${connector.name}`}
                    </button>
                ))}

                {error && <div className="mt-4 text-red-500">{error.message}</div>}
            </div>

            {/* Success Modal */}
            {showSuccessModal && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/70 backdrop-blur-sm z-50">
                    <div className="bg-green-600 p-8 rounded-xl shadow-2xl text-center animate-bounce-in">
                        <h2 className="text-3xl font-bold text-white mb-2">Success!</h2>
                        <p className="text-white text-lg">Connecting Successfully</p>
                    </div>
                </div>
            )}
        </div>
    )
}
