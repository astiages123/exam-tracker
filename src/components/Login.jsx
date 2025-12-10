import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Lock, User } from 'lucide-react';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');

        // Pseudo-domain strategy for username-only login
        const email = `${username}@banka.takip`;

        const { error: loginError } = await login(email, password);

        if (loginError) {
            console.error(loginError);
            if (loginError.message === 'Invalid login credentials') {
                setError('Kullanıcı adı veya şifre hatalı');
            } else {
                setError('Giriş yapılırken bir hata oluştu');
            }
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-custom-bg p-4">
            <div className="bg-custom-header w-full max-w-md p-8 rounded-2xl shadow-xl shadow-custom-accent/5 border border-custom-category/30">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-custom-accent/10 mb-4">
                        <Lock className="w-8 h-8 text-custom-accent" />
                    </div>
                    <h2 className="text-2xl font-bold text-custom-text">Giriş Yap</h2>
                    <p className="text-custom-title/60 mt-2">Devam etmek için hesabınıza erişin</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-custom-title/80 mb-2">
                            Kullanıcı Adı
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-custom-category" />
                            </div>
                            <input
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-custom-category rounded-xl bg-custom-bg text-custom-text placeholder-custom-category/50 focus:outline-none focus:ring-2 focus:ring-custom-accent/50 focus:border-custom-accent transition-colors"
                                placeholder="kullaniciadi"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-custom-title/80 mb-2">
                            Şifre
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-custom-category" />
                            </div>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="block w-full pl-10 pr-3 py-3 border border-custom-category rounded-xl bg-custom-bg text-custom-text placeholder-custom-category/50 focus:outline-none focus:ring-2 focus:ring-custom-accent/50 focus:border-custom-accent transition-colors"
                                placeholder="••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-custom-error/10 border border-custom-error/20 text-custom-error text-sm p-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <button
                        type="submit"
                        className="w-full flex justify-center py-3 px-4 border border-transparent rounded-xl shadow-lg shadow-custom-accent/20 text-sm font-semibold text-white bg-custom-accent hover:bg-custom-accent/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-custom-accent transition-all transform hover:scale-[1.02] active:scale-[0.98] cursor-pointer"
                    >
                        Giriş Yap
                    </button>
                </form>
            </div>
        </div>
    );
}
