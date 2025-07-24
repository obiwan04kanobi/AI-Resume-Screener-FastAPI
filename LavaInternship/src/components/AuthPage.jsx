// src/components/AuthPage.jsx
import React, { useState, useRef } from 'react';
import axios from 'axios';
import { useNavigate } from 'react-router-dom';

const AuthPage = () => {
    const [isSignUp, setIsSignUp] = useState(false);
    const [step, setStep] = useState('form'); // 'form' or 'verify'
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const formDataRef = useRef({});

    const handleInitialSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        const form = event.target;
        const data = Object.fromEntries(new FormData(form).entries());
        formDataRef.current = data;

        try {
            await axios.post('http://localhost:8000/auth/send-verification-code', {
                email: data.email,
                password: data.password,
                full_name: data.full_name
            });
            setStep('verify');
        } catch (err) {
            setError(err.response?.data?.detail || 'Could not send verification code.');
        } finally {
            setLoading(false);
        }
    };

    const handleVerificationSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        const form = event.target;
        const data = Object.fromEntries(new FormData(form).entries());

        try {
            const response = await axios.post('http://localhost:8000/auth/signup', {
                ...formDataRef.current,
                code: data.code,
            });
            localStorage.setItem('authToken', response.data.access_token);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err.response?.data?.detail || 'An error occurred during verification.');
        } finally {
            setLoading(false);
        }
    };

    const handleLoginSubmit = async (event) => {
        event.preventDefault();
        setLoading(true);
        setError('');

        try {
            const response = await axios.post('http://localhost:8000/auth/token', new FormData(event.target));
            localStorage.setItem('authToken', response.data.access_token);
            navigate('/dashboard', { replace: true });
        } catch (err) {
            setError(err.response?.data?.detail || 'Login failed.');
        } finally {
            setLoading(false);
        }
    };

    // --- FIX: Replaced 'resetFlow' with a proper toggle function ---
    const toggleAuthMode = () => {
        setIsSignUp(prevIsSignUp => !prevIsSignUp); // Correctly toggles the state
        setStep('form');
        setError('');
        formDataRef.current = {};
    };

    return (
        // --- FIX: Updated background to match the app theme ---
        <div className="min-h-screen flex items-center justify-center p-4">

            {/* --- FIX: Applied the same card styling as the Home page --- */}
            <div className="bg-white border-2 border-[#264143] rounded-2xl shadow-[3px_4px_0px_1px_#E99F4C] p-10 max-w-xl w-full text-center">

                {/* Login Form */}
                {!isSignUp && (
                    <>
                        <h2 className="text-3xl font-extrabold text-[#264143] mb-2">HR Portal Login</h2>
                        <p className="text-lg text-[#DE5499] mb-8 font-semibold">Sign in to access the dashboard</p>

                        <form onSubmit={handleLoginSubmit} className="space-y-6 text-left">
                            <div>
                                <label className="text-sm font-semibold text-gray-700 block mb-2">Email Address</label>
                                <input name="username" type="email" required className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#264143]" />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700 block mb-2">Password</label>
                                <input name="password" type="password" required className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#264143]" />
                            </div>
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            <button type="submit" disabled={loading} className="w-full p-3 bg-[#DE5499] rounded-lg text-white font-bold hover:opacity-90 transition-colors disabled:bg-gray-400">
                                {loading ? 'Signing In...' : 'Sign In'}
                            </button>
                        </form>
                    </>
                )}

                {/* Signup Forms */}
                {isSignUp && step === 'form' && (
                    <>
                        <h2 className="text-3xl font-extrabold text-[#264143] mb-2">Create HR Account</h2>
                        <p className="text-lg text-[#DE5499] mb-8 font-semibold">Sign up to manage the hiring pipeline</p>
                        <form onSubmit={handleInitialSubmit} className="space-y-6 text-left">
                            <div>
                                <label className="text-sm font-semibold text-gray-700 block mb-2">Full Name</label>
                                <input name="full_name" type="text" required className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#264143]" />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700 block mb-2">Email Address</label>
                                <input name="email" type="email" required className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#264143]" />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-gray-700 block mb-2">Password</label>
                                <input name="password" type="password" required className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#264143]" />
                            </div>
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            <button type="submit" disabled={loading} className="w-full p-3 bg-[#DE5499] rounded-lg text-white font-bold hover:opacity-90 transition-colors disabled:bg-gray-400">
                                {loading ? 'Sending Code...' : 'Get Verification Code'}
                            </button>
                        </form>
                    </>
                )}

                {isSignUp && step === 'verify' && (
                    <>
                        <h2 className="text-3xl font-extrabold text-[#264143] mb-2">Verify Your Email</h2>
                        <p className="text-lg text-[#DE5499] mb-8 font-semibold">A 6-digit code was sent to {formDataRef.current.email}</p>
                        <form onSubmit={handleVerificationSubmit} className="space-y-6 text-left">
                            <div>
                                <label className="text-sm font-semibold text-gray-700 block mb-2">Verification Code</label>
                                <input name="code" type="text" maxLength="6" required className="w-full p-3 border border-gray-300 rounded-lg text-center tracking-[1em] focus:outline-none focus:ring-2 focus:ring-[#264143]" />
                            </div>
                            {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                            <button type="submit" disabled={loading} className="w-full p-3 bg-[#DE5499] rounded-lg text-white font-bold hover:opacity-90 transition-colors disabled:bg-gray-400">
                                {loading ? 'Verifying...' : 'Verify & Create Account'}
                            </button>
                        </form>
                    </>
                )}

                <div className="text-center mt-8">
                    <button onClick={toggleAuthMode} className="text-sm text-[#264143] font-semibold hover:underline">
                        {isSignUp ? 'Already have an account? Sign In' : "Don't have an account? Create one"}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AuthPage;