import React, { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import { Lock, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function Login() {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const { login } = useAuth();

    const handleSubmit = async (e: React.FormEvent) => {
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
        <main className="min-h-[100dvh] flex items-center justify-center bg-background p-4">
            <div className="bg-card w-full max-w-md p-8 rounded-2xl shadow-xl shadow-primary/5 border border-secondary/30">
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald/10 mb-4">
                        <Lock className="w-8 h-8 text-emerald" />
                    </div>
                    <h1 className="text-2xl font-bold text-foreground">Giriş Yap</h1>
                    <p className="text-muted-foreground mt-2">Devam etmek için hesabınıza erişin</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                    <div>
                        <label htmlFor="username" className="block text-sm font-medium text-muted-foreground mb-2">
                            Kullanıcı Adı
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <User className="h-5 w-5 text-secondary" />
                            </div>
                            <Input
                                id="username"
                                type="text"
                                value={username}
                                onChange={(e) => setUsername(e.target.value)}
                                className="pl-10 py-3 rounded-xl"
                                placeholder="kullaniciadi"
                                required
                            />
                        </div>
                    </div>

                    <div>
                        <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-2">
                            Şifre
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Lock className="h-5 w-5 text-secondary" />
                            </div>
                            <Input
                                id="password"
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="pl-10 py-3 rounded-xl"
                                placeholder="••••••"
                                required
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="bg-destructive/10 border border-destructive/20 text-destructive text-sm p-3 rounded-lg text-center">
                            {error}
                        </div>
                    )}

                    <Button
                        type="submit"
                        className="w-full py-3 rounded-xl shadow-lg shadow-primary/20 font-semibold"
                        size="lg"
                    >
                        Giriş Yap
                    </Button>
                </form>
            </div>
        </main>
    );
}
