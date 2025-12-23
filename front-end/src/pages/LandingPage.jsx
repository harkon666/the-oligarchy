
import { Link } from 'react-router-dom';
import { useAccount, useConnect, useDisconnect } from 'wagmi'
import { useNavigate } from 'react-router-dom'
import { useEffect, useState } from 'react'

const LandingPage = () => {
    const { address, isConnected } = useAccount()
    const { connectors, connect, error, isPending } = useConnect()
    const { disconnect } = useDisconnect()
    const navigate = useNavigate()
    const [showSuccessModal, setShowSuccessModal] = useState(false)

    return (
        <div className="min-h-screen bg-slate-900 flex flex-col items-center justify-center text-white p-4">
            {/* Container Utama dengan efek border glowing */}
            <div className="max-w-3xl w-full bg-slate-800 border-4 border-yellow-600 rounded-lg p-10 text-center shadow-2xl shadow-yellow-900/50">

                <h1 className="text-5xl font-bold text-red-300 mb-4 tracking-widest uppercase drop-shadow-md">
                    🏰 The Oligarchy
                </h1>

                <p className="text-xl text-slate-300 mb-8 font-light">
                    Medieval Political Strategy on <span className="text-teal-400 font-bold">Mantle Network</span>
                </p>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12 text-left">
                    <div className="bg-slate-700 p-4 rounded border border-slate-600 hover:border-yellow-500 transition-colors">
                        <span className="text-2xl block mb-2">⚔️</span>
                        <h3 className="font-bold text-yellow-100">Yield Wars</h3>
                        <p className="text-sm text-slate-400">Earn Real Yield from mETH Staking mechanics.</p>
                    </div>
                    <div className="bg-slate-700 p-4 rounded border border-slate-600 hover:border-yellow-500 transition-colors">
                        <span className="text-2xl block mb-2">🗳️</span>
                        <h3 className="font-bold text-yellow-100">Politics</h3>
                        <p className="text-sm text-slate-400">Bribe, Vote, and Betray your way to the top.</p>
                    </div>
                    <div className="bg-slate-700 p-4 rounded border border-slate-600 hover:border-yellow-500 transition-colors">
                        <span className="text-2xl block mb-2">🗺️</span>
                        <h3 className="font-bold text-yellow-100">Expansion</h3>
                        <p className="text-sm text-slate-400">Conquer regions and enforce your tax laws.</p>
                    </div>
                </div>

                {/* Tombol dengan efek Hover Tailwind */}
                <div className="flex gap-4 flex-col items-center">
                    <Link to="/play">
                        <button className="bg-yellow-600 hover:bg-yellow-500 text-white font-bold py-4 px-8 rounded-full text-xl transition-transform transform hover:scale-105 shadow-lg shadow-yellow-600/50">
                            ENTER THE KINGDOM ➡️
                        </button>
                    </Link>

                    {connectors.map((connector) => (

                        <div>
                            {connector.name}
                            <button
                                key={connector.uid}
                                onClick={() => connect({ connector })}
                                disabled={isPending || isConnected}
                                className="px-6 py-3 bg-blue-600 hover:bg-blue-700 rounded-lg font-semibold transition flex items-center gap-2"
                            >
                                {isPending || isConnected ? 'Connecting' : `Connect ${connector.name} `}
                            </button>
                        </div>
                    ))}
                    {address}
                    <button
                        onClick={() => disconnect()}
                        disabled={!isConnected}
                        className="px-6 py-3 bg-red-600 hover:bg-red-700 rounded-lg font-semibold transition flex items-center gap-2"
                    >
                        Disconnect
                    </button>

                    {error && <div className="mt-4 text-red-500">{error.message}</div>}
                </div>
            </div>
        </div>
    );
};

export default LandingPage;
