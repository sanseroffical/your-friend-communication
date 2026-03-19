// GlobalErrorHandler.tsx
import React, { createContext, useContext, useEffect, useState } from 'react';

const ErrorContext = createContext(null);

export const ErrorProvider = ({ children }) => {
    const [error, setError] = useState(null);

    const showError = (message) => {
        setError(message);
        setTimeout(() => setError(null), 3000); // Auto-hide after 3 seconds
    };

    return (
        <ErrorContext.Provider value={{ error, showError }}>
            {children} 
            {error && <div className="error-notification">{error}</div>}
        </ErrorContext.Provider>
    );
};

export const useError = () => {
    return useContext(ErrorContext);
};