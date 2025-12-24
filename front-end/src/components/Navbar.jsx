import { Link, useLocation } from 'react-router-dom';
import { useAccount, useDisconnect } from 'wagmi';

const NAV_ITEMS = [
    { path: '/farm', label: '🌾 Farm', description: 'Stake mETH' },
    { path: '/politics', label: '🗳️ Politics', description: 'Lock & Vote' },
    { path: '/bribe', label: '💰 Bribes', description: 'Bribe Market' },
    { path: '/war', label: '⚔️ War', description: 'Battle Regions' },
    { path: '/store', label: '🏪 Store', description: 'Buy Items' },
    { path: '/play', label: '🎮 Play', description: 'Enter Game' },
    { path: '/dev', label: '🛠️ Dev', description: 'Testing Tools' },
];

export function Navbar() {
    const { address, isConnected } = useAccount();
    const { disconnect } = useDisconnect();
    const location = useLocation();

    const formatAddress = (addr) => {
        if (!addr) return '';
        return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
    };

    return (
        <nav className="bg-slate-800 border-b border-slate-700 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4">
                <div className="flex items-center justify-between h-16">
                    {/* Logo */}
                    <Link to="/" className="flex items-center gap-2">
                        <span className="text-2xl">🏰</span>
                        <span className="font-bold text-yellow-500 text-lg hidden sm:block">
                            The Oligarchy
                        </span>
                    </Link>

                    {/* Navigation Links */}
                    <div className="flex items-center gap-1 overflow-x-auto">
                        {NAV_ITEMS.map((item) => (
                            <Link
                                key={item.path}
                                to={item.path}
                                className={`px-3 py-2 rounded-lg text-sm font-medium transition whitespace-nowrap ${location.pathname === item.path
                                    ? 'bg-yellow-600 text-black'
                                    : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                                    }`}
                            >
                                {item.label}
                            </Link>
                        ))}
                    </div>

                    {/* Wallet Status */}
                    <div className="flex items-center gap-2">
                        {isConnected ? (
                            <>
                                <span className="text-sm text-slate-400 hidden md:block">
                                    {formatAddress(address)}
                                </span>
                                <button
                                    onClick={() => disconnect()}
                                    className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 rounded-lg text-sm font-medium transition"
                                >
                                    Disconnect
                                </button>
                            </>
                        ) : (
                            <Link
                                to="/"
                                className="px-4 py-1.5 bg-blue-600 hover:bg-blue-500 rounded-lg text-sm font-medium transition"
                            >
                                Connect
                            </Link>
                        )}
                    </div>
                </div>
            </div>
        </nav>
    );
}

export default Navbar;
